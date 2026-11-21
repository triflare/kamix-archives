import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

import { loadProduct } from "./app/lib/product.server.ts"

export default defineConfig({
  // product.yml is parsed once here and inlined into the bundle, so the app
  // reads its identity from `~/lib/product` without a loader or a fetch.
  define: {
    __PRODUCT__: JSON.stringify(loadProduct()),
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), reactRouter()],
})
