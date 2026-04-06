import { NextResponse } from "next/server";

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const MAX_OUTBOUND_BODY = 256 * 1024;
const MAX_RESPONSE_BODY = 512 * 1024;
const TIMEOUT_MS = 30_000;

type BodyJson = {
  url?: unknown;
  method?: unknown;
  headers?: unknown;
  body?: unknown;
};

function isPlainHeaderObject(v: unknown): v is Record<string, string> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  for (const [, val] of Object.entries(v)) {
    if (typeof val !== "string") return false;
  }
  return true;
}

export async function POST(request: Request) {
  let parsed: BodyJson;
  try {
    parsed = (await request.json()) as BodyJson;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urlRaw = typeof parsed.url === "string" ? parsed.url.trim() : "";
  const methodRaw =
    typeof parsed.method === "string"
      ? parsed.method.trim().toUpperCase()
      : "POST";

  if (!urlRaw) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!ALLOWED_METHODS.has(methodRaw)) {
    return NextResponse.json(
      { error: `Unsupported method: ${methodRaw}` },
      { status: 400 },
    );
  }

  let target: URL;
  try {
    target = new URL(urlRaw);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http and https URLs are allowed" },
      { status: 400 },
    );
  }

  let headerObj: Record<string, string> = {};
  if (parsed.headers !== undefined && parsed.headers !== null) {
    if (!isPlainHeaderObject(parsed.headers)) {
      return NextResponse.json(
        {
          error:
            "headers must be a JSON object of string keys to string values",
        },
        { status: 400 },
      );
    }
    headerObj = { ...parsed.headers };
  }

  let outboundBody: string | undefined;
  if (parsed.body !== undefined && parsed.body !== null) {
    if (typeof parsed.body !== "string") {
      return NextResponse.json(
        { error: "body must be a string when provided" },
        { status: 400 },
      );
    }
    if (parsed.body.length > MAX_OUTBOUND_BODY) {
      return NextResponse.json(
        { error: `body exceeds ${MAX_OUTBOUND_BODY} bytes` },
        { status: 400 },
      );
    }
    outboundBody = parsed.body;
  }

  const skipBody = methodRaw === "GET" || methodRaw === "HEAD";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(target.toString(), {
      method: methodRaw,
      headers: headerObj,
      body: skipBody ? undefined : outboundBody,
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - started;

    const text = await res.text();
    const truncated = text.length > MAX_RESPONSE_BODY;
    const bodyOut = truncated
      ? `${text.slice(0, MAX_RESPONSE_BODY)}\n\n… [truncated]`
      : text;

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      body: bodyOut,
      truncated,
      durationMs,
    });
  } catch (err) {
    clearTimeout(timeout);
    const durationMs = Date.now() - started;
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out"
          : err.message
        : "Request failed";
    return NextResponse.json({ error: message, durationMs }, { status: 502 });
  }
}
