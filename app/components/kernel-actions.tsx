import { useEffect, useRef, useState } from "react"
import { Form, Link, useNavigation } from "react-router"
import {
  ArrowRightLeftIcon,
  DownloadIcon,
  EyeOffIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  UploadIcon,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

type ActionKind = "publish" | "unpublish" | "move"

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function KernelActions({
  kernel,
  pageId,
  otherPages,
  busy,
  error,
}: {
  kernel: {
    id: string
    version: string
    publishedAt: string | null
    changelog: string
  }
  pageId: string
  otherPages: { id: string; name: string }[]
  busy: boolean
  error?: string
}) {
  const [action, setAction] = useState<ActionKind | null>(null)
  const navigation = useNavigation()
  const submitted = useRef<ActionKind | null>(null)
  const published = kernel.publishedAt !== null

  // A successful action redirects back to the same row, so the component and
  // its dialog state survive. Close only the dialog that was submitted once
  // that request settles without an error; keep it open on failure.
  useEffect(() => {
    const submittedAction = submitted.current
    if (!submittedAction || navigation.state !== "idle") return
    submitted.current = null
    if (!error) {
      setAction((current) => (current === submittedAction ? null : current))
    }
  }, [navigation.state, error])

  const title =
    action === "publish"
      ? `Publish ${kernel.version}?`
      : action === "unpublish"
        ? `Unpublish ${kernel.version}?`
        : action === "move"
          ? `Move ${kernel.version}?`
          : ""

  const description =
    action === "publish"
      ? "This release will be visible on the public page."
      : action === "unpublish"
        ? "This release will be hidden from the public page and saved as a draft."
        : action === "move"
          ? "Choose where this release should appear. A release can only be on one page."
          : ""

  const confirmLabel =
    action === "publish"
      ? "Publish release"
      : action === "unpublish"
        ? "Unpublish release"
        : "Move release"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${kernel.version}`}
              disabled={busy}
            />
          }
        >
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={<Link to={`/admin/changelogs/${kernel.id}`} />}
          >
            <FileTextIcon />
            {kernel.changelog ? "Edit changelog" : "Add changelog"}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={`/downloads/${kernel.id}/file`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <DownloadIcon />
            {published ? "Download package" : "Download draft"}
          </DropdownMenuItem>

          {otherPages.length > 0 ? (
            <DropdownMenuItem onClick={() => setAction("move")}>
              <ArrowRightLeftIcon />
              Move to another page…
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          {published ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setAction("unpublish")}
            >
              <EyeOffIcon />
              Unpublish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setAction("publish")}>
              <UploadIcon />
              Publish
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <Form
            method="post"
            className="mt-5 space-y-4"
            onSubmit={() => {
              submitted.current = action
            }}
          >
            <input type="hidden" name="intent" value={action ?? ""} />
            <input type="hidden" name="id" value={kernel.id} />

            {action === "move" ? (
              <div className="space-y-2">
                <label
                  htmlFor={`move-page-${kernel.id}`}
                  className="text-sm font-medium"
                >
                  Page
                </label>
                <select
                  id={`move-page-${kernel.id}`}
                  name="pageId"
                  required
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="" disabled>
                    Choose a page
                  </option>
                  {otherPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="pageId" value={pageId} />
            )}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button
                type="submit"
                variant={action === "unpublish" ? "destructive" : "default"}
                disabled={busy}
              >
                {busy ? "Saving…" : confirmLabel}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
