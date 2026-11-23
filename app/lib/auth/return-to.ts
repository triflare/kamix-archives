export function safeAdminReturnTo(value: string | null | undefined) {
  if (!value || !/^\/admin(?:\/|\?|$)/.test(value) || value.startsWith("//")) {
    return "/admin"
  }
  return value
}
