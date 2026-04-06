import { redirect } from "next/navigation";

import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";

type PageProps = {
  params: Promise<{ publicSlug: string; secretToken: string }>;
};

/** Deep link: imports/selects this catcher via query on the dashboard. */
export default async function WebhookDeepLinkPage({ params }: PageProps) {
  const { publicSlug: rawSlug, secretToken: rawSecret } = await params;
  const publicSlug = decodeURIComponent(rawSlug);
  const secretToken = decodeURIComponent(rawSecret);

  if (!isValidWorkspacePair(publicSlug, secretToken)) {
    redirect("/webhook");
  }

  const q = new URLSearchParams({
    slug: publicSlug,
    token: secretToken,
  });
  redirect(`/webhook?${q.toString()}`);
}
