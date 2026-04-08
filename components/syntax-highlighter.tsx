"use client";

import { cn } from "@/lib/utils";

interface SyntaxHighlighterProps {
  data: unknown;
  className?: string;
  level?: number;
}

export function SyntaxHighlighter({
  data,
  className,
  level = 0,
}: SyntaxHighlighterProps) {
  const indent = "  ".repeat(level);

  if (typeof data === "string") {
    return <span className="syntax-string">&quot;{data}&quot;</span>;
  }

  if (typeof data === "number") {
    return <span className="syntax-number">{data}</span>;
  }

  if (typeof data === "boolean") {
    return <span className="syntax-boolean">{String(data)}</span>;
  }

  if (data === null) {
    return <span className="syntax-null">null</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span>[]</span>;
    }
    return (
      <span>
        <span>[</span>
        <span className="block">
          {data.map((item, index) => (
            <span key={index} className="block">
              <span className="text-muted-foreground">{indent} </span>
              <SyntaxHighlighter data={item} level={level + 1} />
              {index < data.length - 1 && <span>,</span>}
            </span>
          ))}
        </span>
        <span className="text-muted-foreground">{indent}</span>
        <span>]</span>
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span>{"{}"}</span>;
    }
    return (
      <span>
        <span>{"{"}</span>
        <span className="block">
          {entries.map(([key, value], index) => (
            <span key={key} className="block">
              <span className="text-muted-foreground">{indent} </span>
              <span className="syntax-key font-medium">{key}</span>
              <span className="text-muted-foreground mx-1">:</span>
              <span>
                <SyntaxHighlighter data={value as unknown} level={level + 1} />
              </span>
              {index < entries.length - 1 && <span>,</span>}
            </span>
          ))}
        </span>
        <span className="text-muted-foreground">{indent}</span>
        <span>{"}"}</span>
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

interface HeadersDisplayProps {
  headers: Record<string, string>;
  className?: string;
}

export function HeadersDisplay({ headers, className }: HeadersDisplayProps) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        No headers
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 font-mono text-sm", className)}>
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 items-start py-1">
          <span className="syntax-key font-medium min-w-fit whitespace-nowrap">
            {key}:
          </span>
          <span className="syntax-value break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

interface JsonDisplayProps {
  data: Record<string, unknown> | unknown[];
  className?: string;
}

export function JsonDisplay({ data, className }: JsonDisplayProps) {
  return (
    <pre
      className={cn(
        "font-mono text-sm bg-surface p-4 rounded-lg overflow-auto",
        "border border-border-subtle",
        className,
      )}
    >
      <SyntaxHighlighter data={data} />
    </pre>
  );
}

// Simple inline JSON display without border (for compact layouts)
// Shows flat key-value pairs with syntax highlighting for simple objects
export function SimpleJsonDisplay({
  data,
}: {
  data: Record<string, unknown> | unknown[];
}) {
  // For arrays, use standard SyntaxHighlighter
  if (Array.isArray(data)) {
    return <SyntaxHighlighter data={data} />;
  }

  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <span>{"{}"}</span>;
  }

  // Check if object is simple (no nested objects or arrays)
  const isSimpleObject = entries.every(([, value]) => {
    if (value === null) return true;
    const type = typeof value;
    return type === "string" || type === "number" || type === "boolean";
  });

  // For nested objects, use standard SyntaxHighlighter
  if (!isSimpleObject) {
    return <SyntaxHighlighter data={data} />;
  }

  // For simple flat objects, show as key-value pairs with JSON braces
  return (
    <div className="font-mono text-sm">
      <span className="text-muted-foreground">{"{"}</span>
      <div className="space-y-1 pl-2">
        {entries.map(([key, value], index) => (
          <div key={key} className="flex gap-2 items-start">
            <span className="syntax-key">&quot;{key}&quot;</span>
            <span className="text-muted-foreground">:</span>
            <ValueDisplay value={value} />
            {index < entries.length - 1 && (
              <span className="text-muted-foreground">,</span>
            )}
          </div>
        ))}
      </div>
      <span className="text-muted-foreground">{"}"}</span>
    </div>
  );
}

// Helper to display values with proper syntax highlighting
function ValueDisplay({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="syntax-null">null</span>;
  }

  if (typeof value === "string") {
    return <span className="syntax-string">&quot;{value}&quot;</span>;
  }

  if (typeof value === "number") {
    return <span className="syntax-number">{value}</span>;
  }

  if (typeof value === "boolean") {
    return <span className="syntax-boolean">{String(value)}</span>;
  }

  return <span className="syntax-string">{String(value)}</span>;
}
