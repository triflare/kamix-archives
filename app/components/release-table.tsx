import { useState } from "react"

import { Button, buttonVariants } from "~/components/ui/button"
import {
  formatBytes,
  formatDate,
  isPrerelease,
  type PublishedKernel,
} from "~/lib/kernels"

export function ReleaseTable({
  kernels,
  emptyMessage = "No releases have been published yet.",
}: {
  kernels: PublishedKernel[]
  emptyMessage?: string
}) {
  const [showPrereleases, setShowPrereleases] = useState(false)
  const stable = kernels.filter((kernel) => !isPrerelease(kernel.version))
  const prereleases = kernels.filter((kernel) => isPrerelease(kernel.version))
  const visible = showPrereleases ? kernels : stable

  if (kernels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {showPrereleases
            ? "All releases, newest version first."
            : "Stable releases, newest version first. Pre-release builds are hidden."}
        </p>
        {prereleases.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={showPrereleases}
            onClick={() => setShowPrereleases((current) => !current)}
          >
            {showPrereleases
              ? "Hide pre-releases"
              : `Show pre-releases (${prereleases.length})`}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No stable releases yet. Show pre-releases to see preview builds.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">
              Published releases, newest version first
            </caption>
            <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Changelog</th>
                <th className="px-4 py-3 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((kernel) => (
                <tr
                  key={kernel.id}
                  className="border-b align-top last:border-0"
                >
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{kernel.version}</span>
                      {isPrerelease(kernel.version) ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                          Pre-release
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(kernel.publishedAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                    {formatBytes(kernel.size)}
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    {kernel.changelog ? (
                      <a
                        href={`/changelogs/${kernel.id}`}
                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        View changelog
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <a
                      href={`/downloads/${kernel.id}/file`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Download
                    </a>
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
