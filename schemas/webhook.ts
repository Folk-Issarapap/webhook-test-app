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
};
