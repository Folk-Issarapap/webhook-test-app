import Link from "next/link";
import { Inbox, Route, ScrollText, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const foundations = [
  {
    icon: Route,
    title: "Webhook endpoints",
    description:
      "Each catcher has its own URL path or token. Point Stripe, GitHub, or any HTTP client at it—GET, POST, PUT, etc.",
  },
  {
    icon: Inbox,
    title: "Capture payloads",
    description:
      "Store method, path, headers, and body so you can debug integrations without tailing server logs.",
  },
  {
    icon: ScrollText,
    title: "Request history",
    description:
      "Browse recent deliveries per endpoint, newest first. Useful for replaying what a provider actually sent.",
  },
] as const;

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-14 px-6 py-16 md:gap-16 md:py-20">
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary ring-ring/20 flex size-11 items-center justify-center rounded-xl ring-1">
              <Webhook className="size-5" aria-hidden />
            </span>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
              Webhook test
            </p>
          </div>
          <div className="space-y-4">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Catch and inspect HTTP webhooks in one place
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed md:text-lg">
              This app is built to behave like a request bin for your team: expose
              stable URLs, record what hits them, and inspect headers and bodies when
              something misbehaves. Persistence is backed by D1 once the API and UI are
              wired to your schema.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/webhooks">Open webhook workspace</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#foundations-heading">What the app covers</a>
            </Button>
          </div>
          <p className="text-muted-foreground max-w-xl text-sm">
            Typical flow: create an endpoint → copy its public URL into the provider’s
            dashboard → send a test event → review the logged request below.
          </p>
        </header>

        <section className="space-y-6" aria-labelledby="foundations-heading">
          <h2
            id="foundations-heading"
            className="font-heading text-lg font-medium tracking-tight"
          >
            What this site should cover
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {foundations.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <Icon
                      className="text-muted-foreground mb-2 size-5 shrink-0"
                      aria-hidden
                    />
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="text-pretty">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="border-border bg-muted/30 rounded-xl border p-6 md:p-8"
          aria-labelledby="next-heading"
        >
          <h2
            id="next-heading"
            className="font-heading mb-3 text-lg font-medium tracking-tight"
          >
            Next pieces to implement
          </h2>
          <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              HTTP handler (e.g.{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                app/api/…
              </code>
              ) that accepts any method, resolves the endpoint id, and inserts into
              D1.
            </li>
            <li>
              Server actions under{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                actions/webhooks
              </code>{" "}
              to create endpoints and list recent requests.
            </li>
            <li>
              Tables and filters on{" "}
              <Link
                href="/webhooks"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                /webhooks
              </Link>{" "}
              for a usable operator UI (copy URL, filter by status or time).
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
