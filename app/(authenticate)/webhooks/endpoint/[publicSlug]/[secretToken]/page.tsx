import { redirect } from "next/navigation";

import { buildWorkspaceAppPath } from "@/lib/webhooks/urls";

type PageProps = {
  params: Promise<{ publicSlug: string; secretToken: string }>;
};

/** Old path — keep short-lived redirect for bookmarks. */
export default async function LegacyEndpointPage({ params }: PageProps) {
  const { publicSlug, secretToken } = await params;
  redirect(buildWorkspaceAppPath(decodeURIComponent(publicSlug), decodeURIComponent(secretToken)));
}
