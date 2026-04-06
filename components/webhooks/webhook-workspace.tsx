"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildMockRequestsForEndpoint } from "@/lib/webhooks/mock-data";
import {
  addEndpoint,
  ensureWorkspaceInitialized,
  loadWorkspaceState,
  MAX_ENDPOINTS,
  removeEndpoint,
  selectEndpoint,
  type WorkspaceState,
  upsertEndpointByTokens,
} from "@/lib/webhooks/workspace-state";
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
      <div className="border-border bg-card rounded-lg border shadow-sm">
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors">
          {open ? (
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          )}
          <Badge variant="outline" className="font-mono text-xs">
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
};

export function WebhookWorkspace({ origin }: WebhookWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<WorkspaceState>({
    endpoints: [],
    selectedId: null,
  });

  const refresh = useCallback(() => {
    setState(loadWorkspaceState());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      ensureWorkspaceInitialized();
      setState(loadWorkspaceState());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const slug = searchParams.get("slug");
    const token = searchParams.get("token");
    if (
      slug &&
      token &&
      isValidWorkspacePair(slug, token)
    ) {
      upsertEndpointByTokens(slug, token);
      queueMicrotask(() => {
        setState(loadWorkspaceState());
        router.replace("/webhook", { scroll: false });
      });
    }
  }, [ready, searchParams, router]);

  const selected = useMemo(() => {
    if (!state.selectedId) return null;
    return state.endpoints.find((e) => e.id === state.selectedId) ?? null;
  }, [state]);

  const requests: WebhookRequestRow[] = useMemo(() => {
    if (!selected) return [];
    return buildMockRequestsForEndpoint(selected);
  }, [selected]);

  const ingestUrl = selected
    ? buildIngestUrl(origin || "http://localhost", selected.publicSlug, selected.secretToken)
    : "";

  const deepLink = selected
    ? `${origin.replace(/\/$/, "")}${buildWorkspaceAppPath(selected.publicSlug, selected.secretToken)}`
    : "";

  const canAdd = state.endpoints.length < MAX_ENDPOINTS;

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center p-8 text-sm">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <header className="mb-8 border-b border-border pb-6 text-center md:text-left">
          <p className="text-muted-foreground mb-1 font-mono text-[11px] uppercase tracking-[0.2em]">
            Webhook workspace
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Inspect and test HTTP webhooks
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 text-sm leading-relaxed md:mx-0">
            Manage up to {MAX_ENDPOINTS} catcher URLs in this browser. Review
            sample inbound traffic or send your own test requests—in the spirit of{" "}
            <a
              className="text-foreground font-medium underline-offset-4 hover:underline"
              href="https://webhook.cool"
              target="_blank"
              rel="noreferrer"
            >
              webhook.cool
            </a>
            . Inbound history will persist once the API is connected.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <aside className="lg:w-72 lg:shrink-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Your webhooks
              </h2>
              <span className="text-muted-foreground text-xs">
                {state.endpoints.length}/{MAX_ENDPOINTS}
              </span>
            </div>
            <ScrollArea className="h-[min(320px,50vh)] pr-3 lg:h-auto">
              <ul className="flex flex-col gap-2">
                {state.endpoints.map((ep, index) => {
                  const active = ep.id === state.selectedId;
                  const canDelete = state.endpoints.length > 1;
                  return (
                    <li key={ep.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          selectEndpoint(ep.id);
                          refresh();
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
                        onClick={() => {
                          if (removeEndpoint(ep.id)) refresh();
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
              disabled={!canAdd}
              onClick={() => {
                const ep = addEndpoint();
                if (ep) refresh();
              }}
            >
              <Plus className="size-4" aria-hidden />
              Add webhook
              {!canAdd ? " (max)" : ""}
            </Button>
            {!canAdd ? (
              <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
                Maximum {MAX_ENDPOINTS} endpoints. Remove one to add another.
              </p>
            ) : null}
            <p className="text-muted-foreground mt-4 text-[11px] leading-snug lg:hidden">
              On the Send test tab, use &quot;Use selected endpoint URL&quot; to
              fill the catcher ingest URL.
            </p>
          </aside>

          <div className="min-w-0 flex-1">
            <Tabs defaultValue="inspect" className="w-full">
              <TabsList variant="line" className="mb-6 w-full max-w-md">
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
                      className="border-border bg-muted/30 rounded-xl border p-5 md:p-6"
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
                        <Badge variant="secondary" className="text-[10px]">
                          Sample traffic
                        </Badge>
                      </div>

                      {requests.length === 0 ? (
                        <div className="border-border text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
                          No requests yet for this webhook URL.
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {requests.map((row) => (
                            <li key={row.id}>
                              <RequestCard row={row} />
                            </li>
                          ))}
                        </ul>
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
