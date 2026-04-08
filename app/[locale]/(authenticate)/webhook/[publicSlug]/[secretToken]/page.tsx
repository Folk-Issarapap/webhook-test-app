import { redirect } from "@/i18n/navigation";

import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";

type PageProps = {
  params: Promise<{
    locale: string;
    publicSlug: string;
    secretToken: string;
  }>;
};

/** Deep link: imports/selects this catcher via query on the dashboard. */
export default async function WebhookDeepLinkPage({ params }: PageProps) {
  const {
    locale,
    publicSlug: rawSlug,
    secretToken: rawSecret,
  } = await params;
  const publicSlug = decodeURIComponent(rawSlug);
  const secretToken = decodeURIComponent(rawSecret);

  if (!isValidWorkspacePair(publicSlug, secretToken)) {
    redirect({ href: "/", locale });
  }

  const q = new URLSearchParams({
    slug: publicSlug,
    token: secretToken,
  });
  redirect({ href: `/?${q.toString()}`, locale });
}
