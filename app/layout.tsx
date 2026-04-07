import type { Metadata } from "next";
import "./globals.css";

import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { APP_DISPLAY_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description:
    "Receive, log, and inspect HTTP webhooks—multiple endpoints, payloads, and request history in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
