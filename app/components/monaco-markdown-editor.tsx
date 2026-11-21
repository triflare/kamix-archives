import { useEffect, useRef, useState } from "react"

import type { editor } from "monaco-editor"

const MAX_CHANGELOG_LENGTH = 20_000

const fallbackTextareaClass =
  "w-full rounded-xl border border-input bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function MonacoMarkdownEditor({
  value,
  onChange,
  name = "changelog",
}: {
  value: string
  onChange: (value: string) => void
  name?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    let disposed = false
    let subscription: { dispose: () => void } | undefined
    let observer: MutationObserver | undefined
    let editorInstance: editor.IStandaloneCodeEditor | undefined

    async function setup() {
      try {
        const [monaco, EditorWorker] = await Promise.all([
          import("monaco-editor"),
          import("monaco-editor/editor/editor.worker?worker"),
        ])

        if (disposed || !containerRef.current) return

        ;(
          self as typeof self & {
            MonacoEnvironment?: { getWorker: () => Worker }
          }
        ).MonacoEnvironment = {
          getWorker: () => new EditorWorker.default(),
        }

        editorInstance = monaco.editor.create(containerRef.current, {
          value: valueRef.current,
          language: "markdown",
          theme: document.documentElement.classList.contains("dark")
            ? "vs-dark"
            : "vs",
          ariaLabel: "Changelog editor",
          automaticLayout: true,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          wordWrap: "on",
          wrappingIndent: "indent",
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: "line",
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          tabSize: 2,
          insertSpaces: true,
          fixedOverflowWidgets: true,
        })

        editorRef.current = editorInstance
        subscription = editorInstance.onDidChangeModelContent(() => {
          const next = editorInstance!.getValue()
          if (next.length > MAX_CHANGELOG_LENGTH) {
            editorInstance!.setValue(next.slice(0, MAX_CHANGELOG_LENGTH))
            return
          }
          onChangeRef.current(next)
        })

        const applyTheme = () => {
          monaco.editor.setTheme(
            document.documentElement.classList.contains("dark")
              ? "vs-dark"
              : "vs"
          )
        }
        applyTheme()
        observer = new MutationObserver(applyTheme)
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        })

        if (!disposed) setStatus("ready")
      } catch (cause) {
        console.error("Failed to load the Monaco editor", cause)
        if (!disposed) setStatus("error")
      }
    }

    void setup()

    return () => {
      disposed = true
      subscription?.dispose()
      observer?.disconnect()
      editorInstance?.dispose()
      editorRef.current = null
    }
  }, [])

  useEffect(() => {
    const editorInstance = editorRef.current
    if (editorInstance && editorInstance.getValue() !== value) {
      editorInstance.setValue(value)
    }
  }, [value])

  return (
    <div className="min-w-0 space-y-1.5" aria-busy={status === "loading"}>
      <input type="hidden" name={name} value={value} readOnly />

      {status === "error" ? (
        <>
          <textarea
            value={value}
            onChange={(event) =>
              onChange(event.target.value.slice(0, MAX_CHANGELOG_LENGTH))
            }
            rows={22}
            spellCheck
            aria-label="Changelog editor, plain text"
            className={fallbackTextareaClass}
          />
          <p role="alert" className="text-xs text-destructive">
            We couldn't load the rich editor, so you can keep writing in plain
            text.
          </p>
        </>
      ) : (
        <div className="relative min-w-0 overflow-hidden rounded-xl border bg-background">
          <div ref={containerRef} className="h-[32rem] w-full" />
          {status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 text-sm text-muted-foreground">
              Loading editor…
            </div>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Markdown · {value.length.toLocaleString()} /{" "}
        {MAX_CHANGELOG_LENGTH.toLocaleString()} characters
      </p>
    </div>
  )
}
