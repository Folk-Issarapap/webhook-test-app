"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  attachEndpointByTokensAction,
  bootstrapWorkspaceAction,
  createEndpointAction,
  removeEndpointAction,
  type WorkspaceEndpointDto,
} from "@/actions/webhooks/workspace-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getHttpMethodBadgeClass,
  getHttpMethodCardAccentClass,
} from "@/lib/http-method-styles";
import { MAX_ENDPOINTS_PER_WORKSPACE } from "@/lib/webhooks/constants";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";
import { buildIngestUrl, buildWorkspaceAppPath } from "@/lib/webhooks/urls";
import type { WebhookRequestRow } from "@/schemas/webhook";

import { CopyTextButton, CopyUrlButton } from "./copy-url-button";
import { WebhookSendTest } from "./webhook-send-test";

function tryFormatJson(raw: string | null): string {
  if (!raw) return "—";
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function tryFormatHeadersJson(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function RequestCard({ row }: { row: WebhookRequestRow }) {
  const [open, setOpen] = useState(false);
  const headersText = useMemo(
    () => tryFormatHeadersJson(row.headers),
    [row.headers],
  );
  const bodyText = useMemo(() => tryFormatJson(row.body), [row.body]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "border-border bg-card rounded-lg border border-l-4 shadow-sm",
          getHttpMethodCardAccentClass(row.method),
        )}
      >
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors">
          {open ? (
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          )}
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[11px] font-semibold tracking-wide",
              getHttpMethodBadgeClass(row.method),
            )}
          >
            {row.method}
          </Badge>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatDistanceToNow(row.created_at * 1000, { addSuffix: true })}
          </span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {row.path}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border space-y-3 border-t px-4 py-4">
            {row.source_note ? (
              <div>
                <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  Source
                </p>
                <div className="bg-muted/70 text-foreground/90 rounded-md p-3 text-[13px] leading-relaxed">
                  {row.source_note}
                </div>
              </div>
            ) : null}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Headers
                </p>
                <CopyTextButton text={headersText} label="Copy" />
              </div>
              <pre className="bg-muted/70 max-h-[min(28rem,55vh)] overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
                {headersText}
              </pre>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Body
                </p>
                <CopyTextButton text={bodyText} label="Copy" />
              </div>
              <pre className="bg-muted/70 max-h-[min(24rem,50vh)] overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
                {bodyText}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

type WebhookWorkspaceProps = {
  origin: string;
  /** Where to stay after `?slug=&token=` attach (default `/webhook`). */
  routeBasePath?: string;
  /** Hide the marketing-style header (e.g. when the parent page already has a hero). */
  showHeader?: boolean;
};

function EndpointRequestList({ endpointId }: { endpointId: string }) {
  const [requests, setRequests] = useState<WebhookRequestRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/workspace-endpoints/${encodeURIComponent(endpointId)}/requests`,
          { credentials: "same-origin" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok?: boolean;
          requests?: WebhookRequestRow[];
        };
        if (cancelled || !data.requests) return;
        setRequests(data.requests);
      } catch {
        /* ignore network errors during poll */
      }
    };
    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [endpointId]);

  if (requests.length === 0) {
    return (
      <div className="border-border from-muted/40 to-primary/4 text-muted-foreground rounded-xl border border-dashed bg-linear-to-b py-16 text-center text-sm">
        <p className="text-foreground/80 font-medium">No requests yet</p>
        <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed">
          Send traffic to the ingest URL above, or use the Send test tab—events
          will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((row) => (
        <li key={row.id}>
          <RequestCard row={row} />
        </li>
      ))}
    </ul>
  );
}

export function WebhookWorkspace({
  origin,
  routeBasePath = "/webhook",
  showHeader = true,
}: WebhookWorkspaceProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [endpoints, setEndpoints] = useState<WorkspaceEndpointDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await bootstrapWorkspaceAction();
    if (!r.success) {
      setLoadError(r.message);
      return;
    }
    setLoadError(null);
    setEndpoints(r.endpoints);
    setSelectedId((prev) => {
      if (prev && r.endpoints.some((e) => e.id === prev)) return prev;
      return r.endpoints[0]?.id ?? null;
    });
  }, []);

  /** Bootstrap once on mount; deep link from `window.location.search`. */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const slug = params.get("slug");
      const token = params.get("token");
      if (slug && token && isValidWorkspacePair(slug, token)) {
        await attachEndpointByTokensAction(slug, token);
        router.replace(routeBasePath, { scroll: false });
      }

      const r = await bootstrapWorkspaceAction();
      if (cancelled) return;
      if (!r.success) {
        setLoadError(r.message);
        setReady(true);
        return;
      }
      setLoadError(null);
      setEndpoints(r.endpoints);
      setSelectedId((prev) => {
        if (prev && r.endpoints.some((e) => e.id === prev)) return prev;
        return r.endpoints[0]?.id ?? null;
      });
      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, routeBasePath]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return endpoints.find((e) => e.id === selectedId) ?? null;
  }, [endpoints, selectedId]);

  const ingestUrl = selected
    ? buildIngestUrl(
        origin || "http://localhost",
        selected.publicSlug,
        selected.secretToken,
      )
    : "";

  const deepLink = selected
    ? `${origin.replace(/\/$/, "")}${buildWorkspaceAppPath(selected.publicSlug, selected.secretToken)}`
    : "";

  const canAdd = endpoints.length < MAX_ENDPOINTS_PER_WORKSPACE;

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-sm">
        <Loader2 className="text-primary size-8 animate-spin" aria-hidden />
        <span>Loading workspace…</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-full">
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 md:px-6",
          showHeader ? "py-8 md:py-10" : "pb-10 pt-0 md:pb-12",
        )}
      >
        {showHeader ? (
          <header className="mb-8 border-b border-border pb-6 text-center md:text-left">
            <p className="text-muted-foreground mb-1 font-mono text-[11px] uppercase tracking-[0.2em]">
              Webhook workspace
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Inspect and test HTTP webhooks
            </h1>
            <p className="text-muted-foreground mx-auto mt-2 text-sm leading-relaxed md:mx-0">
              Manage up to {MAX_ENDPOINTS_PER_WORKSPACE} catcher URLs in this
              browser. Send traffic to the ingest URL and review captured
              requests—in the spirit of{" "}
              <a
                className="text-foreground font-medium underline-offset-4 hover:underline"
                href="https://webhook.cool"
                target="_blank"
                rel="noreferrer"
              >
                webhook.cool
              </a>
              . Requests are stored in D1 when the app runs on Cloudflare
              Workers.
            </p>
          </header>
        ) : null}

        {loadError ? (
          <div
            className="border-destructive/50 bg-destructive/10 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <aside className="lg:w-72 lg:shrink-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <span className="bg-primary/12 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
                  <Radio className="size-4" aria-hidden />
                </span>
                Your webhooks
              </h2>
              <span className="text-muted-foreground text-xs">
                {endpoints.length}/{MAX_ENDPOINTS_PER_WORKSPACE}
              </span>
            </div>
            <ScrollArea className="max-h-[min(320px,50vh)] pr-3 lg:max-h-none lg:h-auto">
              <ul className="flex flex-col gap-2">
                {endpoints.map((ep, index) => {
                  const active = ep.id === selectedId;
                  const canDelete = endpoints.length > 1;
                  return (
                    <li key={ep.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(ep.id);
                        }}
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary/5 ring-ring/30 ring-2"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wide">
                          Webhook {index + 1}
                        </span>
                        <span className="font-mono text-xs break-all text-foreground">
                          {ep.publicSlug}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0"
                        disabled={!canDelete}
                        title={
                          canDelete
                            ? "Delete this webhook"
                            : "At least one webhook is required"
                        }
                        aria-label="Delete webhook"
                        onClick={async () => {
                          const r = await removeEndpointAction(ep.id);
                          if (r.success) await refresh();
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full gap-2"
              disabled={!canAdd || !!loadError}
              onClick={async () => {
                const r = await createEndpointAction();
                if (r.success) {
                  setEndpoints((prev) => [...prev, r.endpoint]);
                  setSelectedId(r.endpoint.id);
                }
              }}
            >
              <Plus className="size-4" aria-hidden />
              Add webhook
              {!canAdd ? " (max)" : ""}
            </Button>
            {!canAdd ? (
              <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
                Maximum {MAX_ENDPOINTS_PER_WORKSPACE} endpoints. Remove one to
                add another.
              </p>
            ) : null}
            <p className="text-muted-foreground mt-4 text-[11px] leading-snug lg:hidden">
              On the Send test tab, use &quot;Use selected endpoint URL&quot; to
              fill the catcher ingest URL.
            </p>
          </aside>

          <div className="min-w-0 flex-1">
            <Tabs defaultValue="inspect" className="w-full">
              <TabsList className="mb-6 grid h-10 w-full grid-cols-2 p-1">
                <TabsTrigger value="inspect">Inspect</TabsTrigger>
                <TabsTrigger value="send">Send test</TabsTrigger>
              </TabsList>

              <TabsContent value="inspect" className="mt-0 space-y-6">
                {!selected ? (
                  <p className="text-muted-foreground text-sm">
                    Select a webhook from the sidebar.
                  </p>
                ) : (
                  <>
                    <section
                      className="border-border bg-primary/6 rounded-xl border p-5 md:p-6"
                      aria-label="Selected webhook URL"
                    >
                      <p className="text-muted-foreground mb-2 text-center text-[11px] font-semibold uppercase tracking-wide md:text-left">
                        Send webhooks to this URL
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <code className="bg-background border-border block w-full flex-1 rounded-lg border px-3 py-3 font-mono text-xs leading-relaxed break-all md:text-sm">
                          {ingestUrl}
                        </code>
                        <CopyUrlButton url={ingestUrl} label="Copy" />
                      </div>
                      <p className="text-muted-foreground mt-4 text-center text-[11px] md:text-left">
                        Direct link to this catcher only:{" "}
                        <span className="font-mono break-all">{deepLink}</span>
                      </p>
                    </section>

                    <section aria-label="Incoming requests">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-heading text-lg font-medium tracking-tight">
                          Incoming requests
                        </h2>
                        <Badge
                          variant="secondary"
                          className={
                            loadError
                              ? "text-[10px]"
                              : "border-emerald-500/35 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100 text-[10px]"
                          }
                        >
                          {loadError ? "Offline" : "Live (D1)"}
                        </Badge>
                      </div>

                      {loadError ? (
                        <div className="border-border text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
                          Connect the database to see incoming requests.
                        </div>
                      ) : (
                        <EndpointRequestList
                          key={selected.id}
                          endpointId={selected.id}
                        />
                      )}
                    </section>
                  </>
                )}
              </TabsContent>

              <TabsContent value="send" className="mt-0">
                <p className="text-muted-foreground mb-4 hidden text-[11px] leading-snug lg:block">
                  Tip: select an endpoint in the sidebar, then use &quot;Use
                  selected endpoint URL&quot; below to paste its ingest URL.
                </p>
                <WebhookSendTest
                  selectedIngestUrl={selected ? ingestUrl || null : null}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
