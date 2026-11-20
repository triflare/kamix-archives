import {
  createCookie,
  createCookieSessionStorage,
  redirect,
} from "react-router"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ""
const SESSION_SECRET = process.env.SESSION_SECRET || ADMIN_PASSWORD

export const hasSessionSecret = SESSION_SECRET.length > 0
const signingSecret = SESSION_SECRET || "kamix-auth-unconfigured"

export const secureCookies =
  process.env.NODE_ENV === "production" &&
  process.env.ADMIN_COOKIE_SECURE !== "false"

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30

const storage = createCookieSessionStorage({
  cookie: {
    name: "kamix_admin",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [signingSecret],
    secure: secureCookies,
  },
})

export const oidcFlowCookie = createCookie("kamix_oidc_flow", {
  httpOnly: true,
  path: "/admin/login",
  sameSite: "lax",
  secrets: [signingSecret],
  secure: secureCookies,
  maxAge: 60 * 10,
})

export async function isAdmin(request: Request) {
  if (!hasSessionSecret) return false

  const session = await storage.getSession(request.headers.get("Cookie"))
  return session.get("admin") === true
}

export async function requireAdmin(request: Request) {
  if (!(await isAdmin(request))) throw redirect("/admin/login")
}

export async function createAdminCookie() {
  if (!hasSessionSecret) {
    throw new Error(
      "SESSION_SECRET must be set before creating an admin session."
    )
  }

  const session = await storage.getSession()
  session.set("admin", true)
  return storage.commitSession(session)
}

export async function rememberAdminCookie(request: Request, remember: boolean) {
  const session = await storage.getSession(request.headers.get("Cookie"))
  if (session.get("admin") !== true) {
    throw new Error("An admin session is required to update sign-in duration.")
  }

  return storage.commitSession(
    session,
    remember ? { maxAge: REMEMBER_MAX_AGE } : undefined
  )
}

export async function destroyAdminCookie(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"))
  return storage.destroySession(session)
}

export function clearOidcFlowCookie() {
  return oidcFlowCookie.serialize("", { maxAge: 0 })
}
