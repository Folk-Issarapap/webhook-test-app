"use client";

import { KeyRound, Radio, ShieldCheck, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const HIGHLIGHT_ICONS = [Zap, Radio, ShieldCheck] as const;

/** Empty-state onboarding for Traffic when there are no captured requests yet. */
export function WorkspaceTrafficGuide() {
  const t = useTranslations("trafficGuide");

  const items = [
    {
      icon: HIGHLIGHT_ICONS[0],
      title: t("highlight1Title"),
      description: t("highlight1Desc"),
    },
    {
      icon: HIGHLIGHT_ICONS[1],
      title: t("highlight2Title"),
      description: t("highlight2Desc"),
    },
    {
      icon: HIGHLIGHT_ICONS[2],
      title: t("highlight3Title"),
      description: t("highlight3Desc"),
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-2 py-4 text-center md:py-6">
      <p className="text-muted-foreground text-sm">{t("badge")}</p>
      <h2 className="font-heading text-foreground mt-4 text-balance text-2xl font-semibold tracking-tight md:text-[1.65rem] md:leading-snug">
        {t("title")}
      </h2>
      <p className="text-muted-foreground mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed md:text-[0.95rem]">
        {t("intro")}
      </p>

      <ul className="border-border/60 mt-10 w-full space-y-0 divide-y divide-border/70 border-y text-left">
        {items.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="flex gap-3 py-4 first:pt-5 last:pb-5">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                "bg-muted/70 text-foreground/85 ring-1 ring-border/50",
              )}
            >
              <Icon className="size-[1.05rem]" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                {title}
                {index === 0 ? (
                  <KeyRound
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-hidden
                  />
                ) : null}
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
