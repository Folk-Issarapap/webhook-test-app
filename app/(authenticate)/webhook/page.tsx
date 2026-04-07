import { headers } from "next/headers";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { resolveRequestOrigin } from "@/lib/server/request-origin";

export default async function WebhookDashboardPage() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return <WebhookWorkspace origin={origin} />;
}
