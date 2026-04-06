/**
 * Inbound path prefix (same idea as webhook.cool’s `/at/...`).
 * Full URL: `{origin}{WEBHOOK_PUBLIC_PATH_PREFIX}/{publicSlug}/{secretToken}`
 */
export const WEBHOOK_PUBLIC_PATH_PREFIX = "/at" as const;

/** Max captured raw body (bytes) for inbound webhooks. */
export const MAX_INBOUND_BODY_BYTES = 1024 * 1024;

/** Max rows returned in the Inspect UI per poll. */
export const WEBHOOK_REQUEST_LIST_LIMIT = 100;

/** Workspace cookie name (opaque id). */
export const WORKSPACE_COOKIE_NAME = "wt_workspace_id" as const;

/** Max catcher endpoints linked to one workspace (browser sidebar). */
export const MAX_ENDPOINTS_PER_WORKSPACE = 3 as const;
