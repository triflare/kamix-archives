import { EditableText } from "~/components/editable-text"
import type { HeroData } from "~/lib/product"

export function Hero({
  hero,
  pageId,
  canEdit = false,
}: {
  hero: HeroData
  pageId?: string
  canEdit?: boolean
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border bg-card">
      <div className="relative z-10 flex flex-col justify-center gap-4 p-8 md:px-12 md:py-14 lg:min-h-[340px] lg:max-w-[46%]">
        {pageId ? (
          <EditableText
            pageId={pageId}
            field="heroHeading"
            value={hero.heading}
            label="hero heading"
            as="h2"
            canEdit={canEdit}
            className="font-heading text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl"
          />
        ) : (
          <h2 className="font-heading text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl">
            {hero.heading}
          </h2>
        )}
        {hero.body || (pageId && canEdit) ? (
          pageId ? (
            <EditableText
              pageId={pageId}
              field="heroBody"
              value={hero.body}
              label="hero text"
              multiline
              as="p"
              canEdit={canEdit}
              emptyLabel="Add hero text"
              className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-muted-foreground sm:text-base"
            />
          ) : (
            <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-muted-foreground sm:text-base">
              {hero.body}
            </p>
          )
        ) : null}
      </div>

      <img
        src={hero.image}
        alt=""
        aria-hidden="true"
        className="hero-image aspect-video w-full object-cover lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-auto lg:max-w-none"
      />
    </section>
  )
}
