import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-8 mb-3 font-heading text-3xl tracking-tight">
      {children}
    </h2>
  ),
  // Footnotes rely on the heading's id and accessibility attributes, so
  // rendered headings and links forward the generated attributes.
  h2: ({ children, node: _node, ...props }) => (
    <h3 {...props} className="mt-7 mb-3 font-heading text-2xl tracking-tight">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 mb-2 font-heading text-xl tracking-tight">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className="mt-5 mb-2 text-sm font-semibold tracking-wide uppercase">
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-relaxed text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children, node: _node, ...props }) => (
    <li {...props} className="pl-1 leading-relaxed">
      {children}
    </li>
  ),
  a: ({ children, node: _node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-border pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const block = className?.includes("language-")
    return (
      <code
        className={
          block
            ? "font-mono text-xs"
            : "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        }
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl border bg-muted/50 p-4 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 align-top">{children}</td>
  ),
  hr: () => <hr className="my-6 border-border" />,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-xl border"
    />
  ),
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
