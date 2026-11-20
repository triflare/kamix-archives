export const HOME_PAGE_ID = "home"
export const HOME_SLUG = ""
export const MAX_PAGES = 24
export const MAX_NAV_DROPDOWNS = 8
export const MAX_NAV_LABEL_LENGTH = 40

export const RESERVED_SLUGS = new Set(["admin", "downloads", "preview", "api"])

export const BANNER_TONES = ["info", "warning", "danger"] as const
export type BannerTone = (typeof BANNER_TONES)[number]

export function isBannerTone(value: unknown): value is BannerTone {
  return (
    typeof value === "string" &&
    (BANNER_TONES as readonly string[]).includes(value)
  )
}

export interface SiteHero {
  heading: string
  body: string
}

export interface SiteBanner {
  tone: BannerTone
  heading: string
  body: string
}

export interface SitePage {
  id: string
  /** Empty for the home page, otherwise a URL segment. */
  slug: string
  name: string
  subheading: string
  /** Optional hero shown above the page's release table. */
  hero?: SiteHero
  /** Optional page-top notice for pauses, discontinuations, and similar. */
  banner?: SiteBanner
}

export interface SiteNavDropdown {
  id: string
  label: string
  /** Pages shown in this dropdown, in menu order. */
  pageIds: string[]
}

export interface SiteContent {
  pages: SitePage[]
  /** Top-bar archive dropdowns, in display order. */
  nav: SiteNavDropdown[]
}

export function defaultNavDropdowns(pages: SitePage[]): SiteNavDropdown[] {
  const pageIds = pages
    .filter((page) => page.slug !== HOME_SLUG)
    .map((page) => page.id)

  if (pageIds.length === 0) return []

  return [{ id: "primary", label: "Kamix", pageIds }]
}

export function pagePath(page: Pick<SitePage, "slug">) {
  return page.slug ? `/${page.slug}` : "/"
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
}

export function isValidSlug(slug: string) {
  return (
    slug.length > 0 &&
    slug.length <= 48 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_SLUGS.has(slug)
  )
}
