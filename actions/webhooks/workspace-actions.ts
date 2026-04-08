"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getD1 } from "@/lib/db/d1";
import { routing } from "@/i18n/routing";
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

function revalidateWorkspacePaths() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/webhook`);
  }
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
  const t = await getTranslations("serverErrors");
  const db = getD1();
  if (!db) {
    return jsonError(t("databaseUnavailable"));
  }

  const workspaceId = await ensureWorkspaceId();
  let endpoints = await listEndpointsForWorkspace(db, workspaceId);

  if (endpoints.length === 0) {
    const created = await createEndpointInternal(db, workspaceId, t);
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
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<{ success: true } | { success: false; message: string }> {
  const n = await countWorkspaceLinks(db, workspaceId);
  if (n >= MAX_ENDPOINTS_PER_WORKSPACE) {
    return jsonError(t("maxWebhooks", { max: MAX_ENDPOINTS_PER_WORKSPACE }));
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
  const t = await getTranslations("serverErrors");
  const db = getD1();
  if (!db) {
    return jsonError(t("databaseUnavailableShort"));
  }

  const workspaceId = await ensureWorkspaceId();
  const created = await createEndpointInternal(db, workspaceId, t);
  if (!created.success) return created;

  const endpoints = await listEndpointsForWorkspace(db, workspaceId);
  const last = endpoints[endpoints.length - 1];
  if (!last) return jsonError(t("failedCreate"));

  revalidateWorkspacePaths();
  return { success: true, endpoint: toDto(last) };
}

export async function removeEndpointAction(
  endpointId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const t = await getTranslations("serverErrors");
  const db = getD1();
  if (!db) {
    return jsonError(t("databaseUnavailableShort"));
  }

  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return jsonError(t("noWorkspace"));
  }

  const ok = await workspaceHasEndpoint(db, workspaceId, endpointId);
  if (!ok) {
    return jsonError(t("endpointNotFound"));
  }

  const n = await countWorkspaceLinks(db, workspaceId);
  if (n <= 1) {
    return jsonError(t("oneWebhookRequired"));
  }

  await deleteWorkspaceLink(db, workspaceId, endpointId);
  await deleteEndpointIfOrphaned(db, endpointId);

  revalidateWorkspacePaths();
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
  const t = await getTranslations("serverErrors");
  const db = getD1();
  if (!db) {
    return jsonError(t("databaseUnavailableShort"));
  }

  if (!isValidWorkspacePair(publicSlug, secretToken)) {
    return jsonError(t("invalidLink"));
  }

  const ep = await findEndpointBySlugToken(db, publicSlug, secretToken);
  if (!ep) {
    return jsonError(t("unknownWebhook"));
  }

  const workspaceId = await ensureWorkspaceId();
  const already = await workspaceHasEndpoint(db, workspaceId, ep.id);
  if (!already) {
    const n = await countWorkspaceLinks(db, workspaceId);
    if (n >= MAX_ENDPOINTS_PER_WORKSPACE) {
      return jsonError(
        t("workspaceFull", { max: MAX_ENDPOINTS_PER_WORKSPACE }),
      );
    }
    await ensureWorkspaceLink(db, workspaceId, ep.id);
  }

  revalidateWorkspacePaths();
  return { success: true, endpoint: toDto(ep) };
}
