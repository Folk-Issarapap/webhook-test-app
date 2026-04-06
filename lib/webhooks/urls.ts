import { WEBHOOK_PUBLIC_PATH_PREFIX } from "@/lib/webhooks/constants";

/** App route to inspect this catcher: `/webhook/{publicSlug}/{secretToken}` */
export function buildWorkspaceAppPath(
  publicSlug: string,
  secretToken: string,
): string {
  return `/webhook/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}

/** Inbound webhook URL (HTTP handlers will listen here later). */
export function buildIngestUrl(
  origin: string,
  publicSlug: string,
  secretToken: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${WEBHOOK_PUBLIC_PATH_PREFIX}/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}
