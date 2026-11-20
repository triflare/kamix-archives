import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as verifySignature,
} from "node:crypto"
import type { JsonWebKey as NodeJsonWebKey } from "node:crypto"

import { clearOidcFlowCookie, oidcFlowCookie } from "../session.server"
import type { AuthConfig, AuthDriver, OidcConfig } from "../types"

const DISCOVERY_TTL_MS = 60 * 60 * 1000
const JWKS_TTL_MS = 5 * 60 * 1000
const CLOCK_SKEW_SECONDS = 60

const SIGNATURE_ALGORITHMS: Record<string, string> = {
  RS256: "RSA-SHA256",
  RS384: "RSA-SHA384",
  RS512: "RSA-SHA512",
  ES256: "sha256",
  ES384: "sha384",
  ES512: "sha512",
}
const ECDSA_COORDINATE_SIZES: Record<string, number> = {
  ES256: 32,
  ES384: 48,
  ES512: 66,
}

interface OidcDiscovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  token_endpoint_auth_methods_supported?: string[]
}

interface Jwk extends NodeJsonWebKey {
  kid?: string
}

interface OidcFlow {
  state: string
  nonce: string
  verifier: string
  redirectUri: string
  returnTo: string
}

type OidcCompletion =
  | { ok: true; returnTo: string; clearCookie: string }
  | { ok: false; error: string; clearCookie: string }

const discoveryCache = new Map<
  string,
  { expiresAt: number; value: OidcDiscovery }
>()
const jwksCache = new Map<string, { expiresAt: number; keys: Jwk[] }>()

function randomValue() {
  return randomBytes(32).toString("base64url")
}

function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) {
    return "/admin"
  }
  return value
}

async function getDiscovery(oidc: OidcConfig) {
  if (!oidc.issuer) throw new Error("No OIDC issuer is configured.")

  const cached = discoveryCache.get(oidc.issuer)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const response = await fetch(
    `${oidc.issuer}/.well-known/openid-configuration`,
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    }
  )
  if (!response.ok) {
    throw new Error(`OIDC discovery returned ${response.status}.`)
  }

  const value = (await response.json()) as Partial<OidcDiscovery>
  if (
    typeof value.issuer !== "string" ||
    typeof value.authorization_endpoint !== "string" ||
    typeof value.token_endpoint !== "string" ||
    typeof value.jwks_uri !== "string"
  ) {
    throw new Error("OIDC discovery is missing required endpoints.")
  }
  if (value.issuer !== oidc.issuer) {
    throw new Error("OIDC discovery issuer does not match the configuration.")
  }

  const discovery: OidcDiscovery = {
    issuer: value.issuer,
    authorization_endpoint: value.authorization_endpoint,
    token_endpoint: value.token_endpoint,
    jwks_uri: value.jwks_uri,
    token_endpoint_auth_methods_supported: Array.isArray(
      value.token_endpoint_auth_methods_supported
    )
      ? value.token_endpoint_auth_methods_supported
      : undefined,
  }
  discoveryCache.set(oidc.issuer, {
    expiresAt: Date.now() + DISCOVERY_TTL_MS,
    value: discovery,
  })
  return discovery
}

async function fetchJwks(uri: string) {
  const response = await fetch(uri, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`OIDC key set returned ${response.status}.`)
  }

  const value = (await response.json()) as { keys?: unknown }
  if (!Array.isArray(value.keys)) {
    throw new Error("OIDC key set is missing its keys.")
  }
  return value.keys as Jwk[]
}

async function getJwks(uri: string, refresh = false) {
  const cached = jwksCache.get(uri)
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached.keys
  }

  const keys = await fetchJwks(uri)
  jwksCache.set(uri, { expiresAt: Date.now() + JWKS_TTL_MS, keys })
  return keys
}

export async function beginOidcSignIn(
  oidc: OidcConfig,
  request: Request,
  returnToValue?: string | null
): Promise<{ redirect: string; flowCookie: string } | { error: string }> {
  try {
    const discovery = await getDiscovery(oidc)
    if (!oidc.clientId) throw new Error("No OIDC client id is configured.")

    const state = randomValue()
    const nonce = randomValue()
    const verifier = randomValue()
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const redirectUri =
      oidc.redirectUri ??
      new URL("/admin/login/callback", request.url).toString()

    const authorizationUrl = new URL(discovery.authorization_endpoint)
    authorizationUrl.searchParams.set("response_type", "code")
    authorizationUrl.searchParams.set("client_id", oidc.clientId)
    authorizationUrl.searchParams.set("redirect_uri", redirectUri)
    authorizationUrl.searchParams.set("scope", oidc.scopes)
    authorizationUrl.searchParams.set("state", state)
    authorizationUrl.searchParams.set("nonce", nonce)
    authorizationUrl.searchParams.set("code_challenge", challenge)
    authorizationUrl.searchParams.set("code_challenge_method", "S256")

    const flow: OidcFlow = {
      state,
      nonce,
      verifier,
      redirectUri,
      returnTo: safeReturnTo(returnToValue),
    }
    const flowCookie = await oidcFlowCookie.serialize(JSON.stringify(flow))
    return { redirect: authorizationUrl.toString(), flowCookie }
  } catch (error) {
    console.warn(
      `OIDC sign-in could not start: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
    return { error: "The identity provider is unavailable. Try again." }
  }
}

export async function completeOidcSignIn(
  oidc: OidcConfig,
  request: Request
): Promise<OidcCompletion> {
  const clearCookie = await clearOidcFlowCookie()

  try {
    const rawFlow = await oidcFlowCookie.parse(request.headers.get("Cookie"))
    const flow = readFlow(rawFlow)
    if (!flow) {
      return { ok: false, error: "state_invalid", clearCookie }
    }

    const url = new URL(request.url)
    if (url.searchParams.get("error")) {
      return { ok: false, error: "provider_error", clearCookie }
    }
    if (url.searchParams.get("state") !== flow.state) {
      return { ok: false, error: "state_invalid", clearCookie }
    }

    const code = url.searchParams.get("code")
    if (!code) {
      return { ok: false, error: "provider_error", clearCookie }
    }

    const discovery = await getDiscovery(oidc)
    const idToken = await exchangeCode(oidc, discovery, code, flow)
    await verifyIdToken(oidc, discovery, idToken, flow.nonce)

    return {
      ok: true,
      returnTo: safeReturnTo(flow.returnTo),
      clearCookie,
    }
  } catch (error) {
    console.warn(
      `OIDC sign-in could not finish: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
    return { ok: false, error: "signin_failed", clearCookie }
  }
}

function readFlow(value: unknown): OidcFlow | null {
  let parsed = value
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== "object") return null
  const flow = parsed as Partial<OidcFlow>
  if (
    typeof flow.state !== "string" ||
    typeof flow.nonce !== "string" ||
    typeof flow.verifier !== "string" ||
    typeof flow.redirectUri !== "string" ||
    typeof flow.returnTo !== "string"
  ) {
    return null
  }
  return {
    state: flow.state,
    nonce: flow.nonce,
    verifier: flow.verifier,
    redirectUri: flow.redirectUri,
    returnTo: flow.returnTo,
  }
}

async function exchangeCode(
  oidc: OidcConfig,
  discovery: OidcDiscovery,
  code: string,
  flow: OidcFlow
) {
  if (!oidc.clientId) throw new Error("No OIDC client id is configured.")

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: flow.redirectUri,
    client_id: oidc.clientId,
    code_verifier: flow.verifier,
  })
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded",
  }

  if (oidc.clientSecret) {
    const methods = discovery.token_endpoint_auth_methods_supported ?? []
    if (
      methods.includes("client_secret_post") &&
      !methods.includes("client_secret_basic")
    ) {
      body.set("client_secret", oidc.clientSecret)
    } else {
      headers.authorization = `Basic ${Buffer.from(
        `${encodeURIComponent(oidc.clientId)}:${encodeURIComponent(
          oidc.clientSecret
        )}`
      ).toString("base64")}`
    }
  }

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  })
  const value = (await response.json().catch(() => null)) as {
    id_token?: unknown
  } | null
  if (!response.ok) {
    throw new Error(`OIDC token endpoint returned ${response.status}.`)
  }
  if (typeof value?.id_token !== "string") {
    throw new Error("OIDC token response did not include an ID token.")
  }
  return value.id_token
}

async function verifyIdToken(
  oidc: OidcConfig,
  discovery: OidcDiscovery,
  token: string,
  expectedNonce: string
) {
  if (!oidc.clientId) throw new Error("No OIDC client id is configured.")

  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("The ID token is malformed.")

  const header = decodeSegment(parts[0])
  const algorithm = header.alg
  if (
    typeof algorithm !== "string" ||
    !Object.hasOwn(SIGNATURE_ALGORITHMS, algorithm)
  ) {
    throw new Error("The ID token uses an unsupported algorithm.")
  }

  const kid = typeof header.kid === "string" ? header.kid : null
  let keys = await getJwks(discovery.jwks_uri)
  let jwk = kid ? keys.find((candidate) => candidate.kid === kid) : keys[0]
  if (!jwk && kid) {
    keys = await getJwks(discovery.jwks_uri, true)
    jwk = keys.find((candidate) => candidate.kid === kid)
  }
  if (!jwk) throw new Error("The ID token signing key was not found.")

  const signature = Buffer.from(parts[2], "base64url")
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`)
  if (!verifyJwtSignature(algorithm, signed, jwk, signature)) {
    throw new Error("The ID token signature is invalid.")
  }

  const claims = decodeSegment(parts[1])
  if (claims.iss !== discovery.issuer) {
    throw new Error("The ID token issuer is invalid.")
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audience.includes(oidc.clientId)) {
    throw new Error("The ID token audience is invalid.")
  }
  if (claims.nonce !== expectedNonce) {
    throw new Error("The ID token nonce is invalid.")
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SECONDS < now) {
    throw new Error("The ID token has expired.")
  }
  if (typeof claims.nbf === "number" && claims.nbf - CLOCK_SKEW_SECONDS > now) {
    throw new Error("The ID token is not valid yet.")
  }
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_SECONDS > now) {
    throw new Error("The ID token was issued in the future.")
  }
  if (typeof claims.sub !== "string" || !claims.sub) {
    throw new Error("The ID token has no subject.")
  }

  const email =
    typeof claims.email === "string" ? claims.email.toLowerCase() : null
  const subjectAllowed = oidc.allowedSubjects.has(claims.sub)
  const emailAllowed = Boolean(
    email && claims.email_verified === true && oidc.allowedEmails.has(email)
  )
  if (!subjectAllowed && !emailAllowed) {
    throw new Error("This account is not allowed to administer the site.")
  }
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(segment, "base64url").toString("utf8")
  ) as Record<string, unknown>
}

function verifyJwtSignature(
  algorithm: string,
  data: Buffer,
  jwk: Jwk,
  signature: Buffer
) {
  const key = createPublicKey({ key: jwk, format: "jwk" })
  const ecdsaSize = ECDSA_COORDINATE_SIZES[algorithm]
  if (ecdsaSize) {
    const der = rawEcdsaToDer(signature, ecdsaSize)
    return Boolean(
      der && verifySignature(SIGNATURE_ALGORITHMS[algorithm], data, key, der)
    )
  }
  return verifySignature(SIGNATURE_ALGORITHMS[algorithm], data, key, signature)
}

function rawEcdsaToDer(raw: Buffer, coordinateSize: number) {
  if (raw.length !== coordinateSize * 2) return null

  const r = derInteger(raw.subarray(0, coordinateSize))
  const s = derInteger(raw.subarray(coordinateSize))
  const body = Buffer.concat([r, s])
  return Buffer.concat([Buffer.from([0x30, body.length]), body])
}

function derInteger(value: Buffer) {
  let start = 0
  while (start < value.length - 1 && value[start] === 0) start += 1
  let body = value.subarray(start)
  if (body[0] & 0x80) body = Buffer.concat([Buffer.from([0]), body])
  return Buffer.concat([Buffer.from([0x02, body.length]), body])
}

export const oidcDriver: AuthDriver = {
  id: "oidc",
  kind: "auth",
  label: "OpenID Connect",
  capabilities: {
    signIn: true,
    register: false,
    link: false,
    mfa: false,
  },
  requirements: {},
  options: [
    {
      key: "issuer",
      label: "Issuer URL",
      type: "url",
      required: true,
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "text",
      required: true,
    },
    {
      key: "clientSecret",
      label: "Client secret",
      type: "secret",
      secret: true,
    },
    {
      key: "redirectUri",
      label: "Redirect URI",
      type: "url",
    },
    {
      key: "allowedEmails",
      label: "Allowed email addresses",
      type: "text",
    },
    {
      key: "allowedSubjects",
      label: "Allowed subjects",
      type: "text",
    },
  ],
  describe: (config: AuthConfig) =>
    config.methods.includes("oidc")
      ? {
          id: "oidc",
          driver: "oidc",
          label: "OpenID Connect",
          capabilities: {
            signIn: true,
            register: false,
            link: false,
            mfa: false,
          },
          requirements: {},
        }
      : null,
}
