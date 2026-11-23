import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router"

import { AdminDashboard } from "~/components/admin-dashboard"
import { destroyAdminCookie, isAdmin, requireAdmin } from "~/lib/admin.server"
import { MAX_UPLOAD_BYTES, formatBytes, parseVersion } from "~/lib/kernels"
import {
  createKernel,
  listAllKernelsForPage,
  moveKernel,
  publishKernel,
  removeKernelFile,
  saveKernelFile,
  unpublishKernel,
  versionExists,
} from "~/lib/kernels.server"
import { product } from "~/lib/product"
import {
  addNavDropdown,
  addPageBanner,
  addPageHero,
  addSitePage,
  getSiteContent,
  getSitePageById,
  moveNavDropdown,
  removeNavDropdown,
  removePageBanner,
  removePageHero,
  removeSitePage,
  updateNavDropdown,
  updatePageBannerTone,
} from "~/lib/site.server"

import type { Route } from "./+types/admin"

const messages: Record<string, string> = {
  "page-added": "Page added.",
  "page-removed": "Page removed.",
  "hero-added": "Hero added.",
  "hero-removed": "Hero removed.",
  "banner-added": "Page banner added.",
  "banner-removed": "Page banner removed.",
  "banner-updated": "Banner style updated.",
  "nav-added": "Header menu added.",
  "nav-updated": "Header menu updated.",
  "nav-removed": "Header menu removed. Its pages are still available.",
  "nav-moved": "Header menu order updated.",
  moved: "Release moved.",
  uploaded: "Release uploaded as a draft. Publish it when it's ready.",
  published: "Release published.",
  unpublished: "Release moved back to drafts.",
}

export function meta() {
  return [{ title: `Administration · ${product.name}` }]
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request)

  const { pages, nav } = getSiteContent()
  const requestedPageId = new URL(request.url).searchParams.get("page")
  const selectedPage =
    pages.find((page) => page.id === requestedPageId) ??
    pages.find((page) => page.slug === "") ??
    pages[0]

  if (!selectedPage) {
    throw new Response("There are no pages yet.", { status: 500 })
  }

  return {
    pages,
    nav,
    selectedPage,
    kernels: listAllKernelsForPage(selectedPage.id),
  }
}

export async function action({ request }: Route.ActionArgs) {
  if (!(await isAdmin(request))) throw redirect("/admin/login")

  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")

  if (intent === "logout") {
    return redirect("/admin/login", {
      headers: { "Set-Cookie": await destroyAdminCookie(request) },
    })
  }

  if (intent === "page-hero-add" || intent === "page-hero-remove") {
    const id = String(form.get("id") ?? "")
    const result =
      intent === "page-hero-add" ? addPageHero(id) : removePageHero(id)
    if (result.error) return { error: result.error }
    return redirect(
      `/admin?tab=pages&page=${id}&status=${
        intent === "page-hero-add" ? "hero-added" : "hero-removed"
      }`
    )
  }

  if (intent === "page-banner-add") {
    const id = String(form.get("id") ?? "")
    const result = addPageBanner({
      id,
      tone: String(form.get("tone") ?? ""),
      heading: String(form.get("heading") ?? ""),
      body: String(form.get("body") ?? ""),
    })
    if (result.error) return { error: result.error }
    return redirect(`/admin?tab=pages&page=${id}&status=banner-added`)
  }

  if (intent === "page-banner-remove") {
    const id = String(form.get("id") ?? "")
    const result = removePageBanner(id)
    if (result.error) return { error: result.error }
    return redirect(`/admin?tab=pages&page=${id}&status=banner-removed`)
  }

  if (intent === "page-banner-tone") {
    const id = String(form.get("id") ?? "")
    const result = updatePageBannerTone({
      id,
      tone: String(form.get("tone") ?? ""),
    })
    if (result.error) return { error: result.error }
    return redirect(`/admin?tab=pages&page=${id}&status=banner-updated`)
  }

  if (
    intent === "nav-add" ||
    intent === "nav-update" ||
    intent === "nav-remove" ||
    intent === "nav-move"
  ) {
    const returnPageId = String(form.get("returnPageId") ?? "")
    const id = String(form.get("id") ?? "")
    const pageIds = form.getAll("pageIds").map(String)
    const label = String(form.get("label") ?? "")
    const result =
      intent === "nav-add"
        ? addNavDropdown({ label, pageIds })
        : intent === "nav-update"
          ? updateNavDropdown({ id, label, pageIds })
          : intent === "nav-remove"
            ? removeNavDropdown(id)
            : moveNavDropdown({
                id,
                direction:
                  String(form.get("direction") ?? "") === "up" ? "up" : "down",
              })

    if (result.error) return { error: result.error }

    const status =
      intent === "nav-add"
        ? "nav-added"
        : intent === "nav-update"
          ? "nav-updated"
          : intent === "nav-remove"
            ? "nav-removed"
            : "nav-moved"
    const params = new URLSearchParams({ tab: "navigation", status })
    if (returnPageId) params.set("page", returnPageId)
    return redirect(`/admin?${params}`)
  }

  if (intent === "page-add") {
    const result = addSitePage({
      name: String(form.get("name") ?? ""),
      subheading: String(form.get("subheading") ?? ""),
      slug: String(form.get("slug") ?? ""),
      navId: String(form.get("navId") ?? ""),
    })
    if (result.error) return { error: result.error }
    return redirect(
      `/admin?tab=pages&page=${result.page!.id}&status=page-added`
    )
  }

  if (intent === "page-remove") {
    const id = String(form.get("id") ?? "")
    const page = getSitePageById(id)
    if (!page) return { error: "That page is no longer available." }
    if (page.slug === "") return { error: "The home page can't be removed." }
    if (listAllKernelsForPage(id).length > 0) {
      return {
        error: "Move this page's releases to another page before removing it.",
      }
    }

    const result = removeSitePage(id)
    if (result.error) return { error: result.error }
    return redirect("/admin?tab=pages&status=page-removed")
  }

  if (intent === "move") {
    const id = String(form.get("id") ?? "")
    const pageId = String(form.get("pageId") ?? "")
    if (!getSitePageById(pageId)) {
      return { error: "Choose a page for this release." }
    }
    if (!moveKernel(id, pageId)) {
      return { error: "That release is no longer available." }
    }
    return redirect(`/admin?tab=kernels&page=${pageId}&status=moved`)
  }

  if (intent === "publish" || intent === "unpublish") {
    const id = String(form.get("id") ?? "")
    const pageId = String(form.get("pageId") ?? "")
    const kernel =
      intent === "publish" ? publishKernel(id) : unpublishKernel(id)
    if (!kernel) return { error: "That release is no longer available." }

    const params = new URLSearchParams({
      tab: "kernels",
      status: intent === "publish" ? "published" : "unpublished",
    })
    if (pageId) params.set("page", pageId)
    return redirect(`/admin?${params}`)
  }

  if (intent !== "upload") return { error: "Unknown action." }

  const pageId = String(form.get("pageId") ?? "")
  if (!getSitePageById(pageId)) {
    return { error: "Choose a page for this release." }
  }

  const version = String(form.get("version") ?? "").trim()
  const changelog = String(form.get("changelog") ?? "").trim()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return { error: "Choose a .pmp file." }
  }
  if (!file.name.toLowerCase().endsWith(".pmp")) {
    return { error: "Choose a .pmp file." }
  }
  if (file.size === 0) {
    return { error: "That file is empty. Choose another one." }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `The file must be ${formatBytes(MAX_UPLOAD_BYTES)} or smaller.`,
    }
  }
  if (version.length > 64 || !parseVersion(version)) {
    return {
      error: "Enter a version like 3.1.0 or 3.2.0-beta.1.",
    }
  }
  if (changelog.length > 20_000) {
    return { error: "Keep the changelog to 20,000 characters or fewer." }
  }
  if (versionExists(version)) {
    return { error: "That version already exists. Choose another version." }
  }

  let storedFilename: string | null = null
  try {
    const saved = await saveKernelFile(file)
    storedFilename = saved.storedFilename
    if (!getSitePageById(pageId)) {
      removeKernelFile(storedFilename)
      return { error: "Choose a page for this release." }
    }
    createKernel({
      pageId,
      version: parseVersion(version)!,
      changelog,
      originalFilename: file.name.slice(0, 255),
      storedFilename: saved.storedFilename,
      size: saved.size,
    })
  } catch (error) {
    if (storedFilename) removeKernelFile(storedFilename)
    if (
      error instanceof Error &&
      error.message === "A release with that version already exists."
    ) {
      return { error: error.message }
    }
    throw error
  }

  return redirect(`/admin?tab=kernels&page=${pageId}&status=uploaded`)
}

export default function Admin() {
  const { pages, nav, selectedPage, kernels } = useLoaderData<typeof loader>()
  const actionData = useActionData<{ error: string }>()
  const navigation = useNavigation()
  const [searchParams] = useSearchParams()
  const message = messages[searchParams.get("status") ?? ""]

  return (
    <AdminDashboard
      pages={pages}
      nav={nav}
      selectedPage={selectedPage}
      kernels={kernels}
      actionData={actionData}
      message={message}
      busy={navigation.state === "submitting"}
    />
  )
}
