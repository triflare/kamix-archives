import { isAdmin } from "./admin.server"
import type { EditablePageField } from "./site.server"
import { updatePageField } from "./site.server"

const EDITABLE_FIELDS = new Set<EditablePageField>([
  "name",
  "subheading",
  "heroHeading",
  "heroBody",
  "bannerHeading",
  "bannerBody",
])

export type PageEditResult = { ok: true } | { error: string }

export async function handlePageTextEdit(
  request: Request
): Promise<PageEditResult> {
  if (!(await isAdmin(request))) {
    return { error: "Sign in to edit this page." }
  }

  const form = await request.formData()
  if (String(form.get("intent") ?? "") !== "page-field") {
    return { error: "Unknown edit action." }
  }

  const field = String(form.get("field") ?? "")
  if (!EDITABLE_FIELDS.has(field as EditablePageField)) {
    return { error: "Unknown text field." }
  }

  const result = updatePageField({
    id: String(form.get("id") ?? ""),
    field: field as EditablePageField,
    value: String(form.get("value") ?? ""),
  })
  if (result.error) return { error: result.error }

  return { ok: true }
}
