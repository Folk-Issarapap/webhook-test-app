import { NextResponse } from "next/server";

import { getD1 } from "@/lib/db/d1";
import { MAX_INBOUND_BODY_BYTES } from "@/lib/webhooks/constants";
import { headersObjectFromRequest } from "@/lib/webhooks/ingest-headers";
import {
  findEndpointBySlugToken,
  insertRequest,
} from "@/lib/webhooks/repository";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

type RouteParams = {
  publicSlug: string;
  secretToken: string;
  rest?: string[];
};

type RouteContext = { params: Promise<RouteParams> };

async function handleIngest(request: Request, context: RouteContext) {
  const db = getD1();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 },
    );
  }

  const method = request.method.toUpperCase();
  if (method === "OPTIONS") {
    return new NextResponse(null, { status: 204 });
  }

  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ ok: false, error: "method_not_allowed" }, {
      status: 405,
    });
  }

  const { publicSlug: rawSlug, secretToken: rawSecret } = await context.params;
  const publicSlug = decodeURIComponent(rawSlug);
  const secretToken = decodeURIComponent(rawSecret);

  if (!isValidWorkspacePair(publicSlug, secretToken)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const endpoint = await findEndpointBySlugToken(db, publicSlug, secretToken);
  if (!endpoint) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  let body: string | null = null;
  if (method !== "GET" && method !== "HEAD") {
    const len = request.headers.get("content-length");
    if (len) {
      const n = Number(len);
      if (Number.isFinite(n) && n > MAX_INBOUND_BODY_BYTES) {
        return NextResponse.json({ ok: false, error: "payload_too_large" }, {
          status: 413,
        });
      }
    }
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_INBOUND_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, {
        status: 413,
      });
    }
    body = buf.byteLength === 0 ? null : new TextDecoder().decode(buf);
  }

  const headersJson = JSON.stringify(headersObjectFromRequest(request));
  const createdAt = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();

  await insertRequest(db, {
    id,
    endpoint_id: endpoint.id,
    method,
    path,
    headers: headersJson,
    body,
    created_at: createdAt,
  });

  if (method === "HEAD") {
    return new NextResponse(null, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function HEAD(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}

export function OPTIONS(request: Request, context: RouteContext) {
  return handleIngest(request, context);
}
