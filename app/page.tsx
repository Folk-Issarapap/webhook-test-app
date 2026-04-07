import { headers } from "next/headers";
import {
  ArrowDown,
  KeyRound,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { Button } from "@/components/ui/button";
import { APP_DISPLAY_NAME } from "@/lib/site";
import { resolveRequestOrigin } from "@/lib/server/request-origin";
import { ICON_WELL_THEMES } from "@/lib/ui/icon-well-themes";
import { cn } from "@/lib/utils";

/** Hero badge — fuchsia sparkle */
const sparklesTheme = ICON_WELL_THEMES[6]!;
/** Feature cards: sky → violet → emerald */
const highlightThemes = [
  ICON_WELL_THEMES[0],
  ICON_WELL_THEMES[1],
  ICON_WELL_THEMES[2],
] as const;

const highlights = [
  {
    icon: Zap,
    title: "Plain or secret URL",
    description:
      "Each endpoint has a public slug plus a secret token in the path—fine for providers that expect a signed-looking URL.",
  },
  {
    icon: Radio,
    title: "Live request log",
    description:
      "See method, path, headers, and body as requests arrive. Expand a row to copy JSON or raw text.",
  },
  {
    icon: ShieldCheck,
    title: "No login",
    description:
      "Open the site and start testing. Your workspace is tied to this browser session-bookmark the page to return.",
  },
] as const;

export default async function Home() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 md:px-6 md:pt-16 md:pb-10">
        <header className="text-center md:text-left">
          <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
            <div className="border-border inline-flex items-center gap-2.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  sparklesTheme.well,
                )}
                aria-hidden
              >
                <Sparkles className={cn("size-3.5", sparklesTheme.icon)} />
              </span>
              <span className="text-muted-foreground">
                Public tool · No sign-up
              </span>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <a href="#workspace" className="gap-2 font-medium">
                Jump to workspace
                <ArrowDown
                  className="text-muted-foreground size-3.5"
                  aria-hidden
                />
              </a>
            </Button>
          </div>

          <div className="mx-auto max-w-3xl space-y-5 md:mx-0">
            <p className="text-muted-foreground font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
              {APP_DISPLAY_NAME}
            </p>
            <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.65rem] md:leading-[1.12]">
              Test webhooks in your browser-fast, clear, and ready for customers
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-pretty text-base leading-relaxed md:mx-0 md:text-lg">
              Paste your ingest URL into your payment provider, GitHub, or curl.
              We record the HTTP request so you can verify payloads, headers,
              and signatures-whether the endpoint is a simple path or includes a
              secret token.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Copy ingest URL",
                body: "Pick an endpoint below and copy its ingest URL (secret is already in the path).",
              },
              {
                step: "2",
                title: "Trigger an event",
                body: "Use your dashboard, CLI, or our Send test tab to hit the URL.",
              },
              {
                step: "3",
                title: "Inspect & debug",
                body: "Open incoming requests, read headers and body, copy JSON.",
              },
            ].map(({ step, title, body }) => (
              <li
                key={step}
                className="border-border relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm"
              >
                <span className="text-muted-foreground/25 font-heading absolute right-1 -top-0.5 text-5xl font-bold tabular-nums select-none">
                  {step}
                </span>
                <p className="text-foreground font-semibold tracking-tight">
                  {title}
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </header>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }, i) => {
            const th = highlightThemes[i]!;
            return (
              <li
                key={title}
                className="border-border flex gap-4 rounded-2xl border bg-card p-5 shadow-sm"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    th.well,
                  )}
                >
                  <Icon className={cn("size-5", th.icon)} aria-hidden />
                </span>
                <div className="min-w-0 space-y-1.5">
                  <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                    {title}
                    {title.includes("secret") ? (
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
            );
          })}
        </ul>
      </div>

      <div
        id="workspace"
        className="border-border scroll-mt-8 border-t bg-background py-10 md:py-14"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8 md:mb-10">
            <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
              Your workspace
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
              Follow the three steps in the panel—pick an endpoint, copy the URL
              into your provider, then inspect traffic or send a test from here.
            </p>
          </div>

          <WebhookWorkspace
            origin={origin}
            routeBasePath="/"
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
}
