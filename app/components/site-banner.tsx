import { AlertCircleIcon, AlertTriangleIcon, InfoIcon } from "lucide-react"

import { EditableText } from "~/components/editable-text"
import type { BannerTone, SiteBanner as SiteBannerData } from "~/lib/site"

export const bannerToneStyles: Record<
  BannerTone,
  { container: string; icon: string; title: string; body: string }
> = {
  info: {
    container: "border-primary/20 bg-primary/10",
    icon: "text-primary",
    title: "text-primary",
    body: "text-foreground/80",
  },
  warning: {
    container: "border-amber-500/30 bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-950 dark:text-amber-100",
    body: "text-amber-950/80 dark:text-amber-100/80",
  },
  danger: {
    container: "border-destructive/30 bg-destructive/10",
    icon: "text-destructive",
    title: "text-destructive",
    body: "text-foreground/80",
  },
}

const toneIcons = {
  info: InfoIcon,
  warning: AlertTriangleIcon,
  danger: AlertCircleIcon,
} satisfies Record<BannerTone, typeof InfoIcon>

export function SiteBanner({
  banner,
  pageId,
  canEdit = false,
}: {
  banner: SiteBannerData
  pageId?: string
  canEdit?: boolean
}) {
  const styles = bannerToneStyles[banner.tone]
  const Icon = toneIcons[banner.tone]

  return (
    <aside
      role="note"
      aria-label={banner.heading || "Announcement"}
      className={`mb-6 flex gap-3 rounded-2xl border px-4 py-3 ${styles.container}`}
    >
      <Icon
        className={`mt-0.5 size-5 shrink-0 ${styles.icon}`}
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-1">
        {banner.heading || (pageId && canEdit) ? (
          pageId ? (
            <EditableText
              pageId={pageId}
              field="bannerHeading"
              value={banner.heading}
              label="banner heading"
              as="p"
              canEdit={canEdit}
              emptyLabel="Add banner heading"
              className={`font-semibold ${styles.title}`}
            />
          ) : (
            <p className={`font-semibold ${styles.title}`}>{banner.heading}</p>
          )
        ) : null}
        {banner.body || (pageId && canEdit) ? (
          pageId ? (
            <EditableText
              pageId={pageId}
              field="bannerBody"
              value={banner.body}
              label="banner message"
              multiline
              as="p"
              canEdit={canEdit}
              emptyLabel="Add banner message"
              className={`text-sm leading-relaxed whitespace-pre-line ${styles.body}`}
            />
          ) : (
            <p
              className={`text-sm leading-relaxed whitespace-pre-line ${styles.body}`}
            >
              {banner.body}
            </p>
          )
        ) : null}
      </div>
    </aside>
  )
}
