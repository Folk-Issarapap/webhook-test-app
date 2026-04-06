import type { WebhookRequestRow } from "@/schemas/webhook";

export type EndpointRow = {
  id: string;
  created_at: number;
  public_slug: string;
  secret_token: string;
};

export async function findEndpointBySlugToken(
  db: D1Database,
  publicSlug: string,
  secretToken: string,
): Promise<EndpointRow | null> {
  const row = await db
    .prepare(
      `SELECT id, created_at, public_slug, secret_token
       FROM webhook_endpoints
       WHERE public_slug = ? AND secret_token = ?`,
    )
    .bind(publicSlug, secretToken)
    .first<EndpointRow>();
  return row ?? null;
}

export async function listEndpointsForWorkspace(
  db: D1Database,
  workspaceId: string,
): Promise<EndpointRow[]> {
  const { results } = await db
    .prepare(
      `SELECT e.id, e.created_at, e.public_slug, e.secret_token
       FROM webhook_endpoints e
       INNER JOIN webhook_workspace_endpoints w
         ON w.endpoint_id = e.id
       WHERE w.workspace_id = ?
       ORDER BY w.created_at ASC`,
    )
    .bind(workspaceId)
    .all<EndpointRow>();
  return results ?? [];
}

export async function countWorkspaceLinks(
  db: D1Database,
  workspaceId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM webhook_workspace_endpoints WHERE workspace_id = ?`,
    )
    .bind(workspaceId)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function workspaceHasEndpoint(
  db: D1Database,
  workspaceId: string,
  endpointId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 as ok FROM webhook_workspace_endpoints
       WHERE workspace_id = ? AND endpoint_id = ?`,
    )
    .bind(workspaceId, endpointId)
    .first<{ ok: number }>();
  return !!row;
}

export async function insertEndpoint(
  db: D1Database,
  row: EndpointRow,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webhook_endpoints (id, created_at, public_slug, secret_token)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.created_at, row.public_slug, row.secret_token)
    .run();
}

export async function linkEndpointToWorkspace(
  db: D1Database,
  workspaceId: string,
  endpointId: string,
  createdAt: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webhook_workspace_endpoints (workspace_id, endpoint_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(workspaceId, endpointId, createdAt)
    .run();
}

/** Idempotent: link if missing. */
export async function ensureWorkspaceLink(
  db: D1Database,
  workspaceId: string,
  endpointId: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT OR IGNORE INTO webhook_workspace_endpoints (workspace_id, endpoint_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(workspaceId, endpointId, now)
    .run();
}

export async function deleteWorkspaceLink(
  db: D1Database,
  workspaceId: string,
  endpointId: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM webhook_workspace_endpoints
       WHERE workspace_id = ? AND endpoint_id = ?`,
    )
    .bind(workspaceId, endpointId)
    .run();
}

export async function deleteEndpointIfOrphaned(
  db: D1Database,
  endpointId: string,
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM webhook_workspace_endpoints WHERE endpoint_id = ?`,
    )
    .bind(endpointId)
    .first<{ c: number }>();
  if ((row?.c ?? 0) > 0) return;
  await db
    .prepare(`DELETE FROM webhook_endpoints WHERE id = ?`)
    .bind(endpointId)
    .run();
}

export async function insertRequest(
  db: D1Database,
  row: Omit<WebhookRequestRow, "source_note">,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webhook_requests (id, endpoint_id, method, path, headers, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.endpoint_id,
      row.method,
      row.path,
      row.headers,
      row.body,
      row.created_at,
    )
    .run();
}

export async function listRequestsForEndpoint(
  db: D1Database,
  endpointId: string,
  limit: number,
): Promise<WebhookRequestRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, endpoint_id, method, path, headers, body, created_at
       FROM webhook_requests
       WHERE endpoint_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(endpointId, limit)
    .all<WebhookRequestRow>();
  return results ?? [];
}
