import path from "node:path"
import { pathToFileURL } from "node:url"

process.env.NODE_ENV = process.env.NODE_ENV ?? "production"

// Loaded dynamically so NODE_ENV is set before anything requires React or the
// server build: a static import is hoisted above this line and would pull in
// React's development build, which then breaks server rendering.
const { createRequestHandler } = await import("@react-router/express")
const { default: compression } = await import("compression")
const { default: express } = await import("express")

const build = await import(
  pathToFileURL(path.resolve("build/server/index.js")).href
)
const assetsDirectory = path.isAbsolute(build.assetsBuildDirectory)
  ? build.assetsBuildDirectory
  : path.resolve(process.cwd(), build.assetsBuildDirectory)

const app = express()
app.disable("x-powered-by")

// Every deployment is expected to sit behind a proxy that terminates TLS, so
// the connection here is plain HTTP on an internal host. Trusting the proxy
// headers makes the request URL reflect the address the browser actually used
// (https://<their domain>), which is what action requests are checked against:
// without it every form submission is rejected as a cross-site request.
app.set("trust proxy", true)

// Proxies usually forward the public address in X-Forwarded-Host while Host
// keeps the internal one. React Router reads the host from the former but the
// port from the latter, so the two are aligned before the request is handled.
app.use((request, _response, next) => {
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim()
  if (forwardedHost) request.headers.host = forwardedHost
  next()
})

app.use(compression())
app.use(
  path.posix.join(build.publicPath, "assets"),
  express.static(path.join(assetsDirectory, "assets"), {
    immutable: true,
    maxAge: "1y",
  })
)
app.use(build.publicPath, express.static(assetsDirectory))
app.use(express.static("public", { maxAge: "1h" }))
app.use(
  "/.well-known",
  express.static(path.join(assetsDirectory, ".well-known"))
)
app.use(createRequestHandler({ build, mode: process.env.NODE_ENV }))

const port = Number(process.env.PORT ?? 3000)
const server = process.env.HOST
  ? app.listen(port, process.env.HOST, onListen)
  : app.listen(port, onListen)

function onListen(error) {
  if (error) throw error
  console.log(`[kamix-archives] http://localhost:${port}`)
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => server.close(() => process.exit(0)))
}
