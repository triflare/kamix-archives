import { ShieldCheckIcon } from "lucide-react"
import { Form, redirect, useLoaderData, useNavigation } from "react-router"

import { Button } from "~/components/ui/button"
import { isAdmin, rememberAdminCookie } from "~/lib/admin.server"
import { safeAdminReturnTo } from "~/lib/auth/return-to"
import { product } from "~/lib/product"

import type { Route } from "./+types/stay-signed-in"

export function meta() {
  return [{ title: `Stay signed in · ${product.name}` }]
}

export async function loader({ request }: Route.LoaderArgs) {
  const next = safeAdminReturnTo(new URL(request.url).searchParams.get("next"))
  if (!(await isAdmin(request))) {
    throw redirect(`/admin/login?returnTo=${encodeURIComponent(next)}`)
  }

  return { next }
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const next = safeAdminReturnTo(String(form.get("next") ?? ""))
  if (!(await isAdmin(request))) {
    throw redirect(`/admin/login?returnTo=${encodeURIComponent(next)}`)
  }

  const remember = form.get("remember") === "true"
  return redirect(next, {
    headers: { "Set-Cookie": await rememberAdminCookie(request, remember) },
  })
}

export default function StaySignedIn() {
  const { next } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const busy = navigation.state !== "idle"

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex items-center gap-2">
        <img
          src={product.logo}
          alt=""
          aria-hidden="true"
          className="h-8 w-auto"
        />
        <span className="text-sm font-semibold tracking-tight">
          {product.name}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Stay signed in?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose whether this browser should keep you signed in after you close
          the tab.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <ShieldCheckIcon
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">Administrator</p>
          <p className="text-xs text-muted-foreground">
            You're signed in to {product.name}.
          </p>
        </div>
      </div>

      <Form method="post" className="flex flex-col gap-2" aria-busy={busy}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" name="remember" value="true" disabled={busy}>
          Yes, stay signed in
        </Button>
        <Button
          type="submit"
          name="remember"
          value="false"
          variant="outline"
          disabled={busy}
        >
          No, only this tab
        </Button>
      </Form>

      <p className="text-xs text-muted-foreground">
        Staying signed in keeps you signed in after you close this tab. Choose
        no to sign out when this browser closes.
      </p>
    </main>
  )
}
