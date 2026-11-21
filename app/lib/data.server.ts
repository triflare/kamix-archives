import { mkdirSync } from "node:fs"
import { join, resolve } from "node:path"

export const DATA_DIR = resolve(
  process.env.DATA_DIR ?? join(process.cwd(), "data")
)

export function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true })
}
