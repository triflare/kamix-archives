import type { Config } from "@react-router/dev/config"

// Forwarded dev URLs vary by tunnel provider and can change per session, so in
// development any origin is accepted. Production needs no list: server.mjs
// trusts the proxy headers, so the request URL already matches the origin the
// browser sent on every self-hosted domain.
const isDevelopment = process.env.NODE_ENV === "development"

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  allowedActionOrigins: isDevelopment ? ["**"] : [],
} satisfies Config
