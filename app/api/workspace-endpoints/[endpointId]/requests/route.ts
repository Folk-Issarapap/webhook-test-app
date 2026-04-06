import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getD1 } from "@/lib/db/d1";
import {
  WORKSPACE_COOKIE_NAME,
  WEBHOOK_REQUEST_LIST_LIMIT,
} from "@/lib/webhooks/constants";
import {
  listRequestsForEndpoint,
  workspaceHasEndpoint,
} from "@/lib/webhooks/repository";

/**
 * Polling endpoint for Inspect tab — avoids calling a Server Action on an interval,
 * which can trigger RSC/router refresh flicker in Vinext/Next.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ endpointId: string }> },
) {
  const db = getD1();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 },
    );
  }

  const store = await cookies();
  const workspaceId = store.get(WORKSPACE_COOKIE_NAME)?.value;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: "no_workspace" }, { status: 401 });
  }

  const { endpointId } = await context.params;
  const ok = await workspaceHasEndpoint(db, workspaceId, endpointId);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const requests = await listRequestsForEndpoint(
    db,
    endpointId,
    WEBHOOK_REQUEST_LIST_LIMIT,
  );

  return NextResponse.json({ ok: true, requests });
}
