"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
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
import { ICON_WELL_THEMES } from "@/lib/ui/icon-well-themes";
import type { WebhookRequestRow } from "@/schemas/webhook";

import { CopyTextButton, CopyUrlButton } from "./copy-url-button";
import { WebhookSendTest } from "./webhook-send-test";
import { WorkspaceLoadingSkeleton } from "./workspace-loading-skeleton";

/** Steps 1–3: amber → rose → cyan */
const stepIconThemes = [
  ICON_WELL_THEMES[3],
  ICON_WELL_THEMES[4],
  ICON_WELL_THEMES[5],
] as const;
const radioIconTheme = ICON_WELL_THEMES[2]!;
const clipboardIconTheme = ICON_WELL_THEMES[1]!;

/** Selected endpoint pill — same hue as Endpoints header / Radio (emerald). */
const endpointSelectedBorder =
  "border-emerald-500/50 dark:border-emerald-400/50";

/** Segmented control: active = solid surface only (no extra border/shadow - avoids dark-mode double edge). */
const tabTriggerClass = cn(
  "min-h-11 flex-1 rounded-md px-3 py-2.5 text-center text-sm font-medium transition-colors",
  "border-0 shadow-none outline-none ring-0",
  "after:hidden",
  "text-muted-foreground hover:text-foreground",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-semibold",
  "data-active:bg-background data-active:text-foreground data-active:font-semibold",
);

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
          "border-border bg-background rounded-xl border border-l-4",
          getHttpMethodCardAccentClass(row.method),
        )}
      >
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors md:px-4 md:py-3.5">
          {open ? (
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          )}
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 font-mono text-[11px] font-semibold tracking-wide",
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
          <div className="border-border space-y-3 border-t px-3 py-4 md:px-4">
            {row.source_note ? (
              <div>
                <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  Source
                </p>
                <div className="bg-muted/40 text-foreground/90 rounded-lg p-3 text-[13px] leading-relaxed">
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
              <pre className="bg-muted/40 max-h-[min(28rem,55vh)] overflow-auto rounded-lg p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
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
              <pre className="bg-muted/40 max-h-[min(24rem,50vh)] overflow-auto rounded-lg p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
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

const WORKSPACE_STEPS = [
  {
    n: "1",
    title: "Pick an endpoint",
    hint: "Tap a name below",
  },
  {
    n: "2",
    title: "Copy the ingest URL",
    hint: "Use the box in Inspect",
  },
  {
    n: "3",
    title: "Watch traffic or send a test",
    hint: "Inspect tab or Send test",
  },
] as const;

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
      <div className="border-border text-muted-foreground rounded-xl border border-dashed bg-background px-5 py-14 text-center">
        <p className="text-foreground text-sm font-medium">No requests yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed">
          Send HTTP traffic to the ingest URL above, or open the{" "}
          <span className="text-foreground font-medium">Send test</span> tab.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 md:gap-3">
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
      <div className="bg-background text-foreground min-h-[36vh]">
        <WorkspaceLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-full">
      <div className={cn(showHeader ? "py-8 md:py-10" : "pb-0 pt-0")}>
        {showHeader ? (
          <header className="border-border mb-8 rounded-xl border bg-background px-5 py-7 text-center md:px-6 md:text-left">
            <p className="text-muted-foreground mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
              Webhook workspace
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Inspect and test HTTP webhooks
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-relaxed md:mx-0">
              Manage up to {MAX_ENDPOINTS_PER_WORKSPACE} webhook endpoints in this
              browser. Send traffic to the ingest URL and review captured
              requests-in the spirit of{" "}
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
            className="border-destructive/35 bg-destructive/8 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        <div className="space-y-8 md:space-y-9">
          <ol className="grid gap-3 sm:grid-cols-3">
            {WORKSPACE_STEPS.map(({ n, title, hint }, i) => {
              const th = stepIconThemes[i]!;
              return (
                <li
                  key={n}
                  className="border-border flex gap-3 rounded-xl border bg-background px-3 py-3 md:px-4"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                      th.well,
                      th.icon,
                    )}
                    aria-hidden
                  >
                    {n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                      {hint}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <section aria-labelledby="endpoints-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3
                id="endpoints-heading"
                className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight"
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg",
                    radioIconTheme.well,
                  )}
                  aria-hidden
                >
                  <Radio className={cn("size-4", radioIconTheme.icon)} />
                </span>
                Endpoints
              </h3>
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {endpoints.length}/{MAX_ENDPOINTS_PER_WORKSPACE}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {endpoints.map((ep, index) => {
                const active = ep.id === selectedId;
                const canDelete = endpoints.length > 1;
                return (
                  <div
                    key={ep.id}
                    className="flex max-w-full items-center gap-0.5 rounded-full border border-border bg-background p-0.5 pl-1"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedId(ep.id)}
                      className={cn(
                        "max-w-[min(100%,16rem)] truncate rounded-full px-3 py-1.5 text-left text-sm transition-colors",
                        active
                          ? cn(
                              "border font-medium text-foreground",
                              endpointSelectedBorder,
                              "bg-muted/50",
                            )
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      title={ep.publicSlug}
                    >
                      <span className="text-muted-foreground mr-1.5 text-[10px] font-semibold uppercase tracking-wide">
                        {index + 1}.
                      </span>
                      <span className="font-mono text-xs">{ep.publicSlug}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                      disabled={!canDelete}
                      title={
                        canDelete
                          ? "Delete this endpoint"
                          : "At least one endpoint is required"
                      }
                      aria-label="Delete endpoint"
                      onClick={async () => {
                        const r = await removeEndpointAction(ep.id);
                        if (r.success) await refresh();
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-dashed"
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
                Add endpoint
                {!canAdd ? " (max)" : ""}
              </Button>
            </div>
            {!canAdd ? (
              <p className="text-muted-foreground text-[11px] leading-snug">
                Maximum {MAX_ENDPOINTS_PER_WORKSPACE} endpoints. Remove one to
                add another.
              </p>
            ) : null}
          </section>

          <Tabs defaultValue="inspect" className="w-full">
            <div className="mb-6 flex w-full justify-center">
              <TabsList className="border-border bg-muted flex h-auto w-full max-w-md gap-1 rounded-xl border p-1">
                <TabsTrigger value="inspect" className={tabTriggerClass}>
                  Inspect
                </TabsTrigger>
                <TabsTrigger value="send" className={tabTriggerClass}>
                  Send test
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inspect" className="mt-0 space-y-6">
              {!selected ? (
                <p className="text-muted-foreground text-sm">
                  Select an endpoint above to see its ingest URL and request log.
                </p>
              ) : (
                <>
                  <section
                    className="border-border rounded-xl border bg-card p-4 md:p-5"
                    aria-label="Ingest URL for selected endpoint"
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                            clipboardIconTheme.well,
                          )}
                          aria-hidden
                        >
                          <ClipboardCopy
                            className={cn("size-4", clipboardIconTheme.icon)}
                          />
                        </span>
                        <div>
                          <p className="text-sm font-semibold leading-tight">
                            Ingest URL
                          </p>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            The path includes your slug and secret-treat it like
                            a private webhook URL. Each row shows a colored
                            method tag (POST, GET, …) for what hit this URL.
                          </p>
                        </div>
                      </div>
                      <CopyUrlButton url={ingestUrl} label="Copy URL" />
                    </div>
                    <code className="border-border bg-background text-foreground block w-full rounded-lg border px-3 py-3 font-mono text-xs leading-relaxed break-all md:text-sm">
                      {ingestUrl}
                    </code>
                    <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
                      <span className="text-foreground font-medium">
                        Bookmark
                      </span>{" "}
                      (open this endpoint only):{" "}
                      <span className="font-mono break-all">{deepLink}</span>
                    </p>
                  </section>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-heading text-base font-semibold tracking-tight md:text-lg">
                        Incoming requests
                      </h2>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground rounded-full border-border text-[10px]"
                      >
                        {loadError ? "Offline" : "Live (D1)"}
                      </Badge>
                    </div>

                    {loadError ? (
                      <div className="border-border text-muted-foreground rounded-xl border border-dashed bg-background py-14 text-center text-sm">
                        Connect the database to see incoming requests.
                      </div>
                    ) : (
                      <EndpointRequestList
                        key={selected.id}
                        endpointId={selected.id}
                      />
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="send" className="mt-0 space-y-4">
              {!selected ? (
                <p className="text-muted-foreground text-sm">
                  Select an endpoint first—you can then paste its URL with
                  &quot;Use selected endpoint URL&quot;.
                </p>
              ) : (
                <p className="text-muted-foreground hidden text-xs leading-relaxed md:block">
                  Selected endpoint:{" "}
                  <span className="text-foreground font-mono text-sm">
                    {selected.publicSlug}
                  </span>
                  . Use &quot;Use selected endpoint URL&quot; in the form to
                  fill the ingest URL.
                </p>
              )}
              <WebhookSendTest
                selectedIngestUrl={selected ? ingestUrl || null : null}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
