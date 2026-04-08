/** Soft zinc pills — readable hierarchy without loud chroma. */
const METHOD_BADGE: Record<string, string> = {
  GET: "border-zinc-200/80 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200",
  POST:
    "border-zinc-300/70 bg-zinc-100/80 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100",
  PUSH:
    "border-zinc-300/70 bg-zinc-100/80 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100",
  PUT: "border-zinc-200/80 bg-zinc-50/90 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/35 dark:text-zinc-200",
  PATCH:
    "border-zinc-200/80 bg-white text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-100",
  DELETE:
    "border-zinc-300/60 bg-zinc-100/60 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-100",
  HEAD: "border-zinc-200/80 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300",
  OPTIONS:
    "border-zinc-200/80 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/35 dark:text-zinc-200",
};

const METHOD_ACCENT: Record<string, string> = {
  GET: "border-l-zinc-400",
  POST: "border-l-blue-500 dark:border-l-blue-400",
  PUSH: "border-l-blue-500 dark:border-l-blue-400",
  PUT: "border-l-zinc-500 dark:border-l-zinc-400",
  PATCH: "border-l-zinc-600 dark:border-l-zinc-400",
  DELETE: "border-l-zinc-700 dark:border-l-zinc-300",
  HEAD: "border-l-zinc-400",
  OPTIONS: "border-l-zinc-500 dark:border-l-zinc-400",
};

export function getHttpMethodBadgeClass(method: string): string {
  const key = method.trim().toUpperCase();
  return (
    METHOD_BADGE[key] ??
    "border-zinc-200 bg-zinc-50 text-foreground dark:border-zinc-700 dark:bg-zinc-900/40"
  );
}

export function getHttpMethodCardAccentClass(method: string): string {
  const key = method.trim().toUpperCase();
  return METHOD_ACCENT[key] ?? "border-l-zinc-400";
}
