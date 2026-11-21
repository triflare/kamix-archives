import { useLoaderData } from "react-router"

import { Hero } from "~/components/hero"
import { PageHeader } from "~/components/page-header"
import { ReleaseTable } from "~/components/release-table"
import { SiteBanner } from "~/components/site-banner"
import { isAdmin } from "~/lib/admin.server"
import { listPublishedKernelsForPage } from "~/lib/kernels.server"
import { handlePageTextEdit } from "~/lib/page-edit.server"
import { product } from "~/lib/product"
import { getSiteContent } from "~/lib/site.server"
import type { SitePage } from "~/lib/site"

import type { Route } from "./+types/home"

export function meta({ loaderData }: Route.MetaArgs) {
  const page = loaderData?.page ?? product.pages.home
  return [
    { title: `${page.name} · ${product.name}` },
    { name: "description", content: page.subheading || product.tagline },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const home: SitePage = getSiteContent().pages.find(
    (page) => page.slug === ""
  ) ?? {
    id: "home",
    slug: "",
    name: product.pages.home.name,
    subheading: product.pages.home.subheading,
    hero: product.pages.home.hero,
  }

  return {
    page: home,
    kernels: listPublishedKernelsForPage(home.id),
    canEdit: await isAdmin(request),
  }
}

export async function action({ request }: Route.ActionArgs) {
  return handlePageTextEdit(request)
}

export default function Home() {
  const { page, kernels, canEdit } = useLoaderData<typeof loader>()
  const hero = page.hero

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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

      <section
        className={hero ? "mt-10" : "mt-8"}
        aria-labelledby="releases-heading"
      >
        <div className="mb-4 space-y-1">
          <h2
            id="releases-heading"
            className="font-heading text-2xl tracking-tight"
          >
            Releases
          </h2>
          <p className="text-sm text-muted-foreground">
            Download published releases for this page.
          </p>
        </div>
        <ReleaseTable kernels={kernels} />
      </section>
    </main>
  )
}
