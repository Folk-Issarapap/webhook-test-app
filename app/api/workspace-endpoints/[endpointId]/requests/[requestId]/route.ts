import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getD1 } from "@/lib/db/d1";
import { WORKSPACE_COOKIE_NAME } from "@/lib/webhooks/constants";
import {
  deleteRequestForEndpoint,
  workspaceHasEndpoint,
} from "@/lib/webhooks/repository";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ endpointId: string; requestId: string }> },
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

  const { endpointId, requestId } = await context.params;
  const allowed = await workspaceHasEndpoint(db, workspaceId, endpointId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const deleted = await deleteRequestForEndpoint(db, endpointId, requestId);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
