"use client";

import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { routing } from "@/i18n/routing";

/** Legacy entry: forwards to the main dashboard. */
export default function WebhooksEntryPage() {
  const router = useRouter();
  const params = useParams();
  const locale =
    typeof params.locale === "string" ? params.locale : routing.defaultLocale;
  const t = useTranslations("webhooksEntry");

  useEffect(() => {
    router.replace(`/${locale}`);
  }, [router, locale]);

  return (
    <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center p-6 text-sm">
      {t("redirecting")}
    </div>
  );
}
