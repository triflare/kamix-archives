import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { DATA_DIR, ensureDataDir } from "../data.server"
import { authDriverSummaries } from "./registry.server"
import { hasSessionSecret } from "./session.server"
import type {
  AuthConfig,
  AuthDriverId,
  AuthMethodSummary,
  OidcConfig,
} from "./types"

const AUTH_PATH = join(DATA_DIR, "auth.json")
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD ?? "").trim()

interface StoredOidcSettings {
  issuer: string
  clientId: string
  clientSecret: string | null
  redirectUri: string
  scopes: string
  allowedEmails: string[]
  allowedSubjects: string[]
}

interface StoredSettings {
  methods: AuthDriverId[]
  oidc: StoredOidcSettings
}

interface ReadResult {
  settings: StoredSettings
  errors: string[]
  stored: boolean
}

export interface AuthSettingsView {
  stored: boolean
  passwordAvailable: boolean
  methods: AuthDriverId[]
  oidc: {
    issuer: string
    clientId: string
    redirectUri: string
    scopes: string
    allowedEmails: string[]
    allowedSubjects: string[]
    hasClientSecret: boolean
  }
  errors: string[]
}

export interface SaveAuthSettingsInput {
  methods: string[]
  oidc: {
    issuer: string
    clientId: string
    clientSecret: string
    clearClientSecret: boolean
    redirectUri: string
    scopes: string
    allowedEmails: string
    allowedSubjects: string
  }
}

export type SaveAuthSettingsResult = { ok: true } | { error: string }

function env(name: string) {
  return (process.env[name] ?? "").trim()
}

function splitList(value: string) {
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function emptyOidc(): StoredOidcSettings {
  return {
    issuer: "",
    clientId: "",
    clientSecret: null,
    redirectUri: "",
    scopes: "openid email profile",
    allowedEmails: [],
    allowedSubjects: [],
  }
}

function envSettings(): ReadResult {
  const errors: string[] = []
  const methods: AuthDriverId[] = []
  const requestedMethods = env("AUTH_METHODS")

  if (requestedMethods) {
    for (const name of splitList(requestedMethods)) {
      const driver = name.toLowerCase()
      if (driver !== "password" && driver !== "oidc") {
        errors.push(
          `AUTH_METHODS includes an unknown sign-in method, "${name}".`
        )
        continue
      }
      if (!methods.includes(driver)) methods.push(driver)
    }
  } else {
    if (ADMIN_PASSWORD) methods.push("password")
    if (
      env("OIDC_ISSUER") ||
      env("OIDC_CLIENT_ID") ||
      env("OIDC_CLIENT_SECRET")
    ) {
      methods.push("oidc")
    }
  }

  return {
    settings: {
      methods,
      oidc: {
        issuer: env("OIDC_ISSUER").replace(/\/+$/, ""),
        clientId: env("OIDC_CLIENT_ID"),
        clientSecret: env("OIDC_CLIENT_SECRET") || null,
        redirectUri: env("OIDC_REDIRECT_URI"),
        scopes: env("OIDC_SCOPES") || "openid email profile",
        allowedEmails: splitList(env("OIDC_ALLOWED_EMAILS")).map((email) =>
          email.toLowerCase()
        ),
        allowedSubjects: splitList(env("OIDC_ALLOWED_SUBJECTS")),
      },
    },
    errors,
    stored: false,
  }
}

function readString(value: unknown, label: string, errors: string[]): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    errors.push(`${label} must be a string.`)
    return ""
  }
  return value.trim()
}

function readSecret(value: unknown, errors: string[]): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") {
    errors.push("The OIDC client secret must be a string.")
    return null
  }
  return value.trim() || null
}

function readStringList(
  value: unknown,
  label: string,
  errors: string[]
): string[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  if (typeof value === "string") return splitList(value)
  errors.push(`${label} must be a list of strings.`)
  return []
}

function readMethods(value: unknown, errors: string[]): AuthDriverId[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    errors.push("Saved sign-in methods couldn't be read.")
    return []
  }

  const methods: AuthDriverId[] = []
  for (const entry of value) {
    if (typeof entry !== "string") {
      errors.push("Saved sign-in methods include an invalid entry.")
      continue
    }
    const driver = entry.toLowerCase()
    if (driver !== "password" && driver !== "oidc") {
      errors.push(
        `Saved sign-in settings include an unknown method, "${entry}".`
      )
      continue
    }
    if (!methods.includes(driver)) methods.push(driver)
  }
  return methods
}

function readStoredSettings(): ReadResult {
  if (!existsSync(AUTH_PATH)) return envSettings()

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(AUTH_PATH, "utf8"))
  } catch {
    const fallback = envSettings()
    return {
      ...fallback,
      errors: [
        ...fallback.errors,
        "Saved sign-in settings couldn't be read, so the current server defaults are being used. Save these settings to replace them.",
      ],
      stored: true,
    }
  }

  if (!parsed || typeof parsed !== "object") {
    const fallback = envSettings()
    return {
      ...fallback,
      errors: [
        ...fallback.errors,
        "Saved sign-in settings couldn't be read, so the current server defaults are being used. Save these settings to replace them.",
      ],
      stored: true,
    }
  }

  const errors: string[] = []
  const record = parsed as Record<string, unknown>
  const oidcRecord =
    record.oidc && typeof record.oidc === "object"
      ? (record.oidc as Record<string, unknown>)
      : {}
  if (
    record.oidc !== undefined &&
    (record.oidc === null || typeof record.oidc !== "object")
  ) {
    errors.push("Saved organization sign-in settings couldn't be read.")
  }

  const allowedEmails = readStringList(
    oidcRecord.allowedEmails,
    "The OIDC email allowlist",
    errors
  ).map((email) => email.toLowerCase())
  const allowedSubjects = readStringList(
    oidcRecord.allowedSubjects,
    "The OIDC subject allowlist",
    errors
  )

  return {
    settings: {
      methods: readMethods(record.methods, errors),
      oidc: {
        issuer: readString(
          oidcRecord.issuer,
          "The OIDC issuer",
          errors
        ).replace(/\/+$/, ""),
        clientId: readString(oidcRecord.clientId, "The OIDC client ID", errors),
        clientSecret: readSecret(oidcRecord.clientSecret, errors),
        redirectUri: readString(
          oidcRecord.redirectUri,
          "The OIDC redirect URI",
          errors
        ),
        scopes:
          readString(oidcRecord.scopes, "The OIDC scopes", errors) ||
          "openid email profile",
        allowedEmails,
        allowedSubjects,
      },
    },
    errors,
    stored: true,
  }
}

function validateSettings(
  settings: StoredSettings,
  sourceErrors: string[]
): AuthConfig {
  const errors = [...sourceErrors]
  const methods = settings.methods
  const oidc = settings.oidc

  if (methods.length === 0 && errors.length === 0) {
    errors.push("Choose at least one sign-in method.")
  }
  if (methods.length > 0 && !hasSessionSecret) {
    errors.push("SESSION_SECRET must be set before sign-in can be enabled.")
  }
  if (methods.includes("password") && !ADMIN_PASSWORD) {
    errors.push("Password sign-in needs ADMIN_PASSWORD to be set.")
  }

  if (methods.includes("oidc")) {
    if (!isHttpUrl(oidc.issuer)) {
      errors.push(
        "The OpenID Connect driver needs an http or https issuer URL."
      )
    }
    if (!oidc.clientId) {
      errors.push("The OpenID Connect driver needs a client ID.")
    }
    if (oidc.redirectUri && !isHttpUrl(oidc.redirectUri)) {
      errors.push(
        "The OpenID Connect redirect URI must be an http or https URL."
      )
    }
    if (oidc.allowedEmails.length === 0 && oidc.allowedSubjects.length === 0) {
      errors.push(
        "Add at least one allowed email address or subject for OpenID Connect."
      )
    }
    const scopes = oidc.scopes.split(/\s+/)
    if (!scopes.includes("openid")) {
      errors.push("OIDC scopes must include openid.")
    }
    if (oidc.allowedEmails.length > 0 && !scopes.includes("email")) {
      errors.push(
        "OIDC scopes must include email when an email allowlist is set."
      )
    }
  }

  const configOidc: OidcConfig = {
    issuer: oidc.issuer || null,
    clientId: oidc.clientId || null,
    clientSecret: oidc.clientSecret,
    redirectUri: oidc.redirectUri || null,
    scopes: oidc.scopes,
    allowedEmails: new Set(oidc.allowedEmails),
    allowedSubjects: new Set(oidc.allowedSubjects),
  }

  return {
    methods,
    errors,
    password: ADMIN_PASSWORD,
    oidc: configOidc,
  }
}

export function getAuthConfig(): AuthConfig {
  const { settings, errors } = readStoredSettings()
  return validateSettings(settings, errors)
}

export function isAdminConfigured(config = getAuthConfig()) {
  return config.errors.length === 0 && config.methods.length > 0
}

export function getAuthMethods(config = getAuthConfig()): AuthMethodSummary[] {
  return authDriverSummaries(config)
}

export function getAuthSettings(): AuthSettingsView {
  const result = readStoredSettings()
  const config = validateSettings(result.settings, result.errors)
  const oidc = result.settings.oidc

  return {
    stored: result.stored,
    passwordAvailable: Boolean(ADMIN_PASSWORD),
    methods: result.settings.methods,
    oidc: {
      issuer: oidc.issuer,
      clientId: oidc.clientId,
      redirectUri: oidc.redirectUri,
      scopes: oidc.scopes,
      allowedEmails: oidc.allowedEmails,
      allowedSubjects: oidc.allowedSubjects,
      hasClientSecret: Boolean(oidc.clientSecret),
    },
    errors: config.errors,
  }
}

export function saveAuthSettings(
  input: SaveAuthSettingsInput
): SaveAuthSettingsResult {
  const previous = readStoredSettings().settings
  const errors: string[] = []
  const methods: AuthDriverId[] = []

  for (const entry of input.methods) {
    const driver = entry.toLowerCase()
    if (driver !== "password" && driver !== "oidc") {
      errors.push(`Unknown authentication driver "${entry}".`)
      continue
    }
    if (!methods.includes(driver)) methods.push(driver)
  }

  const oidc: StoredOidcSettings = {
    issuer: input.oidc.issuer.trim().replace(/\/+$/, ""),
    clientId: input.oidc.clientId.trim(),
    clientSecret: input.oidc.clearClientSecret
      ? null
      : input.oidc.clientSecret.trim() || previous.oidc.clientSecret,
    redirectUri: input.oidc.redirectUri.trim(),
    scopes: input.oidc.scopes.trim() || "openid email profile",
    allowedEmails: splitList(input.oidc.allowedEmails).map((email) =>
      email.toLowerCase()
    ),
    allowedSubjects: splitList(input.oidc.allowedSubjects),
  }

  const config = validateSettings({ methods, oidc }, errors)
  if (config.errors.length > 0) {
    return { error: config.errors.join(" ") }
  }

  writeStoredSettings({ methods, oidc })
  return { ok: true }
}

function writeStoredSettings(settings: StoredSettings) {
  ensureDataDir()
  const temporary = `${AUTH_PATH}.${randomUUID()}.tmp`
  writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  renameSync(temporary, AUTH_PATH)
}
