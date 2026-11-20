import { createReadStream, existsSync, statSync } from "node:fs"
import { Readable } from "node:stream"

import type { Route } from "./+types/download-file"
import { isAdmin } from "~/lib/admin.server"
import { getKernel, kernelFilePath } from "~/lib/kernels.server"

export async function loader({ params, request }: Route.LoaderArgs) {
  const kernel = getKernel(params.id)
  if (!kernel) throw new Response("Not Found", { status: 404 })

  const canPreviewDraft =
    kernel.publishedAt === null && (await isAdmin(request))
  if (!kernel.publishedAt && !canPreviewDraft) {
    throw new Response("Not Found", { status: 404 })
  }

  const path = kernelFilePath(kernel)
  if (!existsSync(path)) throw new Response("Not Found", { status: 404 })

  const asciiName = kernel.originalFilename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/"/g, "'")
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Length": String(statSync(path).size),
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(kernel.originalFilename)}`,
    "Cache-Control": kernel.publishedAt ? "public, no-cache" : "no-store",
  })

  const body = Readable.toWeb(
    createReadStream(path)
  ) as unknown as ReadableStream

  return new Response(body, { headers })
}
