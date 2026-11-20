import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  Trash2Icon,
} from "lucide-react"
import { Form } from "react-router"

import { Button } from "~/components/ui/button"
import {
  MAX_NAV_DROPDOWNS,
  MAX_NAV_LABEL_LENGTH,
  type SiteNavDropdown,
  type SitePage,
} from "~/lib/site"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function PageChoices({
  pages,
  selectedIds,
  idPrefix,
}: {
  pages: SitePage[]
  selectedIds: string[]
  idPrefix: string
}) {
  return (
    <div className="space-y-1">
      {pages.map((page) => (
        <label
          key={page.id}
          className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted"
        >
          <input
            id={`${idPrefix}-${page.id}`}
            type="checkbox"
            name="pageIds"
            value={page.id}
            defaultChecked={selectedIds.includes(page.id)}
            className="mt-0.5 size-3.5 shrink-0 accent-primary"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{page.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {page.slug ? `/${page.slug}` : "/"}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}

export function TopBarEditor({
  pages,
  nav,
  pageId,
  busy,
}: {
  pages: SitePage[]
  nav: SiteNavDropdown[]
  pageId: string
  busy: boolean
}) {
  const groupedPageIds = new Set(nav.flatMap((dropdown) => dropdown.pageIds))
  const ungroupedPages = pages.filter(
    (page) => page.slug !== "" && !groupedPageIds.has(page.id)
  )
  const navSignature = nav
    .map(
      (dropdown) =>
        `${dropdown.id}:${dropdown.label}:${dropdown.pageIds.join(",")}`
    )
    .join("|")

  return (
    <div key={navSignature} className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">Header menus</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
          {nav.length} {nav.length === 1 ? "menu" : "menus"}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Choose the pages that appear in each header menu. A page can be in one
        menu at a time. Pages that aren't in a menu appear as their own links in
        the top bar, and the home page is always available from the logo.
      </p>

      <div className="mt-3 space-y-2">
        {nav.map((dropdown, index) => (
          <details
            key={dropdown.id}
            className="group overflow-hidden rounded-xl border bg-background"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 truncate font-medium">
                {dropdown.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {dropdown.pageIds.length}
              </span>
              <ChevronDownIcon
                className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>

            <div className="border-t p-3">
              <Form method="post" className="space-y-3">
                <input type="hidden" name="intent" value="nav-update" />
                <input type="hidden" name="id" value={dropdown.id} />
                <input type="hidden" name="returnPageId" value={pageId} />

                <div className="space-y-1">
                  <label
                    htmlFor={`nav-label-${dropdown.id}`}
                    className="text-xs font-medium"
                  >
                    Menu name
                  </label>
                  <input
                    id={`nav-label-${dropdown.id}`}
                    name="label"
                    required
                    maxLength={MAX_NAV_LABEL_LENGTH}
                    defaultValue={dropdown.label}
                    className={inputClass}
                  />
                </div>

                <fieldset className="space-y-1">
                  <legend className="text-xs font-medium">Pages</legend>
                  <PageChoices
                    pages={pages}
                    selectedIds={dropdown.pageIds}
                    idPrefix={`nav-${dropdown.id}`}
                  />
                </fieldset>

                <Button type="submit" size="sm" disabled={busy}>
                  Save menu
                </Button>
              </Form>

              <div className="mt-3 flex items-center gap-1 border-t pt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="nav-move" />
                  <input type="hidden" name="id" value={dropdown.id} />
                  <input type="hidden" name="direction" value="up" />
                  <input type="hidden" name="returnPageId" value={pageId} />
                  <Button
                    type="submit"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${dropdown.label} left`}
                    title="Move left"
                    disabled={busy || index === 0}
                  >
                    <ArrowUpIcon className="-rotate-90" aria-hidden="true" />
                  </Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="nav-move" />
                  <input type="hidden" name="id" value={dropdown.id} />
                  <input type="hidden" name="direction" value="down" />
                  <input type="hidden" name="returnPageId" value={pageId} />
                  <Button
                    type="submit"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${dropdown.label} right`}
                    title="Move right"
                    disabled={busy || index === nav.length - 1}
                  >
                    <ArrowDownIcon className="-rotate-90" aria-hidden="true" />
                  </Button>
                </Form>
                <Form
                  method="post"
                  className="ml-auto"
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Remove the "${dropdown.label}" menu? Its pages will stay on the site.`
                      )
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="intent" value="nav-remove" />
                  <input type="hidden" name="id" value={dropdown.id} />
                  <input type="hidden" name="returnPageId" value={pageId} />
                  <Button
                    type="submit"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${dropdown.label} menu`}
                    title="Remove menu"
                    disabled={busy}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </Form>
              </div>
            </div>
          </details>
        ))}
      </div>

      {ungroupedPages.length > 0 ? (
        <p className="mt-3 rounded-lg border border-dashed px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            Shown directly in the top bar:
          </span>{" "}
          {ungroupedPages.map((page) => page.name).join(", ")}. Add a page to a
          menu to group it with others.
        </p>
      ) : null}

      {pages.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Add a page before you create a menu.
        </p>
      ) : nav.length < MAX_NAV_DROPDOWNS ? (
        <details
          key={`add-dropdown-${nav.length}`}
          open={nav.length === 0}
          className="mt-3 border-t pt-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
            Add menu
          </summary>
          <Form method="post" className="mt-3 space-y-3">
            <input type="hidden" name="intent" value="nav-add" />
            <input type="hidden" name="returnPageId" value={pageId} />

            <div className="space-y-1">
              <label htmlFor="new-nav-label" className="text-xs font-medium">
                Menu name
              </label>
              <input
                id="new-nav-label"
                name="label"
                required
                maxLength={MAX_NAV_LABEL_LENGTH}
                placeholder="Kamix"
                className={inputClass}
              />
            </div>

            <fieldset className="space-y-1">
              <legend className="text-xs font-medium">Pages</legend>
              <PageChoices pages={pages} selectedIds={[]} idPrefix="new-nav" />
            </fieldset>

            <Button type="submit" size="sm" disabled={busy}>
              Add menu
            </Button>
          </Form>
        </details>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          You can add up to {MAX_NAV_DROPDOWNS} menus.
        </p>
      )}
    </div>
  )
}
