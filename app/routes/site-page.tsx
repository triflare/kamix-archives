import { useLoaderData } from "react-router"

import { Hero } from "~/components/hero"
import { PageHeader } from "~/components/page-header"
import { ReleaseTable } from "~/components/release-table"
import { SiteBanner } from "~/components/site-banner"
import { isAdmin } from "~/lib/admin.server"
import { listPublishedKernelsForPage } from "~/lib/kernels.server"
import { handlePageTextEdit } from "~/lib/page-edit.server"
import { product } from "~/lib/product"
import { getSitePage } from "~/lib/site.server"

import type { Route } from "./+types/site-page"

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.page) return [{ title: product.name }]
  return [
    { title: `${loaderData.page.name} · ${product.name}` },
    {
      name: "description",
      content: loaderData.page.subheading || product.tagline,
    },
  ]
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const page = getSitePage(params.slug)
  if (!page || page.slug === "") {
    throw new Response("Not Found", { status: 404 })
  }

  return {
    page,
    kernels: listPublishedKernelsForPage(page.id),
    canEdit: await isAdmin(request),
  }
}

export async function action({ request }: Route.ActionArgs) {
  return handlePageTextEdit(request)
}

export default function SitePage() {
  const { page, kernels, canEdit } = useLoaderData<typeof loader>()
  const hero = page.hero

  return (
    <main
      key={page.id}
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
    >
      {page.banner ? (
        <SiteBanner banner={page.banner} pageId={page.id} canEdit={canEdit} />
      ) : null}
      <PageHeader
        name={page.name}
        subheading={page.subheading}
        pageId={page.id}
        canEdit={canEdit}
      />
      {hero ? (
        <Hero
          hero={{
            image: product.pages.home.hero.image,
            heading: hero.heading,
            body: hero.body,
          }}
          pageId={page.id}
          canEdit={canEdit}
        />
      ) : null}
      <div className={hero ? "mt-10" : "mt-8"}>
        <ReleaseTable
          kernels={kernels}
          emptyMessage="No releases have been published for this page yet."
        />
      </div>
    </main>
  )
}
