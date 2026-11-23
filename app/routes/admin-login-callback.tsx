import { redirect } from "react-router"

import { createAdminCookie, getAuthConfig } from "~/lib/admin.server"
import {
  completeOidcSignIn,
  isOidcIdentityAllowed,
} from "~/lib/auth/drivers/oidc.server"
import { safeAdminReturnTo } from "~/lib/auth/return-to"

import type { Route } from "./+types/admin-login-callback"

export async function loader({ request }: Route.LoaderArgs) {
  const config = getAuthConfig()
  if (!config.methods.includes("oidc")) {
    return redirect("/admin/login?error=signin_failed")
  }

  const result = await completeOidcSignIn(config.oidc, request)
  const headers = new Headers()
  headers.append("Set-Cookie", result.clearCookie)

  if (!result.ok) {
    return redirect(`/admin/login?error=${encodeURIComponent(result.error)}`, {
      headers,
    })
  }

  // The provider exchange can take tens of seconds, so re-read the settings
  // before issuing a session: sign-in may have been disabled or the identity
  // removed from the allowlist while the request was in flight.
  const currentConfig = getAuthConfig()
  if (
    !currentConfig.methods.includes("oidc") ||
    !isOidcIdentityAllowed(currentConfig.oidc, result.identity)
  ) {
    return redirect("/admin/login?error=signin_failed", { headers })
  }

  headers.append("Set-Cookie", await createAdminCookie())
  const next = safeAdminReturnTo(result.returnTo)
  return redirect(`/stay-signed-in?next=${encodeURIComponent(next)}`, {
    headers,
  })
}

export default function AdminLoginCallback() {
  return null
}
