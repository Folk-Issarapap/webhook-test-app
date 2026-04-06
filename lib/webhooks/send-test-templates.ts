/** Preset headers (JSON object as string) and bodies for the Send test panel. */

export type TemplateOption = {
  id: string;
  label: string;
  value: string;
};

export const SEND_TEST_HEADER_TEMPLATES: TemplateOption[] = [
  {
    id: "json",
    label: "JSON (default)",
    value: `{
  "Content-Type": "application/json"
}`,
  },
  {
    id: "stripe",
    label: "Stripe-style",
    value: `{
  "Content-Type": "application/json",
  "User-Agent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
  "Stripe-Signature": "t=1234567890,v1=demo"
}`,
  },
  {
    id: "github",
    label: "GitHub-style",
    value: `{
  "Content-Type": "application/json",
  "User-Agent": "GitHub-Hookshot/0000000",
  "X-GitHub-Event": "ping",
  "X-GitHub-Delivery": "00000000-0000-0000-0000-000000000000"
}`,
  },
  {
    id: "form",
    label: "Form URL-encoded",
    value: `{
  "Content-Type": "application/x-www-form-urlencoded"
}`,
  },
  {
    id: "minimal",
    label: "No extra headers",
    value: `{}`,
  },
];

export const SEND_TEST_BODY_TEMPLATES: TemplateOption[] = [
  {
    id: "hello",
    label: "Simple JSON",
    value: `{
  "hello": "world"
}`,
  },
  {
    id: "stripe_event",
    label: "Stripe event (sample)",
    value: `{
  "id": "evt_test_123",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "amount_total": 1000,
      "currency": "usd"
    }
  }
}`,
  },
  {
    id: "github_ping",
    label: "GitHub ping",
    value: `{
  "zen": "Responsive is better than fast.",
  "hook_id": 12345678
}`,
  },
  {
    id: "slack",
    label: "Slack-style payload",
    value: `{
  "token": "test",
  "team_id": "T00000000",
  "event": {
    "type": "message",
    "user": "U00000000",
    "text": "Hello"
  }
}`,
  },
  {
    id: "empty_json",
    label: "Empty object",
    value: `{}`,
  },
];

export function getHeaderTemplateById(id: string): string | undefined {
  return SEND_TEST_HEADER_TEMPLATES.find((t) => t.id === id)?.value;
}

export function getBodyTemplateById(id: string): string | undefined {
  return SEND_TEST_BODY_TEMPLATES.find((t) => t.id === id)?.value;
}
