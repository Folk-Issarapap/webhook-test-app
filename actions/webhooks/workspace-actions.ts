"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getD1 } from "@/lib/db/d1";
import { generateWorkspaceTokens } from "@/lib/webhooks/generate-workspace-path";
import {
  countWorkspaceLinks,
  deleteWorkspaceLink,
  deleteEndpointIfOrphaned,
  ensureWorkspaceLink,
  findEndpointBySlugToken,
  insertEndpoint,
  linkEndpointToWorkspace,
  listEndpointsForWorkspace,
  workspaceHasEndpoint,
} from "@/lib/webhooks/repository";
import {
  MAX_ENDPOINTS_PER_WORKSPACE,
  WORKSPACE_COOKIE_NAME,
} from "@/lib/webhooks/constants";
import { isValidWorkspacePair } from "@/lib/webhooks/workspace-storage";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function jsonError(message: string) {
  return { success: false as const, message };
}

async function getCookieStore() {
  return cookies();
}

async function getWorkspaceId(): Promise<string | null> {
  const store = await getCookieStore();
  return store.get(WORKSPACE_COOKIE_NAME)?.value ?? null;
}

async function setWorkspaceId(id: string): Promise<void> {
  const store = await getCookieStore();
  store.set(WORKSPACE_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

async function ensureWorkspaceId(): Promise<string> {
  let id = await getWorkspaceId();
  if (!id) {
    id = crypto.randomUUID();
    await setWorkspaceId(id);
  }
  return id;
}

export type WorkspaceEndpointDto = {
  id: string;
  publicSlug: string;
  secretToken: string;
  createdAt: number;
};

export async function bootstrapWorkspaceAction(): Promise<
  | { success: true; endpoints: WorkspaceEndpointDto[] }
  | { success: false; message: string }
> {
  const db = getD1();
  if (!db) {
    return jsonError("Database is not available. Run with Cloudflare Workers (e.g. pnpm dev / deploy).");
  }

  const workspaceId = await ensureWorkspaceId();
  let endpoints = await listEndpointsForWorkspace(db, workspaceId);

  if (endpoints.length === 0) {
    const created = await createEndpointInternal(db, workspaceId);
    if (!created.success) return created;
    endpoints = await listEndpointsForWorkspace(db, workspaceId);
  }

  return {
    success: true,
    endpoints: endpoints.map(toDto),
  };
}

function toDto(row: {
  id: string;
  created_at: number;
  public_slug: string;
  secret_token: string;
}): WorkspaceEndpointDto {
  return {
    id: row.id,
    publicSlug: row.public_slug,
    secretToken: row.secret_token,
    createdAt: row.created_at,
  };
}

async function createEndpointInternal(
  db: D1Database,
  workspaceId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const n = await countWorkspaceLinks(db, workspaceId);
  if (n >= MAX_ENDPOINTS_PER_WORKSPACE) {
    return jsonError(`Maximum ${MAX_ENDPOINTS_PER_WORKSPACE} webhooks per workspace.`);
  }

  const { publicSlug, secretToken } = generateWorkspaceTokens();
  const id = crypto.randomUUID();
  const createdAt = Math.floor(Date.now() / 1000);

  await insertEndpoint(db, {
    id,
    created_at: createdAt,
    public_slug: publicSlug,
    secret_token: secretToken,
  });
  await linkEndpointToWorkspace(db, workspaceId, id, createdAt);

  return { success: true };
}

export async function createEndpointAction(): Promise<
  | { success: true; endpoint: WorkspaceEndpointDto }
  | { success: false; message: string }
> {
  const db = getD1();
  if (!db) {
    return jsonError("Database is not available.");
  }

  const workspaceId = await ensureWorkspaceId();
  const created = await createEndpointInternal(db, workspaceId);
  if (!created.success) return created;

  const endpoints = await listEndpointsForWorkspace(db, workspaceId);
  const last = endpoints[endpoints.length - 1];
  if (!last) return jsonError("Failed to create endpoint.");

  revalidatePath("/");
  revalidatePath("/webhook");
  return { success: true, endpoint: toDto(last) };
}

export async function removeEndpointAction(
  endpointId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const db = getD1();
  if (!db) {
    return jsonError("Database is not available.");
  }

  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return jsonError("No workspace.");
  }

  const ok = await workspaceHasEndpoint(db, workspaceId, endpointId);
  if (!ok) {
    return jsonError("Endpoint not found.");
  }

  const n = await countWorkspaceLinks(db, workspaceId);
  if (n <= 1) {
    return jsonError("At least one webhook is required.");
  }

  await deleteWorkspaceLink(db, workspaceId, endpointId);
  await deleteEndpointIfOrphaned(db, endpointId);

  revalidatePath("/");
  revalidatePath("/webhook");
  return { success: true };
}

/**
 * Deep link: attach an existing catcher (slug+token) to this workspace if valid.
 */
export async function attachEndpointByTokensAction(
  publicSlug: string,
  secretToken: string,
): Promise<
  | { success: true; endpoint: WorkspaceEndpointDto }
  | { success: false; message: string }
> {
  const db = getD1();
  if (!db) {
    return jsonError("Database is not available.");
  }

  if (!isValidWorkspacePair(publicSlug, secretToken)) {
    return jsonError("Invalid link.");
  }

  const ep = await findEndpointBySlugToken(db, publicSlug, secretToken);
  if (!ep) {
    return jsonError("Unknown webhook URL.");
  }

  const workspaceId = await ensureWorkspaceId();
  const already = await workspaceHasEndpoint(db, workspaceId, ep.id);
  if (!already) {
    const n = await countWorkspaceLinks(db, workspaceId);
    if (n >= MAX_ENDPOINTS_PER_WORKSPACE) {
      return jsonError(
        `Workspace is full (${MAX_ENDPOINTS_PER_WORKSPACE}). Remove one webhook to add this link.`,
      );
    }
    await ensureWorkspaceLink(db, workspaceId, ep.id);
  }

  revalidatePath("/");
  revalidatePath("/webhook");
  return { success: true, endpoint: toDto(ep) };
}
