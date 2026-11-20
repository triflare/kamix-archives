import { useState } from "react"
import { Form, Link } from "react-router"

import { Markdown } from "~/components/markdown"
import { MonacoMarkdownEditor } from "~/components/monaco-markdown-editor"
import { Button, buttonVariants } from "~/components/ui/button"

export function ChangelogForm({
  initialValue,
  cancelHref,
}: {
  initialValue: string
  cancelHref: string
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <Form method="post" className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Changelog</p>
          <MonacoMarkdownEditor value={value} onChange={setValue} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Markdown is supported, including headings, lists, links, tables, and
            code blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Save changelog</Button>
          <Link
            to={cancelHref}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">Preview</p>
        <div className="h-[32rem] overflow-y-auto rounded-2xl border bg-card p-5">
          {value.trim() ? (
            <Markdown content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nothing to preview yet. The public page will show that no
              changelog was added.
            </p>
          )}
        </div>
      </div>
    </Form>
  )
}
