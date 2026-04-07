import { headers } from "next/headers";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { resolveRequestOrigin } from "@/lib/server/request-origin";

export default async function WebhookDashboardPage() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 md:px-6 md:pb-14">
      <WebhookWorkspace origin={origin} />
    </div>
  );
}
