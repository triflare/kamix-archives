import { Link, useLoaderData } from "react-router"

import { Markdown } from "~/components/markdown"
import { isAdmin } from "~/lib/admin.server"
import { formatDate } from "~/lib/kernels"
import { getKernel } from "~/lib/kernels.server"
import { product } from "~/lib/product"
import { pagePath } from "~/lib/site"
import { getSiteContent } from "~/lib/site.server"

import type { Route } from "./+types/changelog"

export async function loader({ params, request }: Route.LoaderArgs) {
  const kernel = getKernel(params.id)
  if (!kernel) throw new Response("Not Found", { status: 404 })

  const isDraft = kernel.publishedAt === null
  if (isDraft && !(await isAdmin(request))) {
    throw new Response("Not Found", { status: 404 })
  }

  const page = getSiteContent().pages.find(
    (entry) => entry.id === kernel.pageId
  )

  return {
    kernel,
    isDraft,
    pageName: page?.name ?? product.name,
    pageHref: page ? pagePath(page) : "/",
  }
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.kernel) return [{ title: product.name }]
  return [
    {
      title: `${loaderData.kernel.version} changelog · ${product.name}`,
    },
  ]
}

export default function Changelog() {
  const { kernel, isDraft, pageName, pageHref } = useLoaderData<typeof loader>()

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to={pageHref}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to {pageName}
      </Link>

      <div className="mt-6 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Changelog
          </p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Version {kernel.version}
          </h1>
          <p className="text-sm text-muted-foreground">
            {kernel.publishedAt
              ? `Published ${formatDate(kernel.publishedAt)}`
              : "Draft preview"}
          </p>
        </div>
        {isDraft ? (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Draft preview
          </span>
        ) : null}
      </div>

      <article className="rounded-3xl border bg-card p-6 sm:p-8">
        {kernel.changelog ? (
          <Markdown content={kernel.changelog} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No changelog was added for this version.
          </p>
        )}
      </article>

      {isDraft ? (
        <p className="mt-6 text-sm text-muted-foreground">
          This changelog is for a draft release. Only signed-in administrators
          can see it.{" "}
          <Link
            to={`/admin?tab=kernels&page=${kernel.pageId}`}
            className="text-primary underline underline-offset-4"
          >
            Back to administration
          </Link>
        </p>
      ) : null}
    </main>
  )
}
