import { headers } from "next/headers";
import { Inbox, Route, Webhook } from "lucide-react";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { Separator } from "@/components/ui/separator";
import { APP_DISPLAY_NAME } from "@/lib/site";
import { resolveRequestOrigin } from "@/lib/server/request-origin";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Route,
    title: "Copy URL",
    description: "Grab the catcher URL from the panel below.",
    iconWrap: "bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-300",
  },
  {
    icon: Inbox,
    title: "Send traffic",
    description: "Paste it in Bropay, GitHub, or curl.",
    iconWrap:
      "bg-violet-500/15 text-violet-600 ring-violet-500/25 dark:text-violet-300",
  },
  {
    icon: Webhook,
    title: "Inspect",
    description: "Headers and body show up live.",
    iconWrap:
      "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300",
  },
] as const;

export default async function Home() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="relative mx-auto min-h-full max-w-6xl px-4 pt-10 pb-6 md:px-6 md:pt-14 md:pb-8">
          <header className="space-y-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-primary/12 text-primary ring-primary/25 flex size-12 items-center justify-center rounded-2xl ring-1 shadow-sm">
                  <Webhook className="size-6" aria-hidden />
                </span>
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
                  {APP_DISPLAY_NAME}
                </p>
              </div>
              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  Catch and inspect webhooks-right on this page
                </h1>
                <p className="text-muted-foreground max-w-2xl text-base leading-relaxed md:text-lg">
                  Your catcher URLs, send-test tool, and request history are
                  below. No extra navigation-bookmark this page and come back
                  anytime.
                </p>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {steps.map(
                ({ icon: Icon, title, description, iconWrap }, index) => (
                  <li
                    key={title}
                    className="border-border/80 bg-card/60 supports-backdrop-filter:bg-card/50 flex gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur-sm"
                  >
                    <span className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-xs font-bold tabular-nums shadow-xs">
                      {index + 1}
                    </span>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                            iconWrap,
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="text-sm font-semibold tracking-tight">
                          {title}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-snug">
                        {description}
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 md:px-6 md:pb-14">
        <Separator className="mb-8 md:mb-10" />

        <div id="workspace" className="scroll-mt-6">
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
