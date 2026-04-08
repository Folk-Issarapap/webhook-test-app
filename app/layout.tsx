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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
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
