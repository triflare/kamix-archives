#!/usr/bin/env node
/**
 * Write the version semantic-release computed into package.json and
 * product.yml.
 *
 * The build inlines product.yml into the bundle, so the release has to move
 * that version too or the site would keep reporting the previous one.
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const version = process.argv[2]
if (!version) {
  process.stderr.write(
    "[kamix-archives] usage: node scripts/set-version.js <version>\n"
  )
  process.exit(1)
}

const manifest = path.join(ROOT, "package.json")
const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"))
pkg.version = version
fs.writeFileSync(manifest, `${JSON.stringify(pkg, null, 2)}\n`)

/**
 * Replace the `version:` line in product.yml, keeping its quote style. A YAML
 * round-trip would drop the file's comments, so the line is rewritten in
 * place.
 */
const productFile = path.join(ROOT, "product.yml")
const source = fs.readFileSync(productFile, "utf8")
if (!/^version:.*$/m.test(source)) {
  throw new Error("product.yml has no version: line to update")
}
const next = source.replace(
  /^(version:\s*)(['"]?)([^'"\s]+)\2\s*$/m,
  (_match, prefix, quote) => `${prefix}${quote}${version}${quote}`
)
fs.writeFileSync(productFile, next)

process.stdout.write(`[kamix-archives] set both version files to ${version}\n`)
