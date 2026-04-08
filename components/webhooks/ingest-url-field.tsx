"use client";

import { cn } from "@/lib/utils";

import { CopyUrlButton } from "./copy-url-button";

type IngestUrlFieldProps = {
  url: string;
  className?: string;
};

/** Splits `/at/{slug}/{token}` for subtle emphasis on capability segment. */
export function IngestUrlField({ url, className }: IngestUrlFieldProps) {
  const i = url.indexOf("/at/");
  const segments =
    i === -1
      ? { prefix: url, slug: null as string | null, secret: null as string | null }
      : (() => {
          const prefix = url.slice(0, i + 4);
          const rest = url.slice(i + 4);
          const slash = rest.indexOf("/");
          if (slash === -1) return { prefix, slug: rest, secret: null };
          return {
            prefix,
            slug: rest.slice(0, slash),
            secret: rest.slice(slash + 1),
          };
        })();

  return (
    <div
      className={cn(
        "bg-background border border-zinc-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        "dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:shadow-none",
        "flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between md:gap-4 md:p-5",
        "transition-[box-shadow,border-color] duration-300 hover:border-zinc-300/80 dark:hover:border-zinc-700/80",
        className,
      )}
    >
      <code className="text-foreground/95 min-w-0 flex-1 font-mono text-[12px] leading-relaxed break-all md:text-[13px]">
        {segments.slug != null ? (
          <>
            <span className="text-zinc-600 dark:text-zinc-400">{segments.prefix}</span>
            <span className="text-zinc-900 dark:text-zinc-100">{segments.slug}</span>
            {segments.secret != null ? (
              <>
                <span className="text-zinc-400 dark:text-zinc-600">/</span>
                <span className="bg-zinc-100/90 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200 rounded px-1 py-0.5">
                  {segments.secret}
                </span>
              </>
            ) : null}
          </>
        ) : (
          url
        )}
      </code>
      <CopyUrlButton url={url} label="Copy" variant="ingest" />
    </div>
  );
}
