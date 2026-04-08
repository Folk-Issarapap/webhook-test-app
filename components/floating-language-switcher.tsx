"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";

export function FloatingLanguageSwitcher() {
  const t = useTranslations("language");
  const params = useParams();
  const locale =
    typeof params.locale === "string" ? params.locale : routing.defaultLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="border-border/60 bg-background/70 fixed top-4 right-14 z-50 size-9 rounded-full border backdrop-blur-sm"
          aria-label={t("label")}
        >
          <Languages className="size-4.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) => {
            const segments = pathname.split("/").filter(Boolean);
            if (segments.length === 0) {
              router.replace(`/${next}`);
              return;
            }
            segments[0] = next;
            router.replace(`/${segments.join("/")}`);
          }}
        >
          {routing.locales.map((loc) => (
            <DropdownMenuRadioItem key={loc} value={loc}>
              {loc === "en" ? t("en") : t("th")}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
