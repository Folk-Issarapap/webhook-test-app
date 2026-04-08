import {
  ArrowRight,
  Inbox,
  Route,
  ScrollText,
  Sparkles,
  Webhook,
} from "lucide-react";

import { OpenWorkspaceButton } from "@/components/webhooks/open-workspace-button";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Route,
    title: "Your own endpoint",
    description:
      "Get a unique URL in seconds. No signup needed—just open and start catching.",
  },
  {
    icon: Inbox,
    title: "Live capture",
    description:
      "Watch requests arrive in real-time. Headers, body, query params—everything is saved.",
  },
  {
    icon: ScrollText,
    title: "Simple inspect",
    description:
      "No raw JSON headache. Keys and values are color-coded so you read faster.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container-tight text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-subtle mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">
              Free webhook testing
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6">
            Catch webhooks
            <br />
            <span className="text-gradient">without the noise</span>
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            The cleanest way to debug HTTP webhooks. Create an endpoint, send
            traffic, inspect everything—instantly.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <OpenWorkspaceButton />
            <Button
              variant="ghost"
              size="lg"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="#features">
                See how it works
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
          </div>

          {/* Trust text */}
          <p className="text-sm text-muted-foreground/60 mt-6">
            No account required. Data stays in your workspace.
          </p>
        </div>
      </section>

      {/* Visual Preview / Demo Section */}
      <section className="px-6 py-12 md:py-20 bg-surface/50 border-y border-border-subtle">
        <div className="container-tight">
          <div className="rounded-2xl bg-elevated border border-border-subtle shadow-sm overflow-hidden">
            {/* Mock header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-surface">
              <div className="w-3 h-3 rounded-full bg-destructive/30" />
              <div className="w-3 h-3 rounded-full bg-warning/30" />
              <div className="w-3 h-3 rounded-full bg-success/30" />
              <div className="ml-4 flex-1">
                <div className="px-3 py-1.5 rounded-md bg-background border border-border-subtle text-xs font-mono text-muted-foreground">
                  https://hook.example.com/api/hook/abc123
                </div>
              </div>
            </div>
            {/* Mock content */}
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Request list */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Recent requests
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border-subtle"
                    >
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-success-subtle text-success">
                        POST
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /api/webhook
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground/60">
                        {i}s ago
                      </span>
                    </div>
                  ))}
                </div>
                {/* Right: Detail view */}
                <div className="space-y-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Headers
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex gap-2">
                      <span className="syntax-key">content-type:</span>
                      <span className="syntax-string">application/json</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="syntax-key">x-signature:</span>
                      <span className="syntax-string">sha256=abc123</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6">
                    Body
                  </div>
                  <div className="font-mono text-sm space-y-1">
                    <span className="text-muted-foreground">{"{"}</span>
                    <div className="pl-4">
                      <span className="syntax-key">event</span>
                      <span className="text-muted-foreground">: </span>
                      <span className="syntax-string">
                        &quot;payment.success&quot;
                      </span>
                      <span className="text-muted-foreground">,</span>
                    </div>
                    <div className="pl-4">
                      <span className="syntax-key">amount</span>
                      <span className="text-muted-foreground">: </span>
                      <span className="syntax-number">1000</span>
                    </div>
                    <span className="text-muted-foreground">{"}"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="container-tight">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Built for developers who want clarity
            </h2>
            <p className="text-muted-foreground">
              Everything you need, nothing you don&apos;t.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group p-6 rounded-xl bg-surface border border-border-subtle 
                           hover:border-primary/20 hover:bg-primary-subtle/20
                           transition-all duration-300"
              >
                <div
                  className="w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center mb-4
                                group-hover:scale-105 transition-transform duration-300"
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 md:py-28">
        <div className="container-tight text-center">
          <div className="rounded-2xl bg-surface border border-border-subtle p-8 md:p-12">
            <Webhook className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Ready to catch your first webhook?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create a workspace in seconds. No credit card, no signup
              forms—just a clean URL ready for your webhooks.
            </p>
            <OpenWorkspaceButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border-subtle">
        <div className="container-tight flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            <span className="font-medium">Webhook Test</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Self-hosted webhook catcher
          </p>
        </div>
      </footer>
    </div>
  );
}
