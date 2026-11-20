import { timingSafeEqual } from "node:crypto"

import type { AuthConfig, AuthDriver } from "../types"

export function verifyPassword(candidate: string, expected: string) {
  if (!expected) return false

  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(candidate)
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

export const passwordDriver: AuthDriver = {
  id: "password",
  kind: "auth",
  label: "Password",
  capabilities: {
    signIn: true,
    register: false,
    link: false,
    mfa: false,
  },
  requirements: {},
  options: [],
  describe: (config: AuthConfig) =>
    config.methods.includes("password")
      ? {
          id: "password",
          driver: "password",
          label: "Password",
          capabilities: {
            signIn: true,
            register: false,
            link: false,
            mfa: false,
          },
          requirements: {},
        }
      : null,
}
