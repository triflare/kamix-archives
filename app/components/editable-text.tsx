import { PencilIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"

import { Button } from "~/components/ui/button"
import type { PageEditResult } from "~/lib/page-edit.server"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type EditableField =
  | "name"
  | "subheading"
  | "heroHeading"
  | "heroBody"
  | "bannerHeading"
  | "bannerBody"

const maxLengths: Record<EditableField, number> = {
  name: 80,
  subheading: 500,
  heroHeading: 120,
  heroBody: 2_000,
  bannerHeading: 120,
  bannerBody: 1_000,
}

export function EditableText({
  pageId,
  field,
  value,
  label,
  multiline = false,
  as: Tag = "p",
  className = "",
  emptyLabel = "Add text",
  canEdit = false,
}: {
  pageId: string
  field: EditableField
  value: string
  label: string
  multiline?: boolean
  as?: "h1" | "h2" | "p"
  className?: string
  emptyLabel?: string
  canEdit?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const fetcher = useFetcher<PageEditResult>()
  const lastResult = useRef<unknown>(null)
  const pencilRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const maxLength = maxLengths[field]
  const required = field === "name" || field === "heroHeading"
  const error =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null
  const busy = fetcher.state !== "idle"
  const pencilOffsetClass =
    Tag === "h1"
      ? "mt-1 sm:mt-1.5"
      : Tag === "h2"
        ? "mt-0.5 sm:mt-1"
        : "-mt-0.5"

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return
    if (lastResult.current === fetcher.data) return
    lastResult.current = fetcher.data
    if ("ok" in fetcher.data) setEditing(false)
  }, [fetcher.state, fetcher.data])

  // Return focus to the pencil when editing ends and the editor is gone,
  // but leave it alone if the user moved focus somewhere else.
  useEffect(() => {
    const exited = wasEditing.current && !editing
    wasEditing.current = editing
    if (!exited) return
    if (document.activeElement && document.activeElement !== document.body) {
      return
    }
    pencilRef.current?.focus()
  }, [editing])

  if (!canEdit) {
    return value ? <Tag className={className}>{value}</Tag> : null
  }

  if (editing) {
    return (
      <fetcher.Form
        method="post"
        aria-busy={busy}
        className="max-w-2xl space-y-2 rounded-xl border bg-background p-3 shadow-sm"
      >
        <input type="hidden" name="intent" value="page-field" />
        <input type="hidden" name="id" value={pageId} />
        <input type="hidden" name="field" value={field} />
        {multiline ? (
          <textarea
            name="value"
            defaultValue={value}
            rows={3}
            maxLength={maxLength}
            aria-label={label}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setEditing(false)
            }}
            className={textareaClass}
          />
        ) : (
          <input
            name="value"
            defaultValue={value}
            required={required}
            maxLength={maxLength}
            aria-label={label}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setEditing(false)
            }}
            className={inputClass}
          />
        )}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </fetcher.Form>
    )
  }

  return (
    <div className="group flex items-start gap-2">
      <Tag className={className}>
        {value || (
          <span className="text-muted-foreground italic">{emptyLabel}</span>
        )}
      </Tag>
      <button
        ref={pencilRef}
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${label}`}
        title={`Edit ${label}`}
        className={`${pencilOffsetClass} inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground opacity-60 transition-colors hover:border-border hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}
      >
        <PencilIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
