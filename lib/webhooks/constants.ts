/**
 * Inbound path prefix (same idea as webhook.cool’s `/at/...`).
 * Full URL: `{origin}{WEBHOOK_PUBLIC_PATH_PREFIX}/{publicSlug}/{secretToken}`
 */
export const WEBHOOK_PUBLIC_PATH_PREFIX = "/at" as const;
