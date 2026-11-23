import {
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router"

import { ChangelogForm } from "~/components/changelog-form"
import { buttonVariants } from "~/components/ui/button"
import { requireAdmin } from "~/lib/admin.server"
import { formatDate } from "~/lib/kernels"
import { getKernel, updateKernelChangelog } from "~/lib/kernels.server"
import { product } from "~/lib/product"
import { pagePath } from "~/lib/site"
import { getSitePageById } from "~/lib/site.server"

import type { Route } from "./+types/admin-changelog"

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData?.kernel
        ? `${loaderData.kernel.version} changelog · ${product.name}`
        : `Changelog · ${product.name}`,
    },
  ]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireAdmin(request)

  const kernel = getKernel(params.id)
  if (!kernel) throw new Response("Not Found", { status: 404 })

  const page = getSitePageById(kernel.pageId)
  const editorHref = `/admin?tab=kernels&page=${kernel.pageId}`

  return {
    kernel,
    pageName: page?.name ?? product.name,
    pageHref: page ? pagePath(page) : "/",
    editorHref,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  await requireAdmin(request)

  const kernel = getKernel(params.id)
  if (!kernel) throw new Response("Not Found", { status: 404 })

  const form = await request.formData()
  const changelog = String(form.get("changelog") ?? "").trim()
  if (changelog.length > 20_000) {
    return { error: "Keep the changelog to 20,000 characters or fewer." }
  }

  if (!updateKernelChangelog(kernel.id, changelog)) {
    return { error: "That release is no longer available." }
  }

  return redirect(`/admin/changelogs/${kernel.id}?saved=1`)
}

export default function AdminChangelog() {
  const { kernel, pageName, pageHref, editorHref } =
    useLoaderData<typeof loader>()
  const actionData = useActionData<{ error: string }>()
  const [searchParams] = useSearchParams()
  const saved = searchParams.get("saved") === "1"
  const isDraft = kernel.publishedAt === null

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to={editorHref}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to administration
      </Link>

      <div className="mt-6 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {kernel.changelog ? "Edit changelog" : "Add changelog"}
          </p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Version {kernel.version}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pageName} ·{" "}
            {kernel.publishedAt
              ? `Published ${formatDate(kernel.publishedAt)}`
              : "Draft"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isDraft
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isDraft ? "Draft" : "Published"}
          </span>
          <a
            href={pageHref}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View page
          </a>
          <a
            href={`/changelogs/${kernel.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {isDraft ? "Preview changelog" : "View changelog"}
          </a>
        </div>
      </div>

      {saved ? (
        <p
          role="status"
          className="mb-6 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
        >
          Changelog saved.
        </p>
      ) : null}

      {actionData?.error ? (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionData.error}
        </p>
      ) : null}

      <ChangelogForm initialValue={kernel.changelog} cancelHref={editorHref} />
    </main>
  )
}
