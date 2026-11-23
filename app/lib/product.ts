export interface HeroData {
  image: string
  heading: string
  body: string
}

export interface PageData {
  name: string
  subheading: string
  metaDescription?: string
  hero?: HeroData
}

interface PageInput {
  name?: string
  subheading?: string
  metaDescription?: string
  hero?: Partial<HeroData>
}

export interface ProductData {
  name: string
  version: string
  tagline: string
  author?: string
  homepage?: string
  /** Path under public/ to the header mark. SVG or PNG. */
  logo?: string
  pages?: {
    home?: PageInput
  }
}

export interface Product {
  name: string
  version: string
  tagline: string
  author?: string
  homepage?: string
  logo: string
  pages: {
    home: PageData & { hero: HeroData }
  }
}

// Replaced at build time with the parsed contents of product.yml; see
// vite.config.ts. Components can read it directly instead of threading it
// through a loader.
declare const __PRODUCT__: ProductData

const data: ProductData = __PRODUCT__

const fallbackHero: HeroData = {
  image: "/hero.png",
  heading: "Kamix 3 is almost here",
  body: "Kamix 3 enters beta in mid-December 2026. The first public release, v3.0.0, arrives on January 18, 2027—Kamix's first anniversary.",
}

function mergePage(input: PageInput | undefined, fallback: PageData): PageData {
  return {
    name: input?.name?.trim() || fallback.name,
    subheading: input?.subheading ?? fallback.subheading,
    metaDescription: input?.metaDescription?.trim() || fallback.metaDescription,
    hero: fallback.hero
      ? {
          image: input?.hero?.image?.trim() || fallback.hero.image,
          heading: input?.hero?.heading?.trim() || fallback.hero.heading,
          body: input?.hero?.body ?? fallback.hero.body,
        }
      : undefined,
  }
}

const home = mergePage(data.pages?.home, {
  name: "Archive",
  subheading: data.tagline,
  metaDescription: data.tagline,
  hero: fallbackHero,
})

export const product: Product = {
  ...data,
  logo: data.logo?.trim() || "/logo.svg",
  pages: {
    home: { ...home, hero: home.hero ?? fallbackHero },
  },
}

// The favicon needs the right MIME type, which differs between the SVG and PNG
// assets the config accepts.
export function imageMimeType(path: string) {
  const file = path.split(/[?#]/)[0].toLowerCase()
  if (file.endsWith(".png")) return "image/png"
  if (file.endsWith(".svg")) return "image/svg+xml"
  return undefined
}
