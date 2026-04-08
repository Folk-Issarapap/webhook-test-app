import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";

import { FloatingLanguageSwitcher } from "@/components/floating-language-switcher";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { NextIntlClientBoundary } from "@/components/providers/next-intl-client-boundary";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { fontMono, fontSansLatin, fontSansThai } from "@/lib/fonts";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-locale={locale}
      className={cn(
        fontSansLatin.variable,
        fontSansThai.variable,
        fontMono.variable,
        "h-full overflow-hidden antialiased",
      )}
      suppressHydrationWarning
    >
      <head>
        {/*
          Vinext / some RSC setups may not emit next/font @font-face reliably.
          Explicit Google Fonts link ensures "Kanit" resolves for Thai (loopless UI).
        */}
        {locale === "th" ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin="anonymous"
            />
            <link
              href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap"
              rel="stylesheet"
            />
          </>
        ) : null}
      </head>
      <body
        className={cn(
          "grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden",
          locale === "th" && fontSansThai.className,
        )}
      >
        <NextIntlClientBoundary locale={locale} messages={messages}>
          <ThemeProvider>
            <main className="flex h-full min-h-0 flex-col overflow-hidden">
              {children}
            </main>
            <SiteFooter compact />
            <FloatingLanguageSwitcher />
            <FloatingThemeToggle />
          </ThemeProvider>
        </NextIntlClientBoundary>
      </body>
    </html>
  );
}
