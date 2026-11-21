#!/usr/bin/env node
/**
 * Fail a release when a version file disagrees with the version
 * semantic-release computed.
 *
 * Runs immediately after scripts/set-version.js so a missing file or partial
 * write stops the release before it is committed and tagged.
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const requested = process.argv[2]
if (!requested) {
  process.stderr.write(
    "[kamix-archives] usage: node scripts/check-version.js <version>\n"
  )
  process.exit(1)
}

const version = requested.replace(/^v/, "")

function productVersion() {
  const source = fs.readFileSync(path.join(ROOT, "product.yml"), "utf8")
  // A `#` starts a comment only after whitespace; otherwise it belongs to the
  // unquoted version value, so a mismatch like `1.0.0#build` is not truncated.
  const match = source.match(
    /^version:[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|([^'"\s]+))[ \t]*(?:#.*)?$/m
  )
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

const failures = []

function expect(label, actual) {
  if (actual !== version)
    failures.push(`${label}: expected ${version}, found ${actual ?? "(none)"}`)
}

expect(
  "package.json",
  JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version
)
expect("product.yml", productVersion())

if (failures.length > 0) {
  process.stderr.write(
    `[kamix-archives] version check failed for ${version}:\n`
  )
  for (const failure of failures) process.stderr.write(`  - ${failure}\n`)
  process.exit(1)
}

process.stdout.write(
  `[kamix-archives] ${version} matches package.json and product.yml\n`
)
