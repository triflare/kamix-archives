import { EditableText } from "~/components/editable-text"

export function PageHeader({
  name,
  subheading,
  pageId,
  canEdit = false,
}: {
  name: string
  subheading?: string
  pageId?: string
  canEdit?: boolean
}) {
  return (
    <div className="mb-8 space-y-2">
      {pageId ? (
        <EditableText
          pageId={pageId}
          field="name"
          value={name}
          label="page title"
          as="h1"
          canEdit={canEdit}
          className="font-heading text-3xl tracking-tight text-balance sm:text-4xl"
        />
      ) : (
        <h1 className="font-heading text-3xl tracking-tight text-balance sm:text-4xl">
          {name}
        </h1>
      )}
      {subheading || (pageId && canEdit) ? (
        pageId ? (
          <EditableText
            pageId={pageId}
            field="subheading"
            value={subheading ?? ""}
            label="subheading"
            multiline
            as="p"
            canEdit={canEdit}
            emptyLabel="Add subheading"
            className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
          />
        ) : (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subheading}
          </p>
        )
      ) : null}
    </div>
  )
}
