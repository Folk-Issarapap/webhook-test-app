import { redirect } from "@/i18n/navigation";

import { buildWorkspaceAppPath } from "@/lib/webhooks/urls";

type PageProps = {
  params: Promise<{
    locale: string;
    publicSlug: string;
    secretToken: string;
  }>;
};

/** Old path — keep short-lived redirect for bookmarks. */
export default async function LegacyEndpointPage({ params }: PageProps) {
  const { locale, publicSlug, secretToken } = await params;
  redirect({
    href: buildWorkspaceAppPath(
      decodeURIComponent(publicSlug),
      decodeURIComponent(secretToken),
    ),
    locale,
  });
}
