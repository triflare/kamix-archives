import { eq, prerelease, rcompare, valid } from "semver"

export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024

export interface KernelVersion {
  id: string
  /** The one page that owns this version. */
  pageId: string
  version: string
  changelog: string
  originalFilename: string
  storedFilename: string
  size: number
  createdAt: string
  publishedAt: string | null
}

export type PublishedKernel = KernelVersion & { publishedAt: string }

export function isPublished(kernel: KernelVersion): kernel is PublishedKernel {
  return kernel.publishedAt !== null
}

export function parseVersion(version: string) {
  return valid(version.trim())
}

export function isPrerelease(version: string) {
  const parsed = parseVersion(version)
  return parsed !== null && prerelease(parsed) !== null
}

export function versionsEqual(a: string, b: string) {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)
  if (parsedA && parsedB) return eq(parsedA, parsedB)
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function compareVersionsDesc(a: string, b: string) {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)
  if (parsedA && parsedB) return rcompare(parsedA, parsedB)
  if (parsedA) return -1
  if (parsedB) return 1
  return b.localeCompare(a)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso))
}
