import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

type SiteFooterProps = {
  /** Tighter padding for full-viewport app layouts. */
  compact?: boolean;
};

export async function SiteFooter({ compact }: SiteFooterProps) {
  const t = await getTranslations("site");

  return (
    <footer
      className={cn(
        "border-border/70 shrink-0 border-t",
        compact ? "bg-background/80" : "",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-3xl px-4 text-center",
          compact ? "py-6 md:px-6" : "py-8 md:px-6 md:py-10",
        )}
      >
        <p
          className={cn(
            "text-muted-foreground mx-auto max-w-xl leading-relaxed text-pretty",
            compact ? "text-[11px] md:text-xs" : "text-xs md:text-sm",
          )}
        >
          <span className="text-foreground font-semibold">{t("title")}</span>{" "}
          {t("footerTagline")}
        </p>
      </div>
    </footer>
  );
}
