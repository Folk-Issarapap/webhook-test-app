import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";

import { WebhookWorkspace } from "@/components/webhooks/webhook-workspace";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { resolveRequestOrigin } from "@/lib/server/request-origin";
import { APP_DISPLAY_NAME } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "Pick an endpoint",
    text: "Select a catcher or add one — your list stays in this browser.",
  },
  {
    n: "02",
    title: "Paste the ingest URL",
    text: "Use it in your provider or CLI; the secret stays in the path.",
  },
  {
    n: "03",
    title: "Inspect or send a test",
    text: "Open any row for headers and body, or use the Send test tab.",
  },
] as const;

export default async function Home() {
  const h = await headers();
  const origin = resolveRequestOrigin(h);

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 pt-16 pb-16 md:px-10 md:pt-24 md:pb-20">
        <header className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between md:gap-16">
          <div className="max-w-xl space-y-6">
            <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase dark:text-zinc-400">
              {APP_DISPLAY_NAME}
            </p>
            <h1 className="font-serif text-[2rem] leading-[1.1] font-normal tracking-tight text-balance text-zinc-900 md:text-[2.85rem] md:leading-[1.05] dark:text-zinc-50">
              Catch webhooks in one calm screen.
            </h1>
            <p className="text-[17px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Copy a URL, trigger an event, read the request — no account, no
              clutter. Built for debugging payloads and headers without losing
              the thread.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                asChild
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium shadow-none transition-all duration-200 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <a href="#workspace" className="gap-2">
                  Start in workspace
                  <ArrowRight className="size-4 opacity-80" aria-hidden />
                </a>
              </Button>
            </div>
          </div>

          <nav
            aria-label="How it works"
            className="w-full max-w-sm shrink-0 border-t border-zinc-200/60 pt-8 dark:border-zinc-800/80 md:border-t-0 md:border-l md:pt-0 md:pl-10"
          >
            <ol className="space-y-7">
              {steps.map((s) => (
                <li key={s.n} className="flex gap-5">
                  <span className="font-mono text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
                    {s.n}
                  </span>
                  <div>
                    <p className="font-medium tracking-tight">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </header>
      </div>

      <Separator className="bg-zinc-200/50 dark:bg-zinc-800/60" />

      <div
        id="workspace"
        className="scroll-mt-6 bg-zinc-50/40 px-5 py-16 md:px-10 md:py-20 dark:bg-zinc-950/30"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-normal tracking-tight text-zinc-900 md:text-[1.75rem] dark:text-zinc-50">
              Workspace
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Optional: open with{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                ?slug=
              </code>{" "}
              and{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                ?token=
              </code>{" "}
              to attach a catcher.
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
