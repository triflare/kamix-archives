import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { DATA_DIR, ensureDataDir } from "./data.server"
import { product } from "./product"
import {
  HOME_PAGE_ID,
  HOME_SLUG,
  MAX_NAV_DROPDOWNS,
  MAX_NAV_LABEL_LENGTH,
  MAX_PAGES,
  defaultNavDropdowns,
  isBannerTone,
  isValidSlug,
  normalizeSlug,
  type SiteBanner,
  type SiteContent,
  type SiteHero,
  type SiteNavDropdown,
  type SitePage,
} from "./site"

const SITE_PATH = join(DATA_DIR, "site.json")
const MAX_NAME_LENGTH = 80
const MAX_SUBHEADING_LENGTH = 500
const MAX_HERO_HEADING_LENGTH = 120
const MAX_HERO_BODY_LENGTH = 2_000
const MAX_BANNER_HEADING_LENGTH = 120
const MAX_BANNER_BODY_LENGTH = 1_000

export type EditablePageField =
  | "name"
  | "subheading"
  | "heroHeading"
  | "heroBody"
  | "bannerHeading"
  | "bannerBody"

type PageResult =
  { page: SitePage; error?: never } | { page?: never; error: string }

function defaultHero(): SiteHero {
  return {
    heading: product.pages.home.hero.heading,
    body: product.pages.home.hero.body,
  }
}

function defaultHome(): SitePage {
  return {
    id: HOME_PAGE_ID,
    slug: HOME_SLUG,
    name: product.pages.home.name,
    subheading: product.pages.home.subheading,
    hero: defaultHero(),
  }
}

function defaultSite(): SiteContent {
  return { pages: [defaultHome()], nav: [] }
}

function readHero(value: unknown): SiteHero | undefined {
  if (!value || typeof value !== "object") return undefined
  const hero = value as Partial<SiteHero>
  if (typeof hero.heading !== "string" || typeof hero.body !== "string") {
    return undefined
  }
  const heading = hero.heading.trim()
  if (!heading) return undefined
  return { heading, body: hero.body }
}

function readBanner(value: unknown): SiteBanner | undefined {
  if (!value || typeof value !== "object") return undefined
  const banner = value as Partial<SiteBanner>
  if (!isBannerTone(banner.tone)) return undefined
  if (typeof banner.heading !== "string" || typeof banner.body !== "string") {
    return undefined
  }
  const heading = banner.heading.trim()
  const body = banner.body.trim()
  if (!heading && !body) return undefined
  return { tone: banner.tone, heading, body }
}

function isStoredPage(value: unknown): value is SitePage {
  if (!value || typeof value !== "object") return false
  const page = value as Partial<SitePage>
  return (
    typeof page.id === "string" &&
    typeof page.slug === "string" &&
    typeof page.name === "string" &&
    typeof page.subheading === "string"
  )
}

function readNavDropdowns(
  value: unknown,
  pages: SitePage[]
): SiteNavDropdown[] {
  if (!Array.isArray(value)) return defaultNavDropdowns(pages)

  const availablePageIds = new Set(pages.map((page) => page.id))
  const usedPageIds = new Set<string>()
  const usedDropdownIds = new Set<string>()
  const nav: SiteNavDropdown[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue
    const candidate = entry as Partial<SiteNavDropdown>
    if (
      typeof candidate.id !== "string" ||
      !candidate.id ||
      usedDropdownIds.has(candidate.id) ||
      typeof candidate.label !== "string"
    ) {
      continue
    }

    const label = candidate.label.trim()
    if (!label) continue

    const pageIds = Array.isArray(candidate.pageIds)
      ? candidate.pageIds.filter(
          (id): id is string =>
            typeof id === "string" &&
            availablePageIds.has(id) &&
            !usedPageIds.has(id)
        )
      : []
    pageIds.forEach((id) => usedPageIds.add(id))
    usedDropdownIds.add(candidate.id)
    nav.push({
      id: candidate.id,
      label: label.slice(0, MAX_NAV_LABEL_LENGTH),
      pageIds,
    })

    if (nav.length >= MAX_NAV_DROPDOWNS) break
  }

  return nav
}

function readSite(): SiteContent {
  if (!existsSync(SITE_PATH)) return defaultSite()

  const parsed: unknown = JSON.parse(readFileSync(SITE_PATH, "utf8"))
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as SiteContent).pages)
  ) {
    throw new Error(`Invalid site content at ${SITE_PATH}`)
  }

  const pages = (parsed as SiteContent).pages
    .filter(isStoredPage)
    .map((page) => ({
      id: page.id,
      slug: page.slug,
      name: page.name,
      subheading: page.subheading,
      hero: readHero(page.hero),
      banner: readBanner(page.banner),
    }))

  const home = pages.find((page) => page.slug === HOME_SLUG) ?? defaultHome()
  const orderedPages = [
    home,
    ...pages.filter((page) => page.slug !== HOME_SLUG),
  ]
  return {
    pages: orderedPages,
    nav: readNavDropdowns((parsed as Partial<SiteContent>).nav, orderedPages),
  }
}

function writeSite(site: SiteContent) {
  ensureDataDir()
  const temporary = `${SITE_PATH}.${randomUUID()}.tmp`
  writeFileSync(temporary, `${JSON.stringify(site, null, 2)}\n`)
  renameSync(temporary, SITE_PATH)
}

export function getSiteContent() {
  return readSite()
}

export function getSitePage(slug: string) {
  return readSite().pages.find((page) => page.slug === slug)
}

export function getSitePageById(id: string) {
  return readSite().pages.find((page) => page.id === id)
}

function navLabel(value: string): { label: string } | { error: string } {
  const label = value.trim()
  if (!label) return { error: "Enter a menu name." }
  if (label.length > MAX_NAV_LABEL_LENGTH) {
    return {
      error: `Dropdown names must be ${MAX_NAV_LABEL_LENGTH} characters or fewer.`,
    }
  }
  return { label }
}

function selectedNavPageIds(site: SiteContent, values: string[]) {
  const availablePageIds = new Set(site.pages.map((page) => page.id))
  return [...new Set(values)].filter((id) => availablePageIds.has(id))
}

function assignNavPageIds(
  site: SiteContent,
  dropdownId: string,
  pageIds: string[]
) {
  const selected = new Set(pageIds)
  for (const dropdown of site.nav) {
    if (dropdown.id === dropdownId) continue
    dropdown.pageIds = dropdown.pageIds.filter((id) => !selected.has(id))
  }
  const dropdown = site.nav.find((entry) => entry.id === dropdownId)
  if (dropdown) dropdown.pageIds = pageIds
}

export function addNavDropdown(input: { label: string; pageIds: string[] }): {
  error?: string
} {
  const site = readSite()
  if (site.nav.length >= MAX_NAV_DROPDOWNS) {
    return { error: `You can add up to ${MAX_NAV_DROPDOWNS} dropdowns.` }
  }

  const label = navLabel(input.label)
  if ("error" in label) return label
  if (
    site.nav.some(
      (dropdown) => dropdown.label.toLowerCase() === label.label.toLowerCase()
    )
  ) {
    return { error: "That menu name is already in use." }
  }

  const pageIds = selectedNavPageIds(site, input.pageIds)
  if (pageIds.length === 0) {
    return { error: "Choose at least one page for this menu." }
  }

  const dropdown: SiteNavDropdown = {
    id: randomUUID(),
    label: label.label,
    pageIds: [],
  }
  site.nav.push(dropdown)
  assignNavPageIds(site, dropdown.id, pageIds)
  writeSite(site)
  return {}
}

export function updateNavDropdown(input: {
  id: string
  label: string
  pageIds: string[]
}): { error?: string } {
  const site = readSite()
  const dropdown = site.nav.find((entry) => entry.id === input.id)
  if (!dropdown) return { error: "That menu is no longer available." }

  const label = navLabel(input.label)
  if ("error" in label) return label
  if (
    site.nav.some(
      (entry) =>
        entry.id !== input.id &&
        entry.label.toLowerCase() === label.label.toLowerCase()
    )
  ) {
    return { error: "That menu name is already in use." }
  }

  const pageIds = selectedNavPageIds(site, input.pageIds)
  if (pageIds.length === 0) {
    return { error: "Choose at least one page for this menu." }
  }

  dropdown.label = label.label
  assignNavPageIds(site, dropdown.id, pageIds)
  writeSite(site)
  return {}
}

export function removeNavDropdown(id: string): { error?: string } {
  const site = readSite()
  if (!site.nav.some((dropdown) => dropdown.id === id)) {
    return { error: "That menu is no longer available." }
  }

  site.nav = site.nav.filter((dropdown) => dropdown.id !== id)
  writeSite(site)
  return {}
}

export function moveNavDropdown(input: {
  id: string
  direction: "up" | "down"
}): { error?: string } {
  const site = readSite()
  const index = site.nav.findIndex((dropdown) => dropdown.id === input.id)
  if (index === -1) return { error: "That menu is no longer available." }

  const target = input.direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= site.nav.length) return {}

  const [dropdown] = site.nav.splice(index, 1)
  site.nav.splice(target, 0, dropdown)
  writeSite(site)
  return {}
}

export function updatePageField(input: {
  id: string
  field: EditablePageField
  value: string
}): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === input.id)
  if (!page) return { error: "That page is no longer available." }

  const value = input.value.trim()

  if (input.field === "name") {
    if (value.length === 0) return { error: "Enter a page name." }
    if (value.length > MAX_NAME_LENGTH) {
      return {
        error: `Page names must be ${MAX_NAME_LENGTH} characters or fewer.`,
      }
    }
    page.name = value
  } else if (input.field === "subheading") {
    if (value.length > MAX_SUBHEADING_LENGTH) {
      return {
        error: `Subheadings must be ${MAX_SUBHEADING_LENGTH} characters or fewer.`,
      }
    }
    page.subheading = value
  } else if (input.field === "heroHeading" || input.field === "heroBody") {
    if (!page.hero) return { error: "Add a hero before you edit its text." }

    if (input.field === "heroHeading") {
      if (value.length === 0) return { error: "Enter a hero heading." }
      if (value.length > MAX_HERO_HEADING_LENGTH) {
        return {
          error: `Hero headings must be ${MAX_HERO_HEADING_LENGTH} characters or fewer.`,
        }
      }
      page.hero.heading = value
    } else {
      if (value.length > MAX_HERO_BODY_LENGTH) {
        return {
          error: `Hero text must be ${MAX_HERO_BODY_LENGTH} characters or fewer.`,
        }
      }
      page.hero.body = value
    }
  } else {
    if (!page.banner) return { error: "Add a banner before you edit its text." }

    if (input.field === "bannerHeading") {
      if (value.length > MAX_BANNER_HEADING_LENGTH) {
        return {
          error: `Banner headings must be ${MAX_BANNER_HEADING_LENGTH} characters or fewer.`,
        }
      }
      if (!value && !page.banner.body.trim()) {
        return { error: "Add a banner heading or message." }
      }
      page.banner.heading = value
    } else {
      if (value.length > MAX_BANNER_BODY_LENGTH) {
        return {
          error: `Banner messages must be ${MAX_BANNER_BODY_LENGTH} characters or fewer.`,
        }
      }
      if (!value && !page.banner.heading.trim()) {
        return { error: "Add a banner heading or message." }
      }
      page.banner.body = value
    }
  }

  writeSite(site)
  return { page }
}

export function addPageHero(id: string): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === id)
  if (!page) return { error: "That page is no longer available." }

  if (!page.hero) {
    page.hero = { heading: page.name, body: page.subheading }
    writeSite(site)
  }
  return { page }
}

export function removePageHero(id: string): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === id)
  if (!page) return { error: "That page is no longer available." }

  if (page.hero) {
    delete page.hero
    writeSite(site)
  }
  return { page }
}

export function addPageBanner(input: {
  id: string
  tone: string
  heading: string
  body: string
}): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === input.id)
  if (!page) return { error: "That page is no longer available." }
  if (!isBannerTone(input.tone)) {
    return { error: "Choose a banner style." }
  }

  const heading = input.heading.trim()
  const body = input.body.trim()
  if (!heading && !body) {
    return { error: "Add a banner heading or message." }
  }
  if (heading.length > MAX_BANNER_HEADING_LENGTH) {
    return {
      error: `Banner headings must be ${MAX_BANNER_HEADING_LENGTH} characters or fewer.`,
    }
  }
  if (body.length > MAX_BANNER_BODY_LENGTH) {
    return {
      error: `Banner messages must be ${MAX_BANNER_BODY_LENGTH} characters or fewer.`,
    }
  }

  page.banner = { tone: input.tone, heading, body }
  writeSite(site)
  return { page }
}

export function removePageBanner(id: string): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === id)
  if (!page) return { error: "That page is no longer available." }

  if (page.banner) {
    delete page.banner
    writeSite(site)
  }
  return { page }
}

export function updatePageBannerTone(input: {
  id: string
  tone: string
}): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === input.id)
  if (!page) return { error: "That page is no longer available." }
  if (!page.banner) return { error: "This page doesn't have a banner." }
  if (!isBannerTone(input.tone)) {
    return { error: "Choose a banner style." }
  }

  page.banner.tone = input.tone
  writeSite(site)
  return { page }
}

export function addSitePage(input: {
  name: string
  subheading: string
  slug: string
  navId?: string
}): PageResult {
  const site = readSite()
  if (site.pages.length >= MAX_PAGES) {
    return { error: `You can add up to ${MAX_PAGES} pages.` }
  }

  const name = input.name.trim()
  const subheading = input.subheading.trim()
  if (name.length === 0) return { error: "Enter a page name." }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      error: `Page names must be ${MAX_NAME_LENGTH} characters or fewer.`,
    }
  }
  if (subheading.length > MAX_SUBHEADING_LENGTH) {
    return {
      error: `Subheadings must be ${MAX_SUBHEADING_LENGTH} characters or fewer.`,
    }
  }

  const slug = normalizeSlug(input.slug)
  if (!isValidSlug(slug)) {
    return {
      error:
        "Use a URL slug with lowercase letters, numbers, and hyphens (48 characters max).",
    }
  }
  if (site.pages.some((page) => page.slug === slug)) {
    return { error: "That page URL is already in use." }
  }

  const navDropdown = input.navId
    ? site.nav.find((dropdown) => dropdown.id === input.navId)
    : undefined
  if (input.navId && !navDropdown) {
    return { error: "Choose a header menu." }
  }

  const page: SitePage = {
    id: randomUUID(),
    slug,
    name,
    subheading,
  }
  site.pages.push(page)
  navDropdown?.pageIds.push(page.id)
  writeSite(site)
  return { page }
}

export function removeSitePage(id: string): PageResult {
  const site = readSite()
  const page = site.pages.find((entry) => entry.id === id)
  if (!page) return { error: "That page is no longer available." }
  if (page.slug === HOME_SLUG)
    return { error: "The home page can't be removed." }

  site.pages = site.pages.filter((entry) => entry.id !== id)
  site.nav = site.nav.map((dropdown) => ({
    ...dropdown,
    pageIds: dropdown.pageIds.filter((pageId) => pageId !== id),
  }))
  writeSite(site)
  return { page }
}
