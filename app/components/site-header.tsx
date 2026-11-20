import {
  ChevronDownIcon,
  LogInIcon,
  MenuIcon,
  SettingsIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router"

import { ThemeToggle } from "~/components/theme-toggle"
import { Button, buttonVariants } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { product } from "~/lib/product"
import {
  HOME_SLUG,
  pagePath,
  type SiteNavDropdown,
  type SitePage,
} from "~/lib/site"

export function SiteHeader({
  pages,
  nav,
  signedIn,
}: {
  pages: SitePage[]
  nav: SiteNavDropdown[]
  signedIn: boolean
}) {
  const [isSignedIn, setIsSignedIn] = useState(signedIn)
  const location = useLocation()
  const firstRender = useRef(true)
  const pageById = new Map(pages.map((page) => [page.id, page]))
  useEffect(() => {
    setIsSignedIn(signedIn)
  }, [signedIn])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!location.pathname.startsWith("/admin")) return

    let active = true
    fetch("/admin/session", {
      headers: { accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { signedIn?: unknown }) : null
      )
      .then((data) => {
        if (active && typeof data?.signedIn === "boolean") {
          setIsSignedIn(data.signedIn)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [location.pathname])

  const groupedPageIds = new Set(nav.flatMap((dropdown) => dropdown.pageIds))
  const standalonePages = pages.filter(
    (page) => page.slug !== HOME_SLUG && !groupedPageIds.has(page.id)
  )

  const groups = nav
    .map((dropdown) => ({
      ...dropdown,
      items: dropdown.pageIds.flatMap((pageId) => {
        const page = pageById.get(pageId)
        return page ? [page] : []
      }),
    }))
    .filter((dropdown) => dropdown.items.length > 0)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight"
        >
          <img
            src={product.logo}
            alt=""
            aria-hidden="true"
            className="h-8 w-auto max-w-32 shrink-0 object-contain"
          />
          <span>{product.name}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {groups.length > 0 || standalonePages.length > 0 ? (
            <>
              <nav
                aria-label="Browse releases"
                className="hidden items-center gap-1 xl:flex"
              >
                {groups.map((group) => (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          title={group.label}
                          className="max-w-32 gap-1.5"
                        />
                      }
                    >
                      <span className="truncate">{group.label}</span>
                      <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {group.items.map((page) => (
                        <DropdownMenuItem
                          key={page.id}
                          render={<Link to={pagePath(page)} />}
                        >
                          {page.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
                {standalonePages.map((page) => (
                  <Link
                    key={page.id}
                    to={pagePath(page)}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "max-w-32",
                    })}
                  >
                    <span className="truncate">{page.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="xl:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Browse releases"
                        title="Browse releases"
                      />
                    }
                  >
                    <MenuIcon className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {groups.map((group, index) => (
                      <DropdownMenuGroup key={group.id}>
                        {index > 0 ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                        {group.items.map((page) => (
                          <DropdownMenuItem
                            key={page.id}
                            render={<Link to={pagePath(page)} />}
                          >
                            {page.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ))}
                    {standalonePages.length > 0 ? (
                      <DropdownMenuGroup>
                        {groups.length > 0 ? <DropdownMenuSeparator /> : null}
                        {standalonePages.map((page) => (
                          <DropdownMenuItem
                            key={page.id}
                            render={<Link to={pagePath(page)} />}
                          >
                            {page.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : null}
          <ThemeToggle />
          {isSignedIn ? (
            <Link
              to="/admin"
              aria-label="Manage site"
              title="Manage site"
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "text-muted-foreground hover:text-foreground",
              })}
            >
              <SettingsIcon className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/admin"
              aria-label="Sign in to manage"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5",
              })}
            >
              <LogInIcon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
