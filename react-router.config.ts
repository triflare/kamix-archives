import type { Config } from "@react-router/dev/config"

// Forwarded dev URLs vary by tunnel provider and can change per session. In
// development, skip the action-origin allowlist; production keeps the known
// GitHub and VS Code forwarding domains.
const isDevelopment = process.env.NODE_ENV === "development"

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  allowedActionOrigins: isDevelopment
    ? ["**"]
    : ["*.app.github.dev", "*.githubpreview.dev", "**.devtunnels.ms"],
} satisfies Config
