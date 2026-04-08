"use client";

import { format, formatDistanceToNow } from "date-fns";
import { enUS, th as thDateLocale } from "date-fns/locale";
import { Plus, Radio, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { getHttpMethodBadgeClass } from "@/lib/http-method-styles";
import { MAX_ENDPOINTS_PER_WORKSPACE } from "@/lib/webhooks/constants";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";
import { buildIngestUrl } from "@/lib/webhooks/urls";
import type { WebhookRequestRow } from "@/schemas/webhook";

import { CopyTextButton, CopyUrlButton } from "./copy-url-button";
import { WebhookSendTest } from "./webhook-send-test";
import { WorkspaceLoadingSkeleton } from "./workspace-loading-skeleton";
import { WorkspaceTrafficGuide } from "./workspace-traffic-guide";

const endpointActiveClass =
  "bg-primary/14 text-foreground ring-1 ring-primary/30 dark:bg-primary/18";

function tryFormatJson(raw: string | null, empty: string): string {
  if (!raw) return empty;
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

function parseHeadersEntries(raw: string): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return [];
    }
    return Object.entries(parsed).map(([k, v]) => [
      k,
      typeof v === "string" ? v : JSON.stringify(v),
    ]);
  } catch {
    return [];
  }
}

type WebhookWorkspaceProps = {
  origin: string;
  routeBasePath?: string;
};

export function WebhookWorkspace({
  origin,
  routeBasePath = "/webhook",
}: WebhookWorkspaceProps) {
  const router = useRouter();
  const params = useParams();
  const locale =
    typeof params.locale === "string" ? params.locale : routing.defaultLocale;
  const t = useTranslations("workspace");
  const tSite = useTranslations("site");
  const tCommon = useTranslations("common");
  const dateLocale = locale === "th" ? thDateLocale : enUS;
  const [ready, setReady] = useState(false);
  const [endpoints, setEndpoints] = useState<WorkspaceEndpointDto[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requests, setRequests] = useState<WebhookRequestRow[]>([]);
  /** Avoid showing rows from a previous endpoint while the first poll is in flight. */
  const [lastFetchEndpointId, setLastFetchEndpointId] = useState<string | null>(
    null,
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [mainTab, setMainTab] = useState<"traffic" | "send">("traffic");

  const selectEndpoint = useCallback((id: string) => {
    setSelectedEndpointId(id);
    setSelectedRequestId(null);
  }, []);

  const refresh = useCallback(async () => {
    const r = await bootstrapWorkspaceAction();
    if (!r.success) {
      setLoadError(r.message);
      return;
    }
    setLoadError(null);
    setEndpoints(r.endpoints);
    setSelectedRequestId(null);
    setSelectedEndpointId((prev) => {
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
        const path =
          routeBasePath === "/"
            ? `/${locale}`
            : `/${locale}${routeBasePath}`;
        router.replace(path, { scroll: false });
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
      setSelectedRequestId(null);
      setSelectedEndpointId((prev) => {
        if (prev && r.endpoints.some((e) => e.id === prev)) return prev;
        return r.endpoints[0]?.id ?? null;
      });
      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, routeBasePath, locale]);

  const selected = useMemo(() => {
    if (!selectedEndpointId) return null;
    return endpoints.find((e) => e.id === selectedEndpointId) ?? null;
  }, [endpoints, selectedEndpointId]);

  useEffect(() => {
    if (!selected?.id || loadError) {
      return;
    }

    let cancelled = false;
    const endpointId = selected.id;

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
        setLastFetchEndpointId(endpointId);
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
  }, [selected?.id, loadError]);

  const visibleRequests = useMemo(() => {
    if (!selected?.id) return [];
    if (selected.id !== lastFetchEndpointId) return [];
    return requests;
  }, [selected?.id, lastFetchEndpointId, requests]);

  const ingestUrl = selected
    ? buildIngestUrl(
        origin || "http://localhost",
        selected.publicSlug,
        selected.secretToken,
      )
    : "";

  const selectedRequest = useMemo(
    () => visibleRequests.find((r) => r.id === selectedRequestId) ?? null,
    [visibleRequests, selectedRequestId],
  );

  const headersEntries = useMemo(
    () => (selectedRequest ? parseHeadersEntries(selectedRequest.headers) : []),
    [selectedRequest],
  );

  const bodyDisplay = useMemo(
    () =>
      selectedRequest
        ? tryFormatJson(selectedRequest.body, tCommon("dash"))
        : "",
    [selectedRequest, tCommon],
  );

  const headersCopyText = useMemo(
    () =>
      selectedRequest ? tryFormatHeadersJson(selectedRequest.headers) : "",
    [selectedRequest],
  );

  const deleteRequest = useCallback(
    async (requestId: string) => {
      if (!selected?.id) return;
      try {
        const res = await fetch(
          `/api/workspace-endpoints/${encodeURIComponent(selected.id)}/requests/${encodeURIComponent(requestId)}`,
          { method: "DELETE", credentials: "same-origin" },
        );
        if (!res.ok) return;
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setSelectedRequestId((id) => (id === requestId ? null : id));
      } catch {
        /* ignore */
      }
    },
    [selected],
  );

  const canAdd = endpoints.length < MAX_ENDPOINTS_PER_WORKSPACE;

  if (!ready) {
    return (
      <div className="text-foreground flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 md:px-6">
        <WorkspaceLoadingSkeleton />
      </div>
    );
  }

  const showTrafficGuide =
    !!selected && !loadError && visibleRequests.length === 0;

  return (
    <div
      className="text-foreground flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      data-workspace-root
    >
      {loadError ? (
        <div
          className="border-destructive/30 bg-destructive/8 text-destructive shrink-0 border-b px-4 py-2 text-sm"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,26rem)_1fr] md:grid-rows-[auto_1fr] md:gap-0 md:overflow-hidden">
        {/* Left: endpoints + URL + request list */}
        <aside
          className={cn(
            "border-border/60 flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b",
            "max-h-[min(52vh,28rem)] md:max-h-none md:contents md:w-auto md:max-w-none md:border-0",
            "bg-muted/15 md:bg-transparent",
          )}
        >
          {/* Row 1 / col 1 (md): title only — border-b aligns with tab row */}
          <div className="border-border/50 shrink-0 border-b px-4 py-4 md:col-start-1 md:row-start-1 md:border-border/60 md:border-r md:bg-muted/15">
            <p className="text-foreground/90 font-semibold tracking-tight">
              {tSite("title")}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
              {t("sessionSubtitle")}
            </p>
          </div>

          {/* Row 2 / col 1 (md): webhooks + ingest + requests list */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:col-start-1 md:row-start-2 md:min-h-0 md:border-r md:border-border/60 md:bg-muted/15">
            <div className="shrink-0 space-y-3 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  {t("webhooks")}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                  {endpoints.length}/{MAX_ENDPOINTS_PER_WORKSPACE}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {endpoints.map((ep, index) => {
                  const active = ep.id === selectedEndpointId;
                  const canDelete = endpoints.length > 1;
                  return (
                    <div
                      key={ep.id}
                      className="bg-background/50 flex max-w-full items-center rounded-lg p-0.5 ring-1 ring-border/40"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => selectEndpoint(ep.id)}
                        className={cn(
                          "h-8 max-w-42 truncate rounded-md px-2.5 text-xs",
                          active
                            ? endpointActiveClass
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={ep.publicSlug}
                      >
                        <span className="text-muted-foreground mr-1 font-mono text-[10px]">
                          {index + 1}
                        </span>
                        <span className="font-mono">{ep.publicSlug}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7 shrink-0 rounded-md"
                        disabled={!canDelete}
                        title={
                          canDelete ? t("removeWebhook") : t("oneWebhookRequired")
                        }
                        aria-label={t("deleteWebhook")}
                        onClick={async () => {
                          const r = await removeEndpointAction(ep.id);
                          if (r.success) await refresh();
                        }}
                      >
                        <Trash2 className="size-3" aria-hidden />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-dashed text-xs"
                  disabled={!canAdd || !!loadError}
                  onClick={async () => {
                    const r = await createEndpointAction();
                    if (r.success) {
                      setEndpoints((prev) => [...prev, r.endpoint]);
                      selectEndpoint(r.endpoint.id);
                    }
                  }}
                >
                  <Plus className="size-3.5" aria-hidden />
                  {t("newWebhook")}
                </Button>
              </div>
            </div>

            {selected ? (
              <div className="shrink-0 space-y-2 px-4 pb-3">
                <div className="bg-background/60 ring-border/45 rounded-xl p-3 ring-1">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                        {t("webhookUrl")}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {t("webhookUrlHint")}
                      </span>
                    </div>
                    <CopyUrlButton url={ingestUrl} />
                  </div>
                  <p className="font-mono text-[11px] bg-muted/30 rounded-lg p-3 leading-snug break-all text-foreground/90">
                    {ingestUrl}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="border-border/50 flex min-h-0 flex-1 flex-col border-t">
              <div className="text-muted-foreground flex shrink-0 items-center justify-between px-4 py-2 text-[11px] font-medium tracking-wide uppercase">
                <span className="flex items-center gap-1.5">
                  <Radio className="size-3" aria-hidden />
                  {t("requests")}
                </span>
                <Badge
                  variant="outline"
                  className="border-primary/25 bg-primary/8 text-[10px] font-normal text-primary"
                >
                  {loadError ? t("offline") : t("live")}
                </Badge>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 [scrollbar-gutter:stable]">
                {!selected ? (
                  <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                    {t("selectWebhook")}
                  </p>
                ) : loadError ? (
                  <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                    {t("dbUnavailable")}
                  </p>
                ) : visibleRequests.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-10 text-center text-xs leading-relaxed">
                    {t("noRequestsYet")}{" "}
                    <button
                      type="button"
                      className="text-primary font-medium underline-offset-2 hover:underline"
                      onClick={() => setMainTab("send")}
                    >
                      {t("sendTest")}
                    </button>{" "}
                    →
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {visibleRequests.map((row) => {
                      const active = row.id === selectedRequestId;
                      return (
                        <li key={row.id}>
                          <div
                            className={cn(
                              "group flex w-full items-stretch gap-0.5 rounded-lg transition-colors",
                              active
                                ? "bg-primary/12 ring-1 ring-primary/25"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequestId(row.id);
                                setMainTab("traffic");
                              }}
                              className="min-w-0 flex-1 px-2.5 py-2.5 text-left"
                            >
                              <div className="flex items-baseline gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-5 px-1.5 font-mono text-[10px] font-semibold",
                                    getHttpMethodBadgeClass(row.method),
                                  )}
                                >
                                  {row.method}
                                </Badge>
                                <span className="text-muted-foreground font-mono text-[10px]">
                                  {format(row.created_at * 1000, "d MMM HH:mm:ss", {
                                    locale: dateLocale,
                                  })}
                                </span>
                              </div>
                              <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                                {row.path || "/"}
                              </p>
                              <p className="text-muted-foreground/80 mt-0.5 text-[10px]">
                                {formatDistanceToNow(row.created_at * 1000, {
                                  addSuffix: true,
                                  locale: dateLocale,
                                })}
                              </p>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive size-9 shrink-0 self-center rounded-md opacity-60 group-hover:opacity-100"
                              title={t("removeFromList")}
                              aria-label={t("deleteRequest")}
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteRequest(row.id);
                              }}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right: detail + send test — tab row aligns with left header row on md (grid row 1) */}
        <section className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:contents">
          <Tabs
            value={mainTab}
            onValueChange={(v) => {
              if (v === "traffic" || v === "send") setMainTab(v);
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:contents"
          >
            <div className="border-border/60 shrink-0 border-b px-4 pt-3 md:col-start-2 md:row-start-1 md:flex md:h-full md:min-h-0 md:flex-col md:justify-end md:border-border/60 md:bg-background md:px-6 md:pb-3 md:pt-4">
              <TabsList className="bg-muted/40 h-9 w-full max-w-xs gap-1 rounded-lg p-0.5 ring-1 ring-border/40">
                <TabsTrigger
                  value="traffic"
                  className="data-active:bg-background flex-1 rounded-[7px] text-xs font-medium data-active:shadow-sm"
                >
                  {t("traffic")}
                </TabsTrigger>
                <TabsTrigger
                  value="send"
                  className="data-active:bg-background flex-1 rounded-[7px] text-xs font-medium data-active:shadow-sm"
                >
                  {t("sendTestTab")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="traffic"
              className="flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none md:col-start-2 md:row-start-2 md:min-h-0 md:overflow-hidden"
            >
              <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-8 md:py-6 [scrollbar-gutter:stable]">
                {!selected ? (
                  <p className="text-muted-foreground text-sm">
                    {t("chooseWebhookLeft")}
                  </p>
                ) : showTrafficGuide ? (
                  <WorkspaceTrafficGuide />
                ) : !selectedRequest ? (
                  <div className="flex min-h-[min(24rem,50dvh)] flex-col items-center justify-center py-12 text-center">
                    <p className="text-foreground text-lg font-medium tracking-tight">
                      {t("selectRequest")}
                    </p>
                    <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
                      {t("selectRequestHint")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <p className="font-mono text-xl font-semibold tracking-tight md:text-2xl">
                        <span className="text-primary">
                          {selectedRequest.method}
                        </span>{" "}
                        <span className="text-foreground/90">
                          {selectedRequest.path || "/"}
                        </span>
                      </p>
                      <p className="text-muted-foreground mt-2 font-mono text-xs">
                        {format(
                          selectedRequest.created_at * 1000,
                          "d MMM yyyy HH:mm:ss.SSS",
                          { locale: dateLocale },
                        )}{" "}
                        ·{" "}
                        {formatDistanceToNow(
                          selectedRequest.created_at * 1000,
                          {
                            addSuffix: true,
                            locale: dateLocale,
                          },
                        )}
                      </p>
                    </div>

                    {selectedRequest.source_note ? (
                      <div>
                        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                          {t("source")}
                        </p>
                        <div className="bg-muted/35 ring-border/40 rounded-lg p-3 text-sm ring-1">
                          {selectedRequest.source_note}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                          {t("headers")}
                        </p>
                        <CopyTextButton text={headersCopyText} />
                      </div>
                      {headersEntries.length === 0 ? (
                        <pre className="bg-muted/30 ring-border/35 font-mono text-xs break-all whitespace-pre-wrap rounded-lg p-3 ring-1">
                          {headersCopyText}
                        </pre>
                      ) : (
                        <div className="ring-border/40 overflow-hidden rounded-lg ring-1">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="text-muted-foreground w-[38%] pl-3 font-mono text-xs font-normal">
                                  {t("headerName")}
                                </TableHead>
                                <TableHead className="text-muted-foreground font-mono text-xs font-normal">
                                  {t("headerValue")}
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {headersEntries.map(([k, v]) => (
                                <TableRow
                                  key={k}
                                  className="border-border/40 hover:bg-muted/25"
                                >
                                  <TableCell className="max-w-40 truncate font-mono text-xs align-top">
                                    {k}
                                  </TableCell>
                                  <TableCell className="font-mono text-[11px] leading-relaxed break-all whitespace-normal text-foreground/90">
                                    {v}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                          {t("body")}
                        </p>
                        <CopyTextButton text={bodyDisplay} />
                      </div>
                      <pre className="bg-muted/30 ring-border/35 max-h-[min(22rem,38vh)] overflow-y-auto rounded-lg p-4 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap ring-1 md:text-xs">
                        {bodyDisplay}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="send"
              className="flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none md:col-start-2 md:row-start-2 md:min-h-0 md:overflow-hidden"
            >
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-5">
                <WebhookSendTest
                  selectedIngestUrl={selected ? ingestUrl || null : null}
                />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
