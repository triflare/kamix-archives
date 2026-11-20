import { isAdmin } from "~/lib/admin.server"

import type { Route } from "./+types/admin-session"

export async function loader({ request }: Route.LoaderArgs) {
  return Response.json(
    { signedIn: await isAdmin(request) },
    { headers: { "cache-control": "no-store" } }
  )
}
