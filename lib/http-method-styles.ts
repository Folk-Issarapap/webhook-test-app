const METHOD_BADGE: Record<string, string> = {
  GET: "border-sky-500/45 bg-sky-500/12 text-sky-900 dark:text-sky-100",
  POST:
    "border-emerald-500/45 bg-emerald-500/14 text-emerald-950 dark:text-emerald-100",
  PUSH:
    "border-emerald-500/45 bg-emerald-500/14 text-emerald-950 dark:text-emerald-100",
  PUT: "border-amber-500/45 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  PATCH:
    "border-violet-500/45 bg-violet-500/12 text-violet-950 dark:text-violet-100",
  DELETE: "border-rose-500/45 bg-rose-500/12 text-rose-950 dark:text-rose-100",
  HEAD: "border-slate-500/40 bg-slate-500/10 text-slate-900 dark:text-slate-200",
  OPTIONS:
    "border-cyan-500/45 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100",
};

/** Left border accent for request cards (subtle). */
const METHOD_ACCENT: Record<string, string> = {
  GET: "border-l-sky-500",
  POST: "border-l-emerald-500",
  PUSH: "border-l-emerald-500",
  PUT: "border-l-amber-500",
  PATCH: "border-l-violet-500",
  DELETE: "border-l-rose-500",
  HEAD: "border-l-slate-500",
  OPTIONS: "border-l-cyan-500",
};

export function getHttpMethodBadgeClass(method: string): string {
  const key = method.trim().toUpperCase();
  return METHOD_BADGE[key] ?? "border-border bg-muted/80 text-foreground";
}

export function getHttpMethodCardAccentClass(method: string): string {
  const key = method.trim().toUpperCase();
  return METHOD_ACCENT[key] ?? "border-l-primary/40";
}
