import { oidcDriver } from "./drivers/oidc.server"
import { passwordDriver } from "./drivers/password.server"
import type {
  AuthConfig,
  AuthDriver,
  AuthDriverId,
  AuthMethodSummary,
} from "./types"

const DRIVERS = new Map<AuthDriverId, AuthDriver>([
  ["password", passwordDriver],
  ["oidc", oidcDriver],
])

export function getAuthDriver(id: string): AuthDriver | null {
  return DRIVERS.get(id as AuthDriverId) ?? null
}

export function authDriverSummaries(config: AuthConfig): AuthMethodSummary[] {
  return config.methods
    .map((id) => getAuthDriver(id)?.describe(config))
    .filter((method): method is AuthMethodSummary => Boolean(method))
}
