import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "~/components/ui/button"

function toggleTheme() {
  const root = document.documentElement
  const next = root.classList.contains("dark") ? "light" : "dark"
  root.classList.remove("light", "dark")
  root.classList.add(next)
  try {
    localStorage.setItem("theme", next)
  } catch {
    // Blocked storage should not stop the switch for this page.
  }
}

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
    >
      <MoonIcon className="size-4 dark:hidden" />
      <SunIcon className="hidden size-4 dark:block" />
    </Button>
  )
}
