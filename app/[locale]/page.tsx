import { headers } from "next/headers";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { resolveRequestOrigin } from "@/lib/server/request-origin";

export default async function Home() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <WebhookWorkspace origin={origin} routeBasePath="/" />
    </div>
  );
}
