import { randomUUID } from "node:crypto"
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { Readable } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import { pipeline } from "node:stream/promises"

import { DATA_DIR } from "./data.server"
import {
  compareVersionsDesc,
  isPublished,
  versionsEqual,
  type KernelVersion,
  type PublishedKernel,
} from "./kernels"
import { HOME_PAGE_ID } from "./site"

const DB_PATH = join(DATA_DIR, "kernels.json")
const UPLOAD_DIR = join(DATA_DIR, "uploads")

interface Database {
  versions: KernelVersion[]
}

function ensureDataDirs() {
  mkdirSync(UPLOAD_DIR, { recursive: true })
}

function readDb(): Database {
  if (!existsSync(DB_PATH)) return { versions: [] }

  const parsed: unknown = JSON.parse(readFileSync(DB_PATH, "utf8"))
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Database).versions)
  ) {
    throw new Error(`Invalid kernel database at ${DB_PATH}`)
  }

  const db = parsed as Database
  return {
    versions: db.versions.map((kernel) => ({
      ...kernel,
      pageId:
        typeof kernel.pageId === "string" && kernel.pageId
          ? kernel.pageId
          : HOME_PAGE_ID,
    })),
  }
}

function writeDb(db: Database) {
  ensureDataDirs()
  const temporary = `${DB_PATH}.${randomUUID()}.tmp`
  writeFileSync(temporary, `${JSON.stringify(db, null, 2)}\n`)
  renameSync(temporary, DB_PATH)
}

export function listAllKernelsForPage(pageId: string) {
  return readDb()
    .versions.filter((kernel) => kernel.pageId === pageId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listPublishedKernelsForPage(pageId: string): PublishedKernel[] {
  return readDb()
    .versions.filter((kernel) => kernel.pageId === pageId)
    .filter(isPublished)
    .sort((a, b) => {
      const byVersion = compareVersionsDesc(a.version, b.version)
      return byVersion !== 0
        ? byVersion
        : b.publishedAt.localeCompare(a.publishedAt)
    })
}

export function getKernel(id: string) {
  return readDb().versions.find((kernel) => kernel.id === id)
}

export function versionExists(version: string) {
  return readDb().versions.some((kernel) =>
    versionsEqual(kernel.version, version)
  )
}

export function kernelFilePath(kernel: KernelVersion) {
  return join(UPLOAD_DIR, kernel.storedFilename)
}

export async function saveKernelFile(file: File) {
  ensureDataDirs()

  const storedFilename = `${randomUUID()}.pmp`
  const destination = join(UPLOAD_DIR, storedFilename)
  const temporary = `${destination}.part`

  try {
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as NodeReadableStream),
      createWriteStream(temporary)
    )
    renameSync(temporary, destination)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }

  return { storedFilename, size: file.size }
}

export function removeKernelFile(storedFilename: string) {
  rmSync(join(UPLOAD_DIR, storedFilename), { force: true })
}

export function createKernel(input: {
  pageId: string
  version: string
  changelog: string
  originalFilename: string
  storedFilename: string
  size: number
}): KernelVersion {
  const db = readDb()
  if (
    db.versions.some((kernel) => versionsEqual(kernel.version, input.version))
  ) {
    throw new Error("A release with that version already exists.")
  }

  const kernel: KernelVersion = {
    id: randomUUID(),
    pageId: input.pageId,
    version: input.version,
    changelog: input.changelog,
    originalFilename: input.originalFilename,
    storedFilename: input.storedFilename,
    size: input.size,
    createdAt: new Date().toISOString(),
    publishedAt: null,
  }

  db.versions.push(kernel)
  writeDb(db)
  return kernel
}

export function updateKernelChangelog(id: string, changelog: string) {
  const db = readDb()
  const kernel = db.versions.find((entry) => entry.id === id)
  if (!kernel) return null

  kernel.changelog = changelog
  writeDb(db)
  return kernel
}

export function moveKernel(id: string, pageId: string) {
  const db = readDb()
  const kernel = db.versions.find((entry) => entry.id === id)
  if (!kernel) return null

  kernel.pageId = pageId
  writeDb(db)
  return kernel
}

export function publishKernel(id: string) {
  const db = readDb()
  const kernel = db.versions.find((entry) => entry.id === id)
  if (!kernel) return null

  if (!kernel.publishedAt) kernel.publishedAt = new Date().toISOString()
  writeDb(db)
  return kernel
}

export function unpublishKernel(id: string) {
  const db = readDb()
  const kernel = db.versions.find((entry) => entry.id === id)
  if (!kernel) return null

  kernel.publishedAt = null
  writeDb(db)
  return kernel
}
