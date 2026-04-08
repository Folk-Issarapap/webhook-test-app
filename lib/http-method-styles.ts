/** Single neutral style — HTTP method still readable via mono + weight. */
const NEUTRAL_BADGE =
  "border-border/80 bg-muted/70 text-foreground dark:bg-muted/50";

const METHOD_BADGE: Record<string, string> = {
  GET: NEUTRAL_BADGE,
  POST: NEUTRAL_BADGE,
  PUSH: NEUTRAL_BADGE,
  PUT: NEUTRAL_BADGE,
  PATCH: NEUTRAL_BADGE,
  DELETE: NEUTRAL_BADGE,
  HEAD: NEUTRAL_BADGE,
  OPTIONS: NEUTRAL_BADGE,
};

/** Left border: one subtle accent for all methods (scannable list, not rainbow). */
const METHOD_ACCENT: Record<string, string> = {
  GET: "border-l-primary/55",
  POST: "border-l-primary/55",
  PUSH: "border-l-primary/55",
  PUT: "border-l-primary/55",
  PATCH: "border-l-primary/55",
  DELETE: "border-l-primary/55",
  HEAD: "border-l-primary/55",
  OPTIONS: "border-l-primary/55",
};

export function getHttpMethodBadgeClass(method: string): string {
  const key = method.trim().toUpperCase();
  return METHOD_BADGE[key] ?? NEUTRAL_BADGE;
}

export function getHttpMethodCardAccentClass(method: string): string {
  const key = method.trim().toUpperCase();
  return METHOD_ACCENT[key] ?? "border-l-primary/40";
}
