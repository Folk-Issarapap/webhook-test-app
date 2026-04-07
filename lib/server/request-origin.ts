/**
 * Public origin for the current request (e.g. webhook ingest URLs).
 * Works behind proxies when `x-forwarded-*` headers are set.
 */
export function resolveRequestOrigin(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
