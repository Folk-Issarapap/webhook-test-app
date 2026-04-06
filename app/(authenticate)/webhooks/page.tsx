"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy entry: forwards to the main dashboard. */
export default function WebhooksEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/webhook");
  }, [router]);

  return (
    <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center p-6 text-sm">
      Redirecting to workspace…
    </div>
  );
}
