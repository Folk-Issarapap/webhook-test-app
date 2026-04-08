"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  Check,
  Eye,
  Link2,
  Plus,
  Send,
  Trash2,
  Webhook,
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
import { Separator } from "@/components/ui/separator";

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

// Endpoint Card
function EndpointCard({
  endpoint,
  index,
  isActive,
  onSelect,
  onDelete,
  canDelete,
}: {
  endpoint: WorkspaceEndpointDto;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
        isActive
          ? "border-primary/50 bg-primary-subtle/20 shadow-sm"
          : "border-border-subtle hover:border-primary/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/*  <Webhook
              className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            /> */}
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Endpoint {index + 1}
            </span>
          </div>
          <p className="font-mono text-xs text-foreground break-all leading-relaxed">
            {endpoint.publicSlug}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete) onDelete();
          }}
          disabled={!canDelete}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
            canDelete
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive-subtle/50 opacity-0 group-hover:opacity-100"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          title={canDelete ? "Delete endpoint" : "Cannot delete last endpoint"}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {isActive && (
        <div className="absolute -left-px top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-full" />
      )}
    </div>
  );
}

// Modern URL Card - Single prominent display
function UrlCard({ url }: { url: string }) {
  const { copied, copy } = useCopy(url);

  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center gap-3 py-2 rounded-2xl hover:border-primary/30 transition-all">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Webhook URL
          </p>
          <code className="block font-mono text-sm text-foreground break-all">
            {url}
          </code>
        </div>
        <button
          onClick={copy}
          className="teshrink-0 flex items-center gap-2 py-2 rounded-xl text-muted-foreground transition-colors text-sm font-medium"
        >
          {copied ? (
            <>
              <Check className="size-4 text-success" />
            </>
          ) : (
            <>
              <Copy className="size-4" />
            </>
          )}
        </button>
      </div>
      <Separator className="h-px mt-4 bg-muted" />
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
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mb-4">
        <Webhook className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Simple Request List Item for left panel
function RequestListItem({
  row,
  isSelected,
  onClick,
}: {
  row: WebhookRequestRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
        isSelected
          ? "bg-primary/5 text-foreground"
          : "text-muted-foreground hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <MethodBadge method={row.method} />
        <span className="font-mono text-xs truncate flex-1" title={row.path}>
          {row.path}
        </span>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {formatDistanceToNow(row.created_at * 1000, { addSuffix: true })}
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
    <div className="h-full overflow-auto">
      {/*       <div className="p-4 border-b border-border-subtle bg-surface/30 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <MethodBadge method={row.method} />
          <div className="mt-2 font-mono text-xs text-muted-foreground break-all">
            {row.path}
          </div>
        </div>
        <div className="mt-2 font-mono text-xs text-muted-foreground break-all">
          {row.path}
        </div>
        {row.source_note && (
          <div className="mt-2 text-xs text-muted-foreground">
            Source: {row.source_note}
          </div>
        )}
      </div> */}

      <div className="p-4 pt-0 space-y-6">
        {/* Headers Panel */}
        <div className="">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
          <div className="space-y-2 font-mono text-sm">
            {Object.keys(headersObj).length > 0 ? (
              Object.entries(headersObj).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="syntax-key">{key}:</span>
                  <span className="syntax-string">{String(value)}</span>
                </div>
              ))
            ) : (
              <pre className="font-mono text-sm text-muted-foreground whitespace-pre-wrap break-all">
                {row.headers}
              </pre>
            )}
          </div>
        </div>

        {/* Body Panel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
          <div className="space-y-2 font-mono text-sm max-h-[400px] overflow-auto">
            {bodyObj ? (
              <SimpleJsonDisplay data={bodyObj} />
            ) : (
              <pre className="font-mono text-sm text-muted-foreground whitespace-pre-wrap break-all">
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
      <EmptyState message="No requests captured yet. Send a webhook to get started." />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
      {/* Left: Request List */}
      <div className="lg:col-span-1 overflow-auto max-h-[600px]">
        <div className="flex items-center justify-between mb-3 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Requests
          </span>
          <span className="text-xs text-muted-foreground">
            {requests.length}
          </span>
        </div>
        <div className="space-y-1">
          {requests.map((row) => (
            <RequestListItem
              key={row.id}
              row={row}
              isSelected={selectedId === row.id}
              onClick={() => setSelectedId(row.id)}
            />
          ))}
        </div>
      </div>

      {/* Right: Request Detail */}
      <div className="lg:col-span-2">
        {selectedRequest ? (
          <RequestDetail row={selectedRequest} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <span className="text-sm">Select a request to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal Tab Bar - Underline style
function MinimalTabs({
  activeTab,
  onChange,
}: {
  activeTab: "inspect" | "send";
  onChange: (tab: "inspect" | "send") => void;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-border-subtle">
      <button
        onClick={() => onChange("inspect")}
        className={`relative pb-3 text-sm font-medium transition-colors ${
          activeTab === "inspect"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <Eye className="size-4" />
          Inspect
        </span>
        {activeTab === "inspect" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </button>
      <button
        onClick={() => onChange("send")}
        className={`relative pb-3 text-sm font-medium transition-colors ${
          activeTab === "send"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <Send className="size-4" />
          Send Test
        </span>
        {activeTab === "send" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </button>
    </div>
  );
}

// Section Header
function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {badge && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-surface px-2.5 py-1 rounded-full border border-border-subtle">
          {badge}
        </span>
      )}
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
    <div className="min-h-full w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          {/*  <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center">
            <Webhook className="size-5 text-primary" />
          </div> */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Webhook Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Inspect and test HTTP webhooks
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive-subtle/50 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Endpoints Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-tight">
            Your Endpoints
          </h2>
          <span className="text-xs text-muted-foreground bg-surface px-2 py-1 rounded-full border border-border-subtle">
            {endpoints.length}/{MAX_ENDPOINTS_PER_WORKSPACE}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {endpoints.map((ep, index) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              index={index}
              isActive={ep.id === selectedId}
              onSelect={() => setSelectedId(ep.id)}
              onDelete={async () => {
                const r = await removeEndpointAction(ep.id);
                if (r.success) await refresh();
              }}
              canDelete={canDelete}
            />
          ))}
          {canAdd && !loadError && (
            <button
              onClick={async () => {
                const r = await createEndpointAction();
                if (r.success) {
                  setEndpoints((prev) => [...prev, r.endpoint]);
                  setSelectedId(r.endpoint.id);
                }
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 transition-all border-border-subtle hover:border-primary/30 hover:bg-primary-subtle/10 cursor-pointer"
            >
              <Plus className="size-5" />
              <span className="text-xs font-medium">Add endpoint</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {selected ? (
        <div className="space-y-6">
          {/* Minimal Tab Navigation */}
          <MinimalTabs activeTab={activeTab} onChange={setActiveTab} />

          {/* Inspect Tab */}
          {activeTab === "inspect" && (
            <div className="space-y-6">
              {/* Single URL Card */}
              <UrlCard url={ingestUrl} />

              {/* Requests Section */}
              <div>
                {/*  <SectionHeader
                  title="Incoming Requests"
                  badge={loadError ? "Offline" : "Live"}
                /> */}

                {loadError ? (
                  <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 py-16 text-center">
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

          {/* Send Test Tab */}
          {activeTab === "send" && (
            <WebhookSendTest selectedIngestUrl={ingestUrl || null} />
          )}
        </div>
      ) : (
        <EmptyState message="Select an endpoint to get started" />
      )}
    </div>
  );
}
