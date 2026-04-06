import { WEBHOOK_PUBLIC_PATH_PREFIX } from "@/lib/webhooks/constants";
import type { WebhookRequestRow } from "@/schemas/webhook";

/** Placeholder origin when the deployment URL is unknown (SSR). */
export const MOCK_PUBLIC_BASE_URL = "https://hooks.example.test";

/**
 * Sample rows for demos/tests (Inspect uses D1 when running on Workers).
 * Uses the endpoint’s slug and token in paths so URLs match the real ingest path.
 */
export function buildMockRequestsForEndpoint(ep: {
  id: string;
  publicSlug: string;
  secretToken: string;
}): WebhookRequestRow[] {
  const t = Math.floor(Date.now() / 1000);
  const path = `${WEBHOOK_PUBLIC_PATH_PREFIX}/${ep.publicSlug}/${ep.secretToken}`;
  const hostExample = "hooks.example.test";

  return [
    {
      id: `${ep.id}_mock_1`,
      endpoint_id: ep.id,
      method: "POST",
      path,
      source_note:
        "From IP 157.245.194.142 🇸🇬 at 3 Apr 16:47:01.861",
      headers: JSON.stringify(
        {
          host: hostExample,
          "content-type": "application/json; charset=utf-8",
          "content-length": "428",
          "user-agent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
          "cache-control": "no-cache",
          "accept-encoding": "gzip",
          "stripe-signature": "t=1730000000,v1=sha256_demo_signature_value",
          "x-stripe-client-user-agent": JSON.stringify({
            lang: "node",
            publisher: "stripe",
            version: "14.0.0",
          }),
          "x-forwarded-for": "54.xxx.xxx.xxx",
          "x-forwarded-proto": "https",
          "x-request-id": "req_stripe_demo_7f3a9c",
        },
        null,
        2,
      ),
      body: JSON.stringify(
        {
          id: "evt_demo_1",
          object: "event",
          type: "checkout.session.completed",
          livemode: false,
          data: {
            object: {
              id: "cs_test_demo",
              amount_total: 2499,
              currency: "thb",
            },
          },
        },
        null,
        2,
      ),
      created_at: t - 90,
    },
    {
      id: `${ep.id}_mock_2`,
      endpoint_id: ep.id,
      method: "POST",
      path,
      source_note:
        "From IP 157.245.194.142 🇸🇬 at 3 Apr 16:47:01.861",
      headers: JSON.stringify(
        {
          host: hostExample,
          "content-type": "application/json",
          "content-length": "312",
          "user-agent": "GitHub-Hookshot/1234567",
          "x-github-event": "ping",
          "x-github-delivery": "7d3e9f20-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
          "x-github-hook-id": "42424242",
          "x-hub-signature-256": "sha256=demo_hmac_hex_not_real",
          "x-request-id": "GH:demo:req-001",
          accept: "*/*",
          "x-forwarded-for": "140.xxx.xxx.xxx",
          "x-forwarded-proto": "https",
        },
        null,
        2,
      ),
      body: JSON.stringify(
        {
          zen: "Responsive is better than fast.",
          hook_id: 12345678,
        },
        null,
        2,
      ),
      created_at: t - 3600,
    },
    {
      id: `${ep.id}_mock_3`,
      endpoint_id: ep.id,
      method: "GET",
      path: `${path}?challenge=health_check&ts=${t - 7200}`,
      source_note:
        "From IP 157.245.194.142 🇸🇬 at 3 Apr 16:47:01.861",
      headers: JSON.stringify(
        {
          host: hostExample,
          accept: "*/*",
          "user-agent": "curl/8.5.0 (Windows) libcurl/8.5.0",
          "accept-encoding": "gzip, deflate, br",
          via: "1.1 proxy.internal (optional)",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-forwarded-proto": "https",
          "x-real-ip": "203.0.113.10",
        },
        null,
        2,
      ),
      body: null,
      created_at: t - 7200,
    },
  ];
}
