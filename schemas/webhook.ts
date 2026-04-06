/** Row shapes aligned with `migrations/0001_init.sql`. */

export type WebhookEndpointRow = {
  id: string;
  created_at: number;
};

export type WebhookRequestRow = {
  id: string;
  endpoint_id: string;
  method: string;
  path: string;
  headers: string;
  body: string | null;
  created_at: number;
  /** Optional human-readable origin (UI); may map to a DB column later. */
  source_note?: string;
};

/**
 * Public webhook URL shape (webhook.cool–style): only holders of the full path
 * can send traffic to the catcher. See `docs/WEBHOOK-URL-TOKENS.md`.
 *
 * Planned persistence: either encode in `webhook_endpoints.id` or add columns
 * in a follow-up migration (`public_slug`, `secret_token` or hashed secret).
 */
export type WebhookEndpointTokenParts = {
  /** Short, human-readable segment (still unguessable enough for display). */
  publicSlug: string;
  /** Long unguessable segment — capability / ownership. */
  secretToken: string;
};

/** UI + API shape for one catcher before persistence is wired. */
export type WebhookEndpointDisplay = WebhookEndpointRow &
  WebhookEndpointTokenParts & {
    /** Optional label in the workspace list. */
    label: string;
  };
