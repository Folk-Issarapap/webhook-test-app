"use client";

import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  Check,
  Plus,
  Send,
  X,
  Webhook,
  Trash2,
  ArrowLeft,
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
import { SimpleJsonDisplay } from "@/components/syntax-highlighter";
import { MAX_ENDPOINTS_PER_WORKSPACE } from "@/lib/webhooks/constants";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";
import { buildIngestUrl } from "@/lib/webhooks/urls";
import type { WebhookRequestRow } from "@/schemas/webhook";

import { WebhookSendTest } from "./webhook-send-test";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Utility: Parse headers
function tryParseHeaders(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}

// Utility: Parse body
function tryParseBody(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

// Copy hook
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [text]);
  return { copied, copy };
}

function shortRequestId(id: string): string {
  const trimmed = id.replace(/^req_?/i, "");
  return (
    (trimmed.length > 10 ? trimmed.slice(0, 8) : trimmed) || id.slice(0, 8)
  );
}

/** Catcher accepts and stores the request (no per-row HTTP status in DB yet). */
function CaptureStatusPill() {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5  text-[10px] tabular-nums text-muted-foreground/90 bg-muted/40 border border-border-subtle/45"
      title="Successfully received and stored"
    >
      200
    </span>
  );
}

// Horizontal endpoint tabs (Postman-style)
function EndpointTabStrip({
  endpoints,
  selectedId,
  onSelect,
  canAdd,
  canDelete,
  onAdd,
  onDelete,
  addDisabled,
  onSendTest,
  sendTestDisabled,
  sendTestActive,
}: {
  endpoints: WorkspaceEndpointDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canAdd: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  addDisabled: boolean;
  onSendTest: () => void;
  sendTestDisabled: boolean;
  sendTestActive: boolean;
}) {
  return (
    <div className="flex items-stretch border-b border-border-subtle/40 bg-background">
      <div className="flex min-w-0 flex-1 overflow-x-auto divide-x divide-border-subtle/25">
        {endpoints.map((ep, index) => {
          const active = ep.id === selectedId;
          return (
            <div
              key={ep.id}
              className="group relative flex shrink-0 items-stretch"
            >
              <button
                type="button"
                onClick={() => onSelect(ep.id)}
                className={cn(
                  "relative flex max-w-[min(100vw,14rem)] flex-col items-start justify-center gap-0.5 px-4 py-2.5 text-left transition-colors",
                  active
                    ? "bg-muted/25 text-foreground"
                    : "text-muted-foreground hover:bg-muted/15 hover:text-foreground",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  Endpoint {index + 1}
                </span>
                <span className="truncate  text-[12px] text-foreground/90">
                  {ep.publicSlug}
                </span>
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px bg-primary/40"
                    aria-hidden
                  />
                )}
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ep.id);
                  }}
                  className="flex items-center px-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive-subtle/40 hover:text-destructive group-hover:opacity-100"
                  title="Remove endpoint"
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
        {canAdd ? (
          <div className="flex shrink-0 items-stretch">
            <button
              type="button"
              disabled={addDisabled}
              onClick={onAdd}
              className={cn(
                "flex items-center justify-center px-3.5 py-2.5 transition-colors",
                addDisabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : "text-muted-foreground hover:bg-muted/25 hover:text-foreground",
              )}
              title={
                addDisabled
                  ? "Cannot add endpoint"
                  : "Create a new webhook endpoint"
              }
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center border-l border-border-subtle/35 pl-2 pr-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sendTestDisabled}
          onClick={onSendTest}
          title={
            sendTestDisabled
              ? "Select an endpoint to send a test request"
              : sendTestActive
                ? "Back to inspect"
                : "Send a test request to this endpoint"
          }
          className={cn(
            "h-8 gap-1.5 font-medium shadow-none",
            sendTestActive &&
              "border-primary/35 bg-primary/8 text-foreground hover:bg-primary/12",
          )}
        >
          <Send className="size-3.5" />
          <span className="max-sm:sr-only">Send test</span>
        </Button>
      </div>
    </div>
  );
}

// Ingest URL — full width; omit bottom rule when nested under a bordered parent
function UrlCard({ url, embedded }: { url: string; embedded?: boolean }) {
  const { copied, copy } = useCopy(url);

  return (
    <div className="group relative">
      <div className="relative flex items-center gap-3 py-1">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Ingest URL
          </p>
          <code className="block break-all  text-sm text-foreground">
            {url}
          </code>
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-2 rounded-xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-4 text-success" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
      {!embedded && <Separator className="mt-4 h-px bg-muted" />}
    </div>
  );
}

// Method Badge with color
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-emerald-600",
    POST: "text-indigo-600",
    PUT: "text-amber-600",
    PATCH: "text-orange-600",
    DELETE: "text-rose-600",
    HEAD: "text-slate-500",
    OPTIONS: "text-slate-500",
  };
  const colorClass = colors[method] || "text-muted-foreground";

  return (
    <span className={`text-[11px] font-semibold ${colorClass}`}>{method}</span>
  );
}

// Empty State
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-border-subtle/45 bg-surface/80">
        <Webhook className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Method border colors for left accent
function methodBorderColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "border-l-emerald-600",
    POST: "border-l-indigo-600",
    PUT: "border-l-amber-600",
    PATCH: "border-l-orange-600",
    DELETE: "border-l-rose-600",
    HEAD: "border-l-slate-500",
    OPTIONS: "border-l-slate-500",
  };
  return colors[method] || "border-l-muted-foreground";
}

// Request row in history sidebar
function RequestListItem({
  row,
  isSelected,
  onClick,
}: {
  row: WebhookRequestRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const when = row.created_at * 1000;
  const methodColor = methodBorderColor(row.method);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full border-b border-border-subtle/30 py-2.5 pl-3 pr-3 text-left transition-[background-color,color] duration-150 last:border-b-0",
        "border-l-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/12 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected
          ? `${methodColor} bg-black/5.5 text-foreground dark:bg-white/8`
          : "border-l-transparent text-muted-foreground hover:bg-black/2.5 hover:text-foreground dark:hover:bg-white/6",
      )}
    >
      <div className="flex items-center gap-2">
        <MethodBadge method={row.method} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate  text-[11px]",
            isSelected
              ? "text-foreground"
              : "text-foreground/90 group-hover:text-foreground",
          )}
          title={row.path}
        >
          {shortRequestId(row.id)}
        </span>
        <CaptureStatusPill />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 pl-0.5">
        <span
          className={cn(
            "truncate  text-[10px] tabular-nums text-muted-foreground",
            !isSelected && "group-hover:text-foreground/65",
          )}
        >
          {format(when, "MMM d, HH:mm:ss")}
        </span>
        <span
          className={cn(
            "shrink-0 text-[10px] text-muted-foreground",
            !isSelected && "group-hover:text-foreground/58",
          )}
        >
          {formatDistanceToNow(when, { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}

// Request Detail View for right panel
function RequestDetail({ row }: { row: WebhookRequestRow }) {
  const headersObj = useMemo(() => tryParseHeaders(row.headers), [row.headers]);
  const bodyObj = useMemo(() => tryParseBody(row.body), [row.body]);
  const headersText = useMemo(
    () => JSON.stringify(headersObj, null, 2),
    [headersObj],
  );
  const bodyText = useMemo(() => row.body || "—", [row.body]);
  const { copied: copiedHeaders, copy: copyHeaders } = useCopy(headersText);
  const { copied: copiedBody, copy: copyBody } = useCopy(bodyText);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 bg-background/85 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={row.method} />
          <span className="break-all  text-xs text-muted-foreground">
            {row.path}
          </span>
        </div>
        {row.source_note ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {row.source_note}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
        {/* Headers Panel */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium tracking-tight text-foreground">
                Headers
              </span>
            </div>
            <button
              onClick={copyHeaders}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              {copiedHeaders ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copiedHeaders ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-2  text-sm">
            {Object.keys(headersObj).length > 0 ? (
              Object.entries(headersObj).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="syntax-key">{key}:</span>
                  <span className="syntax-string">{String(value)}</span>
                </div>
              ))
            ) : (
              <pre className=" text-sm text-muted-foreground whitespace-pre-wrap break-all">
                {row.headers}
              </pre>
            )}
          </div>
        </div>

        {/* Body Panel */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className=" text-sm font-medium tracking-tight text-foreground">
                Body
              </span>
            </div>
            <button
              onClick={copyBody}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              {copiedBody ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copiedBody ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-2  text-sm max-h-[400px] overflow-auto">
            {bodyObj ? (
              <SimpleJsonDisplay data={bodyObj} />
            ) : (
              <pre className=" text-sm text-muted-foreground whitespace-pre-wrap break-all">
                {bodyText}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Incoming Requests with split layout
function IncomingRequests({ endpointId }: { endpointId: string }) {
  const [requests, setRequests] = useState<WebhookRequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        // Auto-select first request if none selected
        setSelectedId((prev) => {
          if (prev && data.requests?.some((r) => r.id === prev)) return prev;
          return data.requests?.[0]?.id ?? null;
        });
      } catch {
        /* ignore */
      }
    };
    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [endpointId]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  if (requests.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState message="No requests captured yet. Send a webhook to get started." />
      </div>
    );
  }

  return (
    <div className="grid min-h-[min(70vh,640px)] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(220px,280px)_1fr]">
      <aside className="flex max-h-[min(70vh,640px)] flex-col border-b border-border-subtle/35 lg:border-b-0 lg:border-r lg:border-border-subtle/35">
        <div className="flex shrink-0 items-center space-x-2 border-b border-border-subtle/30 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Request history
          </span>
          <span className=" text-[10px] text-muted-foreground tabular-nums">
            ({requests.length})
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {requests.map((row) => (
            <RequestListItem
              key={row.id}
              row={row}
              isSelected={selectedId === row.id}
              onClick={() => setSelectedId(row.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-background/40">
        {selectedRequest ? (
          <RequestDetail row={selectedRequest} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <span className="text-sm">Select a request to view details</span>
          </div>
        )}
      </section>
    </div>
  );
}

// Main Component
export function WebhookWorkspace({ origin }: { origin: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [endpoints, setEndpoints] = useState<WorkspaceEndpointDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inspect" | "send">("inspect");

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
        router.replace("/webhook", { scroll: false });
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
  }, [router]);

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

  const canAdd = endpoints.length < MAX_ENDPOINTS_PER_WORKSPACE;
  const canDelete = endpoints.length > 1;

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-5xl px-4 py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Webhook Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect and test HTTP webhooks
          </p>
        </div>
        <span className="rounded-full border border-border-subtle/50 bg-surface/80 px-2.5 py-1 text-xs text-muted-foreground">
          {endpoints.length}/{MAX_ENDPOINTS_PER_WORKSPACE} endpoints
        </span>
      </div>

      {loadError && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive-subtle/50 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="">
        <EndpointTabStrip
          endpoints={endpoints}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setActiveTab("inspect");
          }}
          canAdd={canAdd}
          canDelete={canDelete}
          addDisabled={!!loadError}
          onAdd={async () => {
            const r = await createEndpointAction();
            if (r.success) {
              setEndpoints((prev) => [...prev, r.endpoint]);
              setSelectedId(r.endpoint.id);
              setActiveTab("inspect");
            }
          }}
          onDelete={async (id) => {
            const r = await removeEndpointAction(id);
            if (r.success) await refresh();
          }}
          onSendTest={() =>
            setActiveTab((t) => (t === "send" ? "inspect" : "send"))
          }
          sendTestDisabled={!selected}
          sendTestActive={activeTab === "send"}
        />

        {selected ? (
          <div className="bg-background">
            {activeTab === "inspect" && (
              <div className="flex flex-col">
                <div className="sticky top-0 z-10 border-b border-border-subtle/35 bg-background/95 px-4 py-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
                  <UrlCard url={ingestUrl} embedded />
                </div>
                <div className="p-4">
                  {loadError ? (
                    <div className="rounded-xl border border-dashed border-border-subtle/50 bg-surface/40 py-16 text-center">
                      <p className="text-sm text-muted-foreground">
                        Connect database to view requests
                      </p>
                    </div>
                  ) : (
                    <IncomingRequests endpointId={selected.id} />
                  )}
                </div>
              </div>
            )}

            {activeTab === "send" && (
              <div className="border-t border-border-subtle/35 p-4 md:p-6">
                <WebhookSendTest selectedIngestUrl={ingestUrl || null} />
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-border-subtle/35 p-12">
            <EmptyState message="Select an endpoint to get started" />
          </div>
        )}
      </div>
    </div>
  );
}
