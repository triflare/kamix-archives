import { setTimeout as delay } from "node:timers/promises"

import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import { Button } from "~/components/ui/button"
import {
  createAdminCookie,
  getAuthConfig,
  getAuthMethods,
  isAdmin,
} from "~/lib/admin.server"
import { verifyPassword } from "~/lib/auth/drivers/password.server"
import { beginOidcSignIn } from "~/lib/auth/drivers/oidc.server"
import { safeAdminReturnTo } from "~/lib/auth/return-to"
import type { AuthDriverId } from "~/lib/auth/types"
import { product } from "~/lib/product"

import type { Route } from "./+types/admin-login"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const PASSWORD_DELAY_MS = 1000
const MAX_PENDING_PASSWORD_CHECKS = 4
let pendingPasswordChecks = 0

const loginErrors: Record<string, string> = {
  state_invalid: "That sign-in attempt expired. Try again.",
  provider_error: "We couldn't complete sign-in. Try again.",
  signin_failed: "That account isn't approved to manage this site.",
}

export function meta() {
  return [{ title: `Sign in · ${product.name}` }]
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await isAdmin(request)) throw redirect("/admin")

  const config = getAuthConfig()
  const url = new URL(request.url)
  const errorKey = url.searchParams.get("error")
  return {
    configured: config.errors.length === 0 && config.methods.length > 0,
    methods: getAuthMethods(config),
    errors: config.errors,
    returnTo: safeAdminReturnTo(url.searchParams.get("returnTo")),
    loginError: errorKey
      ? (loginErrors[errorKey] ?? "We couldn't sign you in. Try again.")
      : null,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const config = getAuthConfig()
  if (config.errors.length > 0 || config.methods.length === 0) {
    return { error: "Sign-in isn't available yet." }
  }

  const form = await request.formData()
  const method = String(form.get("method") ?? "")
  const returnTo = safeAdminReturnTo(String(form.get("returnTo") ?? ""))

  if (!config.methods.includes(method as AuthDriverId)) {
    return { error: "Choose a sign-in method." }
  }

  if (method === "password") {
    const password = String(form.get("password") ?? "")
    if (pendingPasswordChecks >= MAX_PENDING_PASSWORD_CHECKS) {
      return data(
        { error: "Too many sign-in attempts. Try again in a moment." },
        { status: 429, headers: { "Retry-After": "1" } }
      )
    }

    pendingPasswordChecks += 1
    try {
      await delay(PASSWORD_DELAY_MS)
      if (!verifyPassword(password, config.password)) {
        return { error: "That password doesn't match. Try again." }
      }
    } finally {
      pendingPasswordChecks -= 1
    }

    return redirect(`/stay-signed-in?next=${encodeURIComponent(returnTo)}`, {
      headers: { "Set-Cookie": await createAdminCookie() },
    })
  }

  if (method === "oidc") {
    const result = await beginOidcSignIn(config.oidc, request, returnTo)
    if ("error" in result) {
      return { error: "We couldn't start sign-in. Try again." }
    }

    return redirect(result.redirect, {
      headers: { "Set-Cookie": result.flowCookie },
    })
  }

  return { error: "Choose a sign-in method." }
}

export default function AdminLogin() {
  const { configured, methods, errors, returnTo, loginError } =
    useLoaderData<typeof loader>()
  const actionData = useActionData<{ error: string }>()
  const navigation = useNavigation()
  const error = actionData?.error ?? loginError
  const busy = navigation.state !== "idle"
  const passwordMethod = methods.find((method) => method.id === "password")
  const otherMethods = methods.filter((method) => method.id !== "password")

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {product.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage releases and site settings.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {configured ? (
        <div className="flex flex-col gap-5">
          {passwordMethod ? (
            <Form method="post" className="flex flex-col gap-3">
              <input type="hidden" name="method" value="password" />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </Form>
          ) : null}

          {passwordMethod && otherMethods.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          {otherMethods.map((method) => (
            <Form method="post" key={method.id}>
              <input type="hidden" name="method" value={method.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button
                type="submit"
                variant={passwordMethod ? "outline" : "default"}
                className="w-full"
                disabled={busy}
              >
                {busy
                  ? "Redirecting…"
                  : method.id === "oidc"
                    ? "Continue with organization sign-in"
                    : `Continue with ${method.label}`}
              </Button>
            </Form>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">
            Sign-in isn't available yet.
          </p>
          <p className="mt-1">
            An administrator needs to set up a sign-in method before anyone can
            sign in.
          </p>
          {errors.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Setup details
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Just browsing?{" "}
        <Link to="/" className="text-foreground hover:underline">
          Return to the archive
        </Link>
        .
      </p>
    </main>
  )
}
