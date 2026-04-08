"use client";

import { Fragment, useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight JSON token coloring (pastel) — no runtime parse tree, good for webhook bodies.
 */
function highlightJsonLine(line: string, lineKey: number): ReactNode {
  const tokenRe =
    /(\s+)|("(?:\\.|[^"])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|([{}[\],:])/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = tokenRe.exec(line)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`${lineKey}-raw-${key++}`} className="text-zinc-700 dark:text-zinc-300">
          {line.slice(last, m.index)}
        </span>,
      );
    }
    const space = m[1];
    const str = m[2];
    const primitive = m[3];
    const num = m[4];
    const punct = m[5];
    if (space) {
      out.push(space);
    } else if (str) {
      const rest = line.slice(m.index + str.length).trimStart();
      const isKey = rest.startsWith(":");
      out.push(
        <span
          key={`${lineKey}-s-${key++}`}
          className={
            isKey
              ? "text-sky-600/95 dark:text-sky-400/90"
              : "text-emerald-700/90 dark:text-emerald-400/85"
          }
        >
          {str}
        </span>,
      );
    } else if (primitive) {
      out.push(
        <span
          key={`${lineKey}-p-${key++}`}
          className="text-violet-600/90 dark:text-violet-400/85"
        >
          {primitive}
        </span>,
      );
    } else if (num) {
      out.push(
        <span
          key={`${lineKey}-n-${key++}`}
          className="text-amber-700/90 dark:text-amber-400/80"
        >
          {num}
        </span>,
      );
    } else if (punct) {
      out.push(
        <span
          key={`${lineKey}-u-${key++}`}
          className="text-zinc-400 dark:text-zinc-500"
        >
          {punct}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    out.push(
      <span key={`${lineKey}-end`} className="text-zinc-700 dark:text-zinc-300">
        {line.slice(last)}
      </span>,
    );
  }
  return out.length ? out : line;
}

export function JsonHighlight({
  raw,
  className,
}: {
  raw: string | null;
  className?: string;
}) {
  const formatted = useMemo(() => {
    if (!raw || raw === "—") return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }, [raw]);

  if (formatted === null) {
    return <span className="text-zinc-500">—</span>;
  }

  const lines = formatted.split("\n");

  return (
    <pre
      className={cn(
        "font-mono text-[13px] leading-[1.65] tracking-tight whitespace-pre-wrap break-all md:text-[14px] md:leading-[1.7]",
        className,
      )}
    >
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? "\n" : null}
          {highlightJsonLine(line, i)}
        </Fragment>
      ))}
    </pre>
  );
}
