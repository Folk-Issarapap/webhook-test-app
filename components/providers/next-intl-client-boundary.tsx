"use client";

import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

/** Ensures `NextIntlClientProvider` is a clear client boundary (helps Vinext / split RSC bundles). */
export function NextIntlClientBoundary({
  locale,
  messages,
  children,
}: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
