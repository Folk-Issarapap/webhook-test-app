import { headers } from "next/headers";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { resolveRequestOrigin } from "@/lib/server/request-origin";

export default async function WebhookDashboardPage() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-10 md:py-16">
        <WebhookWorkspace origin={origin} routeBasePath="/webhook" />
      </div>
    </div>
  );
}
