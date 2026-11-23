export type AuthDriverId = "password" | "oidc"

export interface AuthDriverCapabilities {
  signIn: boolean
  register: boolean
  link: boolean
  mfa: boolean
}

export interface AuthDriverOption {
  key: string
  label: string
  type: "text" | "url" | "secret" | "number" | "boolean"
  required?: boolean
  secret?: boolean
}

export interface AuthMethodSummary {
  id: AuthDriverId
  driver: AuthDriverId
  label: string
  capabilities: AuthDriverCapabilities
  requirements: Record<string, boolean>
}

export interface AuthDriver {
  id: AuthDriverId
  kind: "auth"
  label: string
  capabilities: AuthDriverCapabilities
  requirements: Record<string, boolean>
  options: AuthDriverOption[]
  describe: (config: AuthConfig) => AuthMethodSummary | null
}

export interface OidcConfig {
  issuer: string | null
  clientId: string | null
  clientSecret: string | null
  redirectUri: string | null
  scopes: string
  allowedEmails: Set<string>
  allowedSubjects: Set<string>
}

export interface AuthConfig {
  methods: AuthDriverId[]
  errors: string[]
  password: string
  oidc: OidcConfig
}
