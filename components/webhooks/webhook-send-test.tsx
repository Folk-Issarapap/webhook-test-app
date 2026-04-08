"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getBodyTemplateById,
  getHeaderTemplateById,
  SEND_TEST_BODY_TEMPLATES,
  SEND_TEST_HEADER_TEMPLATES,
} from "@/lib/webhooks/send-test-templates";
import { cn } from "@/lib/utils";

import { CopyTextButton } from "./copy-url-button";

const METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

type TestWebhookSuccess = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated?: boolean;
  durationMs: number;
};

function tryFormatJson(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

type WebhookSendTestProps = {
  /** Selected endpoint’s webhook URL (optional shortcut to fill the request URL). */
  selectedIngestUrl: string | null;
};

export function WebhookSendTest({ selectedIngestUrl }: WebhookSendTestProps) {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<string>("POST");
  const [headersMode, setHeadersMode] = useState<"custom" | "template">(
    "template",
  );
  const [headersTemplateId, setHeadersTemplateId] = useState("json");
  const [headersText, setHeadersText] = useState(
    () => getHeaderTemplateById("json") ?? "{}",
  );
  const [bodyMode, setBodyMode] = useState<"custom" | "template">("template");
  const [bodyTemplateId, setBodyTemplateId] = useState("hello");
  const [body, setBody] = useState(
    () => getBodyTemplateById("hello") ?? "{}",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestWebhookSuccess | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const applySelectedUrl = useCallback(() => {
    if (selectedIngestUrl) setUrl(selectedIngestUrl);
  }, [selectedIngestUrl]);

  const send = useCallback(async () => {
    setClientError(null);
    setResult(null);

    let headersObj: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(headersText || "{}");
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        setClientError("Headers must be a JSON object.");
        return;
      }
      headersObj = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== "string") {
          setClientError(`Header "${k}" must be a string value.`);
          return;
        }
        headersObj[k] = v;
      }
    } catch {
      setClientError("Headers must be valid JSON.");
      return;
    }

    const skipBody = method === "GET" || method === "HEAD";

    setLoading(true);
    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          method,
          headers: headersObj,
          body: skipBody ? null : body,
        }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setClientError("Invalid response from server.");
        return;
      }

      if (!res.ok) {
        const err = data as { error?: string };
        setClientError(
          typeof err.error === "string" ? err.error : "Request failed",
        );
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "status" in data &&
        "headers" in data
      ) {
        setResult(data as TestWebhookSuccess);
      } else {
        setClientError("Unexpected response from server.");
      }
    } catch {
      setClientError("Network error — could not reach the test endpoint.");
    } finally {
      setLoading(false);
    }
  }, [url, method, headersText, body]);

  const responseHeadersText = result
    ? JSON.stringify(result.headers, null, 2)
    : "";
  const responseBodyDisplay = result ? tryFormatJson(result.body) : "";
  const responseMetaClass = result
    ? result.status >= 200 && result.status < 300
      ? "text-emerald-700 dark:text-emerald-300"
      : result.status >= 300 && result.status < 400
        ? "text-amber-700 dark:text-amber-300"
        : "text-rose-700 dark:text-rose-300"
    : "text-muted-foreground";

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-2 lg:gap-5 lg:items-stretch">
      {/* Request (left on lg) */}
      <div className="bg-muted/20 ring-border/45 flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain rounded-2xl p-4 ring-1 [scrollbar-gutter:stable] md:p-5">
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          The request runs from this app&apos;s server (helps with providers
          that block browser CORS).{" "}
          <code className="font-mono text-xs">http</code> /{" "}
          <code className="font-mono text-xs">https</code> only, 30s timeout.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="test-webhook-url">Request URL</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={!selectedIngestUrl}
                onClick={applySelectedUrl}
              >
                Use selected webhook URL
              </Button>
            </div>
            <Input
              id="test-webhook-url"
              className="font-mono text-sm"
              placeholder="https://example.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-[130px] bg-background font-mono text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="gap-2"
              disabled={loading || !url.trim()}
              onClick={() => void send()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              Send request
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label htmlFor="test-headers">Headers (JSON object)</Label>
              <div className="bg-muted/60 flex shrink-0 rounded-lg p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    headersMode === "custom"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setHeadersMode("custom")}
                >
                  Custom
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    headersMode === "template"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setHeadersMode("template");
                    setHeadersText(
                      getHeaderTemplateById(headersTemplateId) ?? "{}",
                    );
                  }}
                >
                  Template
                </button>
              </div>
            </div>
            {headersMode === "template" ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-normal">
                  Preset
                </Label>
                <Select
                  value={headersTemplateId}
                  onValueChange={(id) => {
                    setHeadersTemplateId(id);
                    setHeadersText(getHeaderTemplateById(id) ?? "{}");
                  }}
                >
                  <SelectTrigger className="w-full max-w-md font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEND_TEST_HEADER_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Textarea
              id="test-headers"
              className={cn(
                "min-h-[100px] font-mono text-xs",
                headersMode === "template" && "bg-muted/40 text-muted-foreground",
              )}
              value={headersText}
              readOnly={headersMode === "template"}
              onChange={(e) => setHeadersText(e.target.value)}
              spellCheck={false}
            />
            {headersMode === "template" ? (
              <p className="text-muted-foreground text-xs">
                Switch to <span className="font-medium">Custom</span> to edit
                headers freely.
              </p>
            ) : null}
          </div>

          {method !== "GET" && method !== "HEAD" ? (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label htmlFor="test-body">Body</Label>
                <div className="bg-muted/60 flex shrink-0 rounded-lg p-0.5">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      bodyMode === "custom"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setBodyMode("custom")}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      bodyMode === "template"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setBodyMode("template");
                      setBody(getBodyTemplateById(bodyTemplateId) ?? "{}");
                    }}
                  >
                    Template
                  </button>
                </div>
              </div>
              {bodyMode === "template" ? (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs font-normal">
                    Preset
                  </Label>
                  <Select
                    value={bodyTemplateId}
                    onValueChange={(id) => {
                      setBodyTemplateId(id);
                      setBody(getBodyTemplateById(id) ?? "{}");
                    }}
                  >
                    <SelectTrigger className="w-full max-w-md font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEND_TEST_BODY_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Textarea
                id="test-body"
                className={cn(
                  "min-h-[140px] font-mono text-xs",
                  bodyMode === "template" && "bg-muted/40 text-muted-foreground",
                )}
                value={body}
                readOnly={bodyMode === "template"}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
              />
              {bodyMode === "template" ? (
                <p className="text-muted-foreground text-xs">
                  Switch to <span className="font-medium">Custom</span> to edit
                  the body freely.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Body is omitted for {method} requests.
            </p>
          )}
        </div>

        {clientError ? (
          <p className="text-destructive mt-4 text-sm" role="alert">
            {clientError}
          </p>
        ) : null}
      </div>

      {/* Response (right on lg) */}
      <div className="bg-muted/20 ring-border/45 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl ring-1">
        {result ? (
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] md:p-5"
            aria-live="polite"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-base font-medium tracking-tight">
                Response
              </h3>
              <span className={cn("font-mono text-xs", responseMetaClass)}>
                {result.durationMs} ms · HTTP {result.status}
                {result.statusText ? ` ${result.statusText}` : ""}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                    Response headers
                  </p>
                  <CopyTextButton text={responseHeadersText} label="Copy" />
                </div>
                <pre className="ui-code-well max-h-[min(14rem,32vh)] overflow-y-auto rounded-xl p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
                  {responseHeadersText || "—"}
                </pre>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                    Response body
                  </p>
                  <CopyTextButton text={responseBodyDisplay} label="Copy" />
                </div>
                <pre className="ui-code-well max-h-[min(22rem,42vh)] overflow-y-auto rounded-xl p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap md:text-xs">
                  {responseBodyDisplay || "—"}
                </pre>
                {result.truncated ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Response body was truncated for display.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex min-h-40 flex-1 items-center justify-center px-6 text-center text-sm leading-relaxed lg:min-h-0">
            Response status, headers, and body will show here after you send a
            request.
          </div>
        )}
      </div>
    </div>
  );
}
