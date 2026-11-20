import {
  ArrowUpRightIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react"
import { Form, Link, useSearchParams } from "react-router"

import { KernelActions } from "~/components/kernel-actions"
import { TopBarEditor } from "~/components/top-bar-editor"
import { Button, buttonVariants } from "~/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import {
  formatBytes,
  formatDate,
  isPrerelease,
  type KernelVersion,
} from "~/lib/kernels"
import {
  BANNER_TONES,
  pagePath,
  type SiteNavDropdown,
  type SitePage,
} from "~/lib/site"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const bannerToneLabels: Record<(typeof BANNER_TONES)[number], string> = {
  info: "Info",
  warning: "Warning",
  danger: "Critical",
}

const tabs = [
  { id: "pages", label: "Pages" },
  { id: "navigation", label: "Navigation" },
  { id: "kernels", label: "Releases" },
] as const

type AdminTab = (typeof tabs)[number]["id"]

export function AdminDashboard({
  pages,
  nav,
  selectedPage,
  kernels,
  actionData,
  message,
  busy,
}: {
  pages: SitePage[]
  nav: SiteNavDropdown[]
  selectedPage: SitePage
  kernels: KernelVersion[]
  actionData?: { error?: string }
  message?: string
  busy: boolean
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab")
  const activeTab: AdminTab = tabs.some((tab) => tab.id === requested)
    ? (requested as AdminTab)
    : "pages"

  function setTab(value: string) {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
              Administration
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Administration
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage pages, navigation, releases, and sign-in options. To change
              page text, use the pencil on the page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pagePath(selectedPage)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View page
              <ArrowUpRightIcon aria-hidden="true" />
            </a>
            <Link
              to="/admin/auth"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <SettingsIcon aria-hidden="true" />
              Sign-in options
            </Link>
            <Form method="post">
              <input type="hidden" name="intent" value="logout" />
              <Button variant="ghost" size="sm" type="submit" disabled={busy}>
                Sign out
              </Button>
            </Form>
          </div>
        </header>

        {message ? (
          <p
            role="status"
            className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            {message}
          </p>
        ) : null}

        {actionData?.error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {actionData.error}
          </p>
        ) : null}

        <Tabs value={activeTab} onValueChange={setTab} className="gap-6">
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto"
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="pages">
            <PagesSection
              pages={pages}
              nav={nav}
              selectedPage={selectedPage}
              busy={busy}
            />
          </TabsContent>

          <TabsContent value="navigation">
            <section className="flex w-full flex-col gap-4">
              <div>
                <h2 className="text-base font-medium">Navigation</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the pages that appear in your header menus. A page can
                  be in one menu at a time, and the home page is always
                  available from the logo.
                </p>
              </div>
              <PagePicker
                pages={pages}
                selectedPage={selectedPage}
                tab="navigation"
              />
              <TopBarEditor
                pages={pages}
                nav={nav}
                pageId={selectedPage.id}
                busy={busy}
              />
            </section>
          </TabsContent>

          <TabsContent value="kernels">
            <KernelsSection
              pages={pages}
              selectedPage={selectedPage}
              kernels={kernels}
              busy={busy}
              actionData={actionData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function PagePicker({
  pages,
  selectedPage,
  tab,
}: {
  pages: SitePage[]
  selectedPage: SitePage
  tab: AdminTab
}) {
  return (
    <Form
      method="get"
      className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
    >
      <input type="hidden" name="tab" value={tab} />
      <div className="min-w-48 flex-1 space-y-1">
        <label
          htmlFor={`page-picker-${tab}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Page to manage
        </label>
        <select
          id={`page-picker-${tab}`}
          key={selectedPage.id}
          name="page"
          defaultValue={selectedPage.id}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className={selectClass}
        >
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name} ({pagePath(page)})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Switch
      </Button>
    </Form>
  )
}

function PagesSection({
  pages,
  nav,
  selectedPage,
  busy,
}: {
  pages: SitePage[]
  nav: SiteNavDropdown[]
  selectedPage: SitePage
  busy: boolean
}) {
  return (
    <div className="flex w-full flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage the pages on your site. Select a page to change its layout,
            or edit its text directly on the page.
          </p>
        </div>

        <ul className="divide-y overflow-hidden rounded-lg border">
          {pages.map((page) => {
            const selected = page.id === selectedPage.id
            return (
              <li
                key={page.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                  selected ? "bg-muted/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{page.name}</p>
                    {page.slug === "" ? (
                      <span className="inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
                        home
                      </span>
                    ) : null}
                    {page.hero ? (
                      <span className="inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                        hero
                      </span>
                    ) : null}
                    {page.banner ? (
                      <span className="inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                        banner
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pagePath(page)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={pagePath(page)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                  <Link
                    to={`/admin?tab=pages&page=${page.id}`}
                    className={buttonVariants({
                      variant: selected ? "secondary" : "outline",
                      size: "sm",
                    })}
                  >
                    Manage
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>

        <details className="rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <PlusIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Add page
          </summary>
          <div className="border-t p-4">
            <Form method="post" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="intent" value="page-add" />
              <div className="space-y-1">
                <label htmlFor="new-page-name" className="text-xs font-medium">
                  Name
                </label>
                <input
                  id="new-page-name"
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Kamix 2"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-page-slug" className="text-xs font-medium">
                  Page URL
                </label>
                <input
                  id="new-page-slug"
                  name="slug"
                  required
                  maxLength={48}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="kamix-2"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="new-page-subheading"
                  className="text-xs font-medium"
                >
                  Subheading
                </label>
                <textarea
                  id="new-page-subheading"
                  name="subheading"
                  rows={2}
                  maxLength={500}
                  placeholder="Browse releases from Kamix 2."
                  className={textareaClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-page-nav" className="text-xs font-medium">
                  Header menu
                </label>
                <select
                  id="new-page-nav"
                  name="navId"
                  defaultValue={nav[0]?.id ?? ""}
                  className={selectClass}
                >
                  <option value="">Not in a menu (top-level link)</option>
                  {nav.map((dropdown) => (
                    <option key={dropdown.id} value={dropdown.id}>
                      {dropdown.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" size="sm" disabled={busy}>
                  Add page
                </Button>
              </div>
            </Form>
          </div>
        </details>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Page layout</h2>
            <p className="text-sm text-muted-foreground">
              {selectedPage.name} · {pagePath(selectedPage)}
            </p>
          </div>
          <a
            href={pagePath(selectedPage)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PencilIcon aria-hidden="true" />
            Edit page text
          </a>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Hero</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  The large image and text at the top of the page. Use the
                  pencil on the page to edit the words.
                </p>
              </div>
              {selectedPage.hero ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="page-hero-remove" />
                  <input type="hidden" name="id" value={selectedPage.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </Form>
              ) : null}
            </div>

            {selectedPage.hero ? (
              <div className="mt-3 rounded-lg bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  {selectedPage.hero.heading}
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {selectedPage.hero.body || "No hero text yet."}
                </p>
              </div>
            ) : (
              <Form method="post" className="mt-3">
                <input type="hidden" name="intent" value="page-hero-add" />
                <input type="hidden" name="id" value={selectedPage.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                >
                  <PlusIcon aria-hidden="true" />
                  Add hero
                </Button>
              </Form>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Page banner</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Show a short notice above the page title. Use the pencil on
                  the page to edit the message.
                </p>
              </div>
              {selectedPage.banner ? (
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="page-banner-remove"
                  />
                  <input type="hidden" name="id" value={selectedPage.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </Form>
              ) : null}
            </div>

            {selectedPage.banner ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-sm font-medium">
                    {selectedPage.banner.heading || "No heading yet"}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {selectedPage.banner.body || "No message yet."}
                  </p>
                </div>
                <Form method="post" className="flex items-end gap-2">
                  <input type="hidden" name="intent" value="page-banner-tone" />
                  <input type="hidden" name="id" value={selectedPage.id} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <label
                      htmlFor={`banner-tone-${selectedPage.id}`}
                      className="text-xs font-medium"
                    >
                      Style
                    </label>
                    <select
                      id={`banner-tone-${selectedPage.id}`}
                      key={selectedPage.id}
                      name="tone"
                      defaultValue={selectedPage.banner.tone}
                      className={selectClass}
                    >
                      {BANNER_TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {bannerToneLabels[tone]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                  >
                    Save
                  </Button>
                </Form>
              </div>
            ) : (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Add banner
                </summary>
                <Form method="post" className="mt-3 space-y-3">
                  <input type="hidden" name="intent" value="page-banner-add" />
                  <input type="hidden" name="id" value={selectedPage.id} />
                  <div className="space-y-1">
                    <label
                      htmlFor={`new-banner-tone-${selectedPage.id}`}
                      className="text-xs font-medium"
                    >
                      Style
                    </label>
                    <select
                      id={`new-banner-tone-${selectedPage.id}`}
                      name="tone"
                      defaultValue="warning"
                      className={selectClass}
                    >
                      {BANNER_TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {bannerToneLabels[tone]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`new-banner-heading-${selectedPage.id}`}
                      className="text-xs font-medium"
                    >
                      Heading
                    </label>
                    <input
                      id={`new-banner-heading-${selectedPage.id}`}
                      name="heading"
                      maxLength={120}
                      placeholder="Development paused"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`new-banner-body-${selectedPage.id}`}
                      className="text-xs font-medium"
                    >
                      Message
                    </label>
                    <textarea
                      id={`new-banner-body-${selectedPage.id}`}
                      name="body"
                      rows={2}
                      maxLength={1_000}
                      placeholder="This version is no longer in development."
                      className={textareaClass}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={busy}>
                    Add banner
                  </Button>
                </Form>
              </details>
            )}
          </section>
        </div>

        {selectedPage.slug !== "" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Remove page</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Before you remove this page, move its releases to another page.
              </p>
            </div>
            <Form
              method="post"
              onSubmit={(event) => {
                if (
                  !window.confirm(`Remove the page "${selectedPage.name}"?`)
                ) {
                  event.preventDefault()
                }
              }}
            >
              <input type="hidden" name="intent" value="page-remove" />
              <input type="hidden" name="id" value={selectedPage.id} />
              <Button type="submit" size="sm" variant="outline" disabled={busy}>
                Remove page
              </Button>
            </Form>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function KernelsSection({
  pages,
  selectedPage,
  kernels,
  busy,
  actionData,
}: {
  pages: SitePage[]
  selectedPage: SitePage
  kernels: KernelVersion[]
  busy: boolean
  actionData?: { error?: string }
}) {
  const otherPages = pages.filter((page) => page.id !== selectedPage.id)

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Releases</h2>
        <p className="text-sm text-muted-foreground">
          Each release belongs to one page. Choose a page before you upload.
        </p>
      </div>

      <PagePicker pages={pages} selectedPage={selectedPage} tab="kernels" />

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Upload a release</h3>
          <p className="text-xs text-muted-foreground">
            New uploads are saved as drafts. Publish them when they're ready.
          </p>
        </div>
        <Form
          method="post"
          encType="multipart/form-data"
          className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
        >
          <input type="hidden" name="intent" value="upload" />
          <input type="hidden" name="pageId" value={selectedPage.id} />

          <div className="space-y-1">
            <label htmlFor="version" className="text-sm font-medium">
              Version
            </label>
            <input
              id="version"
              name="version"
              required
              maxLength={64}
              placeholder="3.1.0 or 3.2.0-beta.1"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="file" className="text-sm font-medium">
              Release file (.pmp)
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pmp"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="changelog" className="text-sm font-medium">
              Changelog{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <textarea
              id="changelog"
              name="changelog"
              rows={3}
              maxLength={20_000}
              placeholder="Notes shown with this release."
              className={textareaClass}
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Upload release
            </Button>
          </div>
        </Form>
      </section>

      {kernels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No releases on this page yet.
          </p>
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Changelog</th>
                <th className="px-4 py-3 text-right font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {kernels.map((kernel) => (
                <tr
                  key={kernel.id}
                  className="border-b align-top last:border-0"
                >
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{kernel.version}</span>
                      {isPrerelease(kernel.version) ? (
                        <span className="inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
                          pre-release
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        kernel.publishedAt
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {kernel.publishedAt ? "published" : "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(kernel.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                    {formatBytes(kernel.size)}
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    {kernel.changelog ? (
                      <a
                        href={`/changelogs/${kernel.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {kernel.publishedAt
                          ? "View changelog"
                          : "Preview changelog"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No changelog yet
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <KernelActions
                      kernel={kernel}
                      pageId={selectedPage.id}
                      otherPages={otherPages}
                      busy={busy}
                      error={actionData?.error}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
