import { KeyRoundIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useFetcher, useLoaderData } from "react-router"

import { Button, buttonVariants } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  getAuthSettings,
  requireAdmin,
  saveAuthSettings,
} from "~/lib/admin.server"
import { product } from "~/lib/product"

import type { Route } from "./+types/admin-auth"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const fieldLabelClass = "text-xs font-normal"

const methodLabels: Record<string, string> = {
  password: "Password",
  oidc: "Organization sign-in",
}

export function meta() {
  return [{ title: `Sign-in options · ${product.name}` }]
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request)
  return getAuthSettings()
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request)

  const form = await request.formData()
  return saveAuthSettings({
    methods: form.getAll("methods").map(String),
    oidc: {
      issuer: String(form.get("issuer") ?? ""),
      clientId: String(form.get("clientId") ?? ""),
      clientSecret: String(form.get("clientSecret") ?? ""),
      clearClientSecret: form.get("clearClientSecret") === "on",
      redirectUri: String(form.get("redirectUri") ?? ""),
      scopes: String(form.get("scopes") ?? ""),
      allowedEmails: String(form.get("allowedEmails") ?? ""),
      allowedSubjects: String(form.get("allowedSubjects") ?? ""),
    },
  })
}

export default function AdminAuth() {
  const settings = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const [open, setOpen] = useState(false)
  const lastResult = useRef<unknown>(null)
  const result = fetcher.data
  const error = result && "error" in result ? result.error : null
  const saved = Boolean(result && "ok" in result)
  const busy = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return
    if (lastResult.current === fetcher.data) return
    lastResult.current = fetcher.data
    if ("ok" in fetcher.data) setOpen(false)
  }, [fetcher.state, fetcher.data])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
              Administration
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign-in options
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Choose how administrators sign in. Changes apply to new sign-ins
              right away.
            </p>
          </div>
          <Link
            to="/admin"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to administration
          </Link>
        </header>

        {saved ? (
          <p
            role="status"
            className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            Sign-in options updated. New sign-ins will use these settings.
          </p>
        ) : null}

        {settings.errors.length > 0 && !error ? (
          <ul
            role="alert"
            className="list-disc space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 pl-8 text-sm text-destructive"
          >
            {settings.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-medium">
              <KeyRoundIcon className="size-4" />
              Sign-in methods
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose how administrators sign in. Changes apply to new sign-ins
              right away and don't interrupt current sessions.
            </p>
          </div>

          <div className="divide-y rounded-lg border">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Current methods</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {settings.methods.length === 0 ? (
                    <span>No methods enabled.</span>
                  ) : (
                    settings.methods.map((method) => (
                      <span key={method}>{methodLabels[method] ?? method}</span>
                    ))
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {settings.errors.length > 0 ? "Needs attention" : "Active"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Change sign-in methods"
                  onClick={() => setOpen(true)}
                >
                  Change methods
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Changes apply to new sign-ins. Current sessions stay signed in.
          </p>
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change sign-in methods</DialogTitle>
            <DialogDescription>
              Choose how administrators sign in. Changes apply right away, and
              current sessions stay signed in.
            </DialogDescription>
          </DialogHeader>

          <fetcher.Form method="post" aria-busy={busy} className="space-y-4">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {settings.errors.length > 0 && !error ? (
              <ul
                role="alert"
                className="list-disc space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 pl-7 text-sm text-destructive"
              >
                {settings.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-col gap-3">
              <div className="rounded-lg border p-3">
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    name="methods"
                    value="password"
                    defaultChecked={settings.methods.includes("password")}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">Password</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {settings.passwordAvailable
                        ? "Administrators sign in with the site password."
                        : "A site password isn't set up yet. Add one before turning this on."}
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-lg border p-3">
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    name="methods"
                    value="oidc"
                    defaultChecked={settings.methods.includes("oidc")}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      Organization sign-in
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      Use your organization's identity provider with OpenID
                      Connect.
                    </span>
                  </span>
                </label>

                <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="issuer" className={fieldLabelClass}>
                      Issuer URL
                    </label>
                    <input
                      id="issuer"
                      name="issuer"
                      type="url"
                      defaultValue={settings.oidc.issuer}
                      placeholder="https://id.example.com"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="clientId" className={fieldLabelClass}>
                      Client ID
                    </label>
                    <input
                      id="clientId"
                      name="clientId"
                      defaultValue={settings.oidc.clientId}
                      placeholder="kamix-archives"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="clientSecret" className={fieldLabelClass}>
                      Client secret
                    </label>
                    <input
                      id="clientSecret"
                      name="clientSecret"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        settings.oidc.hasClientSecret
                          ? "Set — leave blank to keep"
                          : "Not set"
                      }
                      className={inputClass}
                    />
                  </div>

                  {settings.oidc.hasClientSecret ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                      <input
                        type="checkbox"
                        name="clearClientSecret"
                        className="size-4"
                      />
                      Remove saved client secret
                    </label>
                  ) : null}

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="redirectUri" className={fieldLabelClass}>
                      Redirect URI
                    </label>
                    <input
                      id="redirectUri"
                      name="redirectUri"
                      type="url"
                      defaultValue={settings.oidc.redirectUri}
                      placeholder="https://archives.example.com/admin/login/callback"
                      className={inputClass}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the default address for this site.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="scopes" className={fieldLabelClass}>
                      Scopes
                    </label>
                    <input
                      id="scopes"
                      name="scopes"
                      defaultValue={settings.oidc.scopes}
                      placeholder="openid email profile"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="allowedEmails" className={fieldLabelClass}>
                      Allowed email addresses
                    </label>
                    <textarea
                      id="allowedEmails"
                      name="allowedEmails"
                      rows={3}
                      defaultValue={settings.oidc.allowedEmails.join("\n")}
                      placeholder={"admin@example.com\nsecond@example.com"}
                      className={textareaClass}
                    />
                    <p className="text-xs text-muted-foreground">
                      One email address per line. Each address must be verified
                      by your provider.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="allowedSubjects"
                      className={fieldLabelClass}
                    >
                      Allowed subject IDs
                    </label>
                    <textarea
                      id="allowedSubjects"
                      name="allowedSubjects"
                      rows={3}
                      defaultValue={settings.oidc.allowedSubjects.join("\n")}
                      placeholder="provider-subject-id"
                      className={textareaClass}
                    />
                    <p className="text-xs text-muted-foreground">
                      One subject ID per line. Add at least one email address or
                      subject ID.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save sign-in methods"}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
