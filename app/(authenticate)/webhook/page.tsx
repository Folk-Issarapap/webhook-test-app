import { headers } from "next/headers";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";

function resolveOrigin(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function WebhookDashboardPage() {
  const h = await headers();
  const origin = resolveOrigin(h);

  return <WebhookWorkspace origin={origin} />;
}
