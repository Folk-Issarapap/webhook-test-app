import { headers } from "next/headers";
import { Suspense } from "react";

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

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center p-8 text-sm">
          Loading…
        </div>
      }
    >
      <WebhookWorkspace origin={origin} />
    </Suspense>
  );
}
