import { KeyRound, Radio, ShieldCheck, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: Zap,
    title: "Plain or secret URL",
    description:
      "Public slug plus a secret token in the path—works with providers that expect a signed-looking URL.",
  },
  {
    icon: Radio,
    title: "Live request log",
    description:
      "Method, path, headers, and body as requests arrive. Select a row to inspect or copy JSON.",
  },
  {
    icon: ShieldCheck,
    title: "No login",
    description:
      "Open the site and start testing. This browser session is your workspace—bookmark to return.",
  },
] as const;

/** Empty-state onboarding for Traffic when there are no captured requests yet. */
export function WorkspaceTrafficGuide() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-2 py-4 text-center md:py-6">
      <p className="text-muted-foreground text-sm">Public · No account · Free</p>
      <h2 className="font-heading text-foreground mt-4 text-balance text-2xl font-semibold tracking-tight md:text-[1.65rem] md:leading-snug">
        Test webhooks in the browser
      </h2>
      <p className="text-muted-foreground mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed md:text-[0.95rem]">
        Copy your webhook URL into your provider or curl. We capture the HTTP
        request so you can verify payloads and headers—plain path or a secret
        in the URL.
      </p>

      <ul className="border-border/60 mt-10 w-full space-y-0 divide-y divide-border/70 border-y text-left">
        {highlights.map(({ icon: Icon, title, description }) => (
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
        ))}
      </ul>
    </div>
  );
}
