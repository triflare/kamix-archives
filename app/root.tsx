import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
} from "react-router"

import type { Route } from "./+types/root"
import { SiteHeader } from "~/components/site-header"
import { isAdmin } from "~/lib/admin.server"
import { imageMimeType, product } from "~/lib/product"
import { getSiteContent } from "~/lib/site.server"
import "./app.css"

// Runs before the first paint so a stored or system dark preference is already
// applied when the page appears, instead of flashing the light theme.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(d?"dark":"light")}catch(e){}})()`

export async function loader({ request }: Route.LoaderArgs) {
  const { pages, nav } = getSiteContent()
  return { pages, nav, signedIn: await isAdmin(request) }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          type={imageMimeType(product.logo)}
          href={product.logo}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const { pages, nav, signedIn } = useLoaderData<typeof loader>()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader pages={pages} nav={nav} signedIn={signedIn} />
      <Outlet />
    </div>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong"
  let details = "We couldn't load this page. Try again."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : "Something went wrong"
    details =
      error.status === 404
        ? "We couldn't find that page."
        : typeof error.data === "string"
          ? error.data
          : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
