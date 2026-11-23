import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("downloads", "routes/downloads.tsx"),
  route("downloads/:id/file", "routes/download-file.tsx"),
  route("changelogs/:id", "routes/changelog.tsx"),
  route("admin/login/callback", "routes/admin-login-callback.tsx"),
  route("admin/login", "routes/admin-login.tsx"),
  route("admin/changelogs/:id", "routes/admin-changelog.tsx"),
  route("admin/session", "routes/admin-session.tsx"),
  route("admin/auth", "routes/admin-auth.tsx"),
  route("admin", "routes/admin.tsx"),
  route("stay-signed-in", "routes/stay-signed-in.tsx"),
  route(":slug", "routes/site-page.tsx"),
] satisfies RouteConfig
