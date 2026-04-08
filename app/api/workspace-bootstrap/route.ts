import { NextResponse } from "next/server";

import { getD1 } from "@/lib/db/d1";
import { generateWorkspaceTokens } from "@/lib/webhooks/generate-workspace-path";
import {
  insertEndpoint,
  linkEndpointToWorkspace,
  listEndpointsForWorkspace,
} from "@/lib/webhooks/repository";

export const dynamic = "force-dynamic";

/**
 * Bootstrap a new workspace + endpoint for load testing.
 * Returns the newly created endpoint(s) without requiring cookies.
 */
export async function POST() {
  const db = getD1();
  if (!db) {
    return NextResponse.json(
      { success: false, error: "database_unavailable" },
      { status: 503 },
    );
  }

  try {
    // Generate new workspace id (no cookie needed - stateless for testing)
    const workspaceId = crypto.randomUUID();

    // Create a new endpoint
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

    // Get the created endpoint
    const endpoints = await listEndpointsForWorkspace(db, workspaceId);

    return NextResponse.json({
      success: true,
      workspaceId,
      endpoints: endpoints.map((e) => ({
        id: e.id,
        publicSlug: e.public_slug,
        secretToken: e.secret_token,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
