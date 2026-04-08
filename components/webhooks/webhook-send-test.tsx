"use client";

import {
  Loader2,
  Send,
  Terminal,
  Copy,
  Check,
  FileJson,
  Table,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KeyValueInput } from "@/components/key-value-input";
import { JsonDisplay } from "@/components/syntax-highlighter";
import { Badge } from "@/components/ui/badge";

type TestWebhookSuccess = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated?: boolean;
  durationMs: number;
};

const METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [text]);
  return { copied, copy };
}

// Helper: Convert key-value to JSON
function kvToJson(kv: Record<string, string | number | boolean>): string {
  return JSON.stringify(kv, null, 2);
}

function jsonToKv(json: string): Record<string, string | number | boolean> {
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, string | number | boolean>;
    }
  } catch {}
  return {};
}

// Toggle Button Component
function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-surface"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

// Simple Data Panel - Only Key:Value / JSON toggle
function DataPanel({
  title,
  icon: Icon,
  mode,
  onModeChange,
  kvValue,
  onKvChange,
  jsonValue,
  onJsonChange,
  disabled,
}: {
  title: string;
  icon: React.ElementType;
  mode: "keyvalue" | "json";
  onModeChange: (m: "keyvalue" | "json") => void;
  kvValue: Record<string, string | number | boolean>;
  onKvChange: (v: Record<string, string | number | boolean>) => void;
  jsonValue: string;
  onJsonChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isHeaders = title === "Headers";

  // Sync data when switching modes
  const handleToggle = (newMode: "keyvalue" | "json") => {
    if (newMode === mode) return;

    if (mode === "keyvalue" && newMode === "json") {
      // Convert KV to JSON
      onJsonChange(JSON.stringify(kvValue, null, 2));
    } else if (mode === "json" && newMode === "keyvalue") {
      // Convert JSON to KV
      const parsed = jsonToKv(jsonValue);
      onKvChange(parsed);
    }

    onModeChange(newMode);
  };

  if (disabled) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Not applicable for this HTTP method
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 ">
          <ToggleButton
            active={mode === "keyvalue"}
            onClick={() => handleToggle("keyvalue")}
            icon={Table}
            label="Key:Value"
          />
          <ToggleButton
            active={mode === "json"}
            onClick={() => handleToggle("json")}
            icon={FileJson}
            label="JSON"
          />
        </div>
      </div>
      <div className="p-4">
        {mode === "keyvalue" ? (
          <div className="space-y-3">
            <KeyValueInput
              value={kvValue}
              onChange={onKvChange}
              placeholder={{ key: "field name", value: "value" }}
              autoParseValues={!isHeaders} // Headers: keep as strings, Body: auto-parse
            />
            {isHeaders ? (
              <div className="rounded-xl border border-border-subtle bg-background overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface/30 border-b border-border-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-1/3">
                        Key
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {Object.entries(kvValue).map(([key, value]) => (
                      <tr
                        key={key}
                        className="hover:bg-surface/20 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-xs font-medium text-foreground border-r border-border-subtle">
                          {key}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground break-all">
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  JSON Preview
                </p>
                <div className="text-xs">
                  <JsonDisplay data={kvValue} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 overflow-hidden">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Custom JSON
            </p>

            <Textarea
              className="rounded-lg font-mono text-sm min-h-[220px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed p-3"
              value={jsonValue}
              onChange={(e) => onJsonChange(e.target.value)}
              spellCheck={false}
              placeholder='{"hello": "world"}'
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Response Panel with syntax highlighting
function ResponsePanel({
  result,
  onClear,
}: {
  result: TestWebhookSuccess;
  onClear: () => void;
}) {
  const { copied: copiedHeaders, copy: copyHeaders } = useCopy(
    JSON.stringify(result.headers, null, 2),
  );
  const { copied: copiedBody, copy: copyBody } = useCopy(result.body);

  // Parse body for display
  const bodyData = useMemo(() => {
    try {
      return JSON.parse(result.body);
    } catch {
      return null;
    }
  }, [result.body]);

  // Get badge variant based on status code
  const getStatusVariant = (status: number) => {
    if (status >= 200 && status < 300) return "default"; // Green/success
    if (status >= 300 && status < 400) return "secondary"; // Blue/redirect
    if (status >= 400 && status < 500) return "outline"; // Orange/client error
    if (status >= 500) return "destructive"; // Red/server error
    return "outline";
  };

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Response</span>
          <Badge variant={getStatusVariant(result.status)}>
            {result.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.durationMs}ms
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Headers
            </span>
            <button
              onClick={copyHeaders}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              {copiedHeaders ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copiedHeaders ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <div className="text-xs">
              <JsonDisplay data={result.headers} />
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Body
            </span>
            <button
              onClick={copyBody}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              {copiedBody ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copiedBody ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="max-h-[300px] overflow-auto">
            {bodyData ? (
              <div className="text-xs">
                <JsonDisplay data={bodyData} />
              </div>
            ) : (
              <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all">
                {result.body || "—"}
              </pre>
            )}
          </div>
          {result.truncated && (
            <p className="text-xs text-muted-foreground mt-2">
              Response body was truncated
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function WebhookSendTest({
  selectedIngestUrl,
}: {
  selectedIngestUrl: string | null;
}) {
  const [url, setUrl] = useState(selectedIngestUrl || "");
  const [method, setMethod] = useState<string>("POST");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestWebhookSuccess | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Headers state - default to formatted JSON
  const [headersMode, setHeadersMode] = useState<"keyvalue" | "json">("json");
  const [headersKv, setHeadersKv] = useState<
    Record<string, string | number | boolean>
  >({
    "Content-Type": "application/json",
  });
  const [headersJson, setHeadersJson] = useState(
    JSON.stringify({ "Content-Type": "application/json" }, null, 2),
  );

  // Body state - default to formatted JSON
  const [bodyMode, setBodyMode] = useState<"keyvalue" | "json">("json");
  const [bodyKv, setBodyKv] = useState<
    Record<string, string | number | boolean>
  >({
    hello: "world",
  });
  const [bodyJson, setBodyJson] = useState(
    JSON.stringify({ hello: "world" }, null, 2),
  );

  const getHeaders = useCallback((): string => {
    if (headersMode === "keyvalue") return JSON.stringify(headersKv);
    return headersJson;
  }, [headersMode, headersKv, headersJson]);

  const getBody = useCallback((): string => {
    if (bodyMode === "keyvalue") return JSON.stringify(bodyKv);
    return bodyJson;
  }, [bodyMode, bodyKv, bodyJson]);

  const send = useCallback(async () => {
    setClientError(null);
    setResult(null);

    let headersObj: Record<string, string>;
    try {
      headersObj = JSON.parse(getHeaders());
    } catch {
      setClientError("Invalid headers JSON");
      return;
    }

    const skipBody = method === "GET" || method === "HEAD";
    const bodyToSend = getBody();

    if (!skipBody && bodyMode === "json") {
      try {
        JSON.parse(bodyToSend);
      } catch {
        setClientError("Invalid body JSON");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          method,
          headers: headersObj,
          body: skipBody ? null : bodyToSend,
        }),
      });

      const data: {
        error?: string;
        status?: number;
        headers?: Record<string, string>;
        body?: string;
        truncated?: boolean;
        durationMs?: number;
      } = await res.json();
      if (!res.ok) {
        setClientError(data.error || "Request failed");
        return;
      }

      if (data && typeof data === "object" && "status" in data) {
        setResult(data as TestWebhookSuccess);
      }
    } catch {
      setClientError("Network error");
    } finally {
      setLoading(false);
    }
  }, [url, method, getHeaders, getBody, headersMode, bodyMode]);

  return (
    <div className="space-y-6">
      {/* URL Bar */}
      <div className="flex flex-wrap items-end gap-3 py-4">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[100px] font-medium">
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
        <Input
          className="flex-1 min-w-[200px] bg-background border-border-subtle font-mono text-sm"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          onClick={send}
          disabled={loading || !url.trim()}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send
        </Button>
      </div>

      {clientError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive-subtle/50 px-3 py-2 text-sm text-destructive">
          {clientError}
        </div>
      )}

      {/* Data Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataPanel
          title="Headers"
          icon={Terminal}
          mode={headersMode}
          onModeChange={setHeadersMode}
          kvValue={headersKv}
          onKvChange={setHeadersKv}
          jsonValue={headersJson}
          onJsonChange={setHeadersJson}
        />
        <DataPanel
          title="Body"
          icon={Sparkles}
          mode={bodyMode}
          onModeChange={setBodyMode}
          kvValue={bodyKv}
          onKvChange={setBodyKv}
          jsonValue={bodyJson}
          onJsonChange={setBodyJson}
          disabled={method === "GET" || method === "HEAD"}
        />
      </div>

      {result && (
        <ResponsePanel result={result} onClear={() => setResult(null)} />
      )}
    </div>
  );
}
