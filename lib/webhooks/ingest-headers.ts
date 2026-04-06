/** Hop-by-hop and sensitive headers to omit from stored webhook metadata. */
const DENYLIST = new Set(
  [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "cf-connecting-ip",
    "cf-ray",
    "cf-visitor",
  ].map((h) => h.toLowerCase()),
);

export function headersObjectFromRequest(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (DENYLIST.has(k)) return;
    out[key] = value;
  });
  return out;
}
