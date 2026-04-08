"use client";

import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  attachEndpointByTokensAction,
  bootstrapWorkspaceAction,
  createEndpointAction,
  removeEndpointAction,
  type WorkspaceEndpointDto,
} from "@/actions/webhooks/workspace-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHttpMethodBadgeClass } from "@/lib/http-method-styles";
import { cn } from "@/lib/utils";
import { MAX_ENDPOINTS_PER_WORKSPACE } from "@/lib/webhooks/constants";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";
import { buildIngestUrl } from "@/lib/webhooks/urls";
import type { WebhookRequestRow } from "@/schemas/webhook";

import { CopyTextButton, CopyUrlButton } from "./copy-url-button";
import { WebhookSendTest } from "./webhook-send-test";
import { WorkspaceLoadingSkeleton } from "./workspace-loading-skeleton";

/** Tabs: line style — inactive fades, active bold + visible underline (see ui/tabs ::after). */
const tabTriggerClass = cn(
  "relative flex-none rounded-none px-0.5 py-2.5 text-sm font-medium transition-colors duration-200",
  "border-0 bg-transparent shadow-none ring-0 outline-none",
  "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
  "data-[state=active]:text-zinc-950 data-[state=active]:font-semibold dark:data-[state=active]:text-zinc-50",
  // Ensure Radix `data-state=active` drives the line indicator (tabs.tsx uses `data-active` in some slots)
  "data-[state=active]:after:opacity-100",
  // Stronger, slightly thicker indicator than default 0.5 — reads clearly on off-white
  "after:bottom-[-1px] after:h-[3px] after:rounded-full after:bg-zinc-900 after:opacity-0 dark:after:bg-zinc-100",
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

function parseHeadersToEntries(raw: string): {
  entries: [string, string][];
  rawFallback: string | null;
} {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>).map(
        ([k, v]) =>
          [k, typeof v === "string" ? v : JSON.stringify(v)] as [
            string,
            string,
          ],
      );
      return { entries, rawFallback: null };
    }
  } catch {
    /* use raw */
  }
  return { entries: [], rawFallback: raw };
}

function shortRequestId(id: string): string {
  const alphanumeric = id.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumeric.length >= 6) return alphanumeric.slice(0, 6);
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function RequestDetailPanel({
  row,
  ingestUrl,
}: {
  row: WebhookRequestRow;
  ingestUrl: string;
}) {
  const headersText = useMemo(
    () => tryFormatHeadersJson(row.headers),
    [row.headers],
  );
  const bodyText = useMemo(() => tryFormatJson(row.body), [row.body]);
  const { entries: headerEntries, rawFallback } = useMemo(
    () => parseHeadersToEntries(row.headers),
    [row.headers],
  );

  const receivedAt = useMemo(
    () => new Date(row.created_at * 1000),
    [row.created_at],
  );

  const pathDisplay = row.path || "/";

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <div className="border-border mb-3 border-b pb-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Ingest URL
            </span>
            <CopyUrlButton url={ingestUrl} label="Copy" />
          </div>
          <code className="ui-code-well text-foreground block w-full rounded-md px-2.5 py-2 font-mono text-[11px] leading-relaxed break-all md:text-xs">
            {ingestUrl}
          </code>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 font-mono text-[11px] font-semibold tracking-wide",
              getHttpMethodBadgeClass(row.method),
            )}
          >
            {row.method}
          </Badge>
          <h2 className="text-foreground min-w-0 break-all font-mono text-base font-semibold tracking-tight md:text-lg">
            {pathDisplay}
          </h2>
        </div>
        {row.source_note ? (
          <p className="text-muted-foreground mt-1.5 text-xs md:text-sm">
            {row.source_note}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1.5 text-xs md:text-sm">
            <time dateTime={receivedAt.toISOString()}>
              {formatDistanceToNow(receivedAt, { addSuffix: true })}
            </time>
          </p>
        )}
        <p className="text-muted-foreground/90 mt-1 font-mono text-[11px] break-all">
          {row.id}
        </p>
      </div>

      <Card size="sm" className="shadow-none">
        <CardHeader className="border-border flex flex-row items-center justify-between space-y-0 border-b pb-3">
          <CardTitle className="text-base font-medium">Headers</CardTitle>
          <CopyTextButton text={headersText} label="Copy" />
        </CardHeader>
        <CardContent className="pt-3">
          {rawFallback ? (
            <pre className="ui-code-well max-h-[min(20rem,40vh)] overflow-auto rounded-lg p-3.5 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap md:text-[15px] md:leading-[1.55]">
              {rawFallback}
            </pre>
          ) : (
            <div className="max-h-[min(20rem,40vh)] overflow-auto rounded-md border border-border/80">
              <Table>
                <TableBody>
                  {headerEntries.map(([name, value]) => (
                    <TableRow
                      key={name}
                      className="border-border/80 hover:bg-muted/40"
                    >
                      <TableCell className="text-muted-foreground max-w-[40%] py-2 align-top font-mono text-sm font-medium break-all whitespace-normal md:text-[15px]">
                        {name}
                      </TableCell>
                      <TableCell className="py-2 align-top font-mono text-sm break-all whitespace-normal md:text-[15px] md:leading-snug">
                        {value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="shadow-none">
        <CardHeader className="border-border flex flex-row items-center justify-between space-y-0 border-b pb-3">
          <CardTitle className="text-base font-medium">Body</CardTitle>
          <CopyTextButton text={bodyText} label="Copy" />
        </CardHeader>
        <CardContent className="pt-3">
          <pre className="ui-code-well max-h-[min(28rem,50vh)] overflow-auto rounded-lg p-3.5 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap md:text-[15px] md:leading-[1.55]">
            {bodyText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

type WebhookWorkspaceProps = {
  origin: string;
  /** Where to stay after `?slug=&token=` attach (default `/webhook`). */
  routeBasePath?: string;
  /** Hide the marketing-style header (e.g. when the parent page already has a hero). */
  showHeader?: boolean;
};

type EndpointRequestInspectorProps = {
  endpoints: WorkspaceEndpointDto[];
  selectedEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  ingestUrl: string;
  canAdd: boolean;
  canDelete: boolean;
  addDisabled: boolean;
  onAddEndpoint: () => void;
  onDeleteEndpoint: () => void;
};

function EndpointRequestInspector({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  ingestUrl,
  canAdd,
  canDelete,
  addDisabled,
  onAddEndpoint,
  onDeleteEndpoint,
}: EndpointRequestInspectorProps) {
  const [requests, setRequests] = useState<WebhookRequestRow[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const [enterIds, setEnterIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    isFirstLoadRef.current = true;
    seenIdsRef.current = new Set();
    setEnterIds(new Set());
  }, [selectedEndpointId]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/workspace-endpoints/${encodeURIComponent(selectedEndpointId)}/requests`,
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
  }, [selectedEndpointId]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (requests.length === 0) {
        setSelectedRequestId(null);
        return;
      }
      setSelectedRequestId((prev) => {
        if (prev && requests.some((r) => r.id === prev)) return prev;
        return requests[0]!.id;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [requests]);

  const selectedRow = useMemo(() => {
    if (!selectedRequestId) return null;
    return requests.find((r) => r.id === selectedRequestId) ?? null;
  }, [requests, selectedRequestId]);

  return (
    <div
      className={cn(
        "border-border bg-background ui-surface-shadow flex flex-col overflow-hidden rounded-xl border lg:min-h-[min(32rem,calc(100vh-14rem))] lg:flex-row",
      )}
    >
      <aside
        className={cn(
          "border-border flex w-full flex-col border-b lg:w-[min(100%,260px)] lg:shrink-0 lg:border-r lg:border-b-0",
        )}
      >
        <div className="border-border flex flex-wrap items-center gap-1.5 border-b px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Select
              value={selectedEndpointId}
              onValueChange={onSelectEndpoint}
              disabled={endpoints.length === 0}
            >
              <SelectTrigger
                size="sm"
                className="border-border h-9 w-full font-mono text-xs"
                aria-label="Endpoint"
              >
                <SelectValue placeholder="Select endpoint" />
              </SelectTrigger>
              <SelectContent>
                {endpoints.map((ep) => (
                  <SelectItem key={ep.id} value={ep.id}>
                    <span className="font-mono text-xs">{ep.publicSlug}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 rounded-md border-dashed border-stone-300 px-2 text-xs dark:border-stone-600"
            disabled={!canAdd || addDisabled}
            onClick={onAddEndpoint}
          >
            <Plus className="size-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-md text-muted-foreground hover:text-destructive"
            disabled={!canDelete}
            title={
              canDelete
                ? "Delete this endpoint"
                : "At least one endpoint is required"
            }
            aria-label="Delete endpoint"
            onClick={onDeleteEndpoint}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
        <ul
          className="max-h-[min(220px,38vh)] flex-1 overflow-y-auto lg:max-h-none"
          role="listbox"
          aria-label="Incoming requests"
        >
          {requests.length === 0 ? (
            <li className="text-muted-foreground px-3 py-8 text-center text-xs">
              No requests yet.
            </li>
          ) : (
            requests.map((row) => {
              const active = row.id === selectedRequestId;
              const animateIn = enterIds.has(row.id);
              return (
                <li
                  key={row.id}
                  className={animateIn ? "animate-request-enter" : undefined}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setSelectedRequestId(row.id)}
                    className={cn(
                      "flex w-full items-start gap-2 border-l-[3px] px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-primary/8 border-l-primary"
                        : "border-l-transparent hover:bg-muted/50",
                    )}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-0.5 shrink-0 font-mono text-[10px] font-semibold",
                        getHttpMethodBadgeClass(row.method),
                      )}
                    >
                      {row.method}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-mono text-[11px] font-medium tracking-tight">
                        {shortRequestId(row.id)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 font-mono text-[10px] break-all">
                        {row.path || "/"}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {formatDistanceToNow(row.created_at * 1000, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 p-4 md:p-5">
        {requests.length === 0 ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Ingest URL
                </span>
                <CopyUrlButton url={ingestUrl} label="Copy" />
              </div>
              <code className="ui-code-well text-foreground block w-full rounded-md px-2.5 py-2 font-mono text-[11px] leading-relaxed break-all md:text-xs">
                {ingestUrl}
              </code>
            </div>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              No requests yet. Send traffic here or use{" "}
              <span className="text-foreground">Send test</span>.
            </p>
          </div>
        ) : selectedRow ? (
          <RequestDetailPanel row={selectedRow} ingestUrl={ingestUrl} />
        ) : (
          <p className="text-muted-foreground text-sm">Select a request.</p>
        )}
      </main>
    </div>
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

  const canAdd = endpoints.length < MAX_ENDPOINTS_PER_WORKSPACE;
  const canDeleteEndpoint = endpoints.length > 1;

  const handleAddEndpoint = useCallback(async () => {
    const r = await createEndpointAction();
    if (r.success) {
      setEndpoints((prev) => [...prev, r.endpoint]);
      setSelectedId(r.endpoint.id);
    }
  }, []);

  const handleDeleteSelectedEndpoint = useCallback(async () => {
    if (!selectedId || endpoints.length <= 1) return;
    const r = await removeEndpointAction(selectedId);
    if (r.success) await refresh();
  }, [selectedId, endpoints.length, refresh]);

  if (!ready) {
    return (
      <div className="bg-background text-foreground min-h-[36vh]">
        <WorkspaceLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-full">
      <div className={cn(showHeader ? "py-6 md:py-8" : "pb-0 pt-0")}>
        {showHeader ? (
          <header className="mb-6 border-border border-b pb-6">
            <h1 className="text-xl font-medium tracking-tight">Workspace</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Up to {MAX_ENDPOINTS_PER_WORKSPACE} endpoints in this browser.
            </p>
          </header>
        ) : null}

        {loadError ? (
          <div
            className="mb-6 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-foreground dark:border-stone-600 dark:bg-stone-900/40"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        <div className="space-y-6 md:space-y-7">
          <Tabs defaultValue="inspect" className="w-full">
            <TabsList
              variant="line"
              className="mb-8 h-auto w-full justify-start gap-10 rounded-none border-0 border-b border-zinc-200/80 bg-transparent p-0 dark:border-zinc-800/80"
            >
              <TabsTrigger value="inspect" className={tabTriggerClass}>
                Inspect
              </TabsTrigger>
              <TabsTrigger value="send" className={tabTriggerClass}>
                Send test
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inspect" className="mt-0 space-y-4">
              {!selected ? (
                <p className="text-muted-foreground text-sm">
                  Add an endpoint from the Inspect tab.
                </p>
              ) : (
                <>
                  {loadError ? (
                    <div className="border-border text-muted-foreground ui-surface-shadow rounded-xl border border-dashed bg-background py-12 text-center text-sm">
                      Connect the database to load requests.
                    </div>
                  ) : (
                    <EndpointRequestInspector
                      key={selected.id}
                      endpoints={endpoints}
                      selectedEndpointId={selected.id}
                      onSelectEndpoint={setSelectedId}
                      ingestUrl={ingestUrl}
                      canAdd={canAdd}
                      canDelete={canDeleteEndpoint}
                      addDisabled={!!loadError}
                      onAddEndpoint={() => void handleAddEndpoint()}
                      onDeleteEndpoint={() =>
                        void handleDeleteSelectedEndpoint()
                      }
                    />
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="send" className="mt-0 space-y-4">
              {!selected ? (
                <p className="text-muted-foreground text-sm">
                  Select an endpoint first.
                </p>
              ) : null}
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
