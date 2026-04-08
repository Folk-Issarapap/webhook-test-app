import type { Metadata } from "next";
import "./globals.css";

import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { APP_DISPLAY_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description:
    "Free public webhook tester: capture HTTP requests, inspect headers and body, and try signed URLs with a secret in the path—no account required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full overflow-hidden antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
        <ThemeProvider>
          <main className="flex h-full min-h-0 flex-col overflow-hidden">
            {children}
          </main>
          <SiteFooter compact />
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
