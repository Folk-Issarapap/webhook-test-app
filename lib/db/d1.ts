import { env } from "cloudflare:workers";

/** D1 binding from `wrangler.jsonc`; null only if bindings are unavailable (e.g. misconfigured env). */
export function getD1(): D1Database | null {
  try {
    const db = env.DB;
    return db ?? null;
  } catch {
    return null;
  }
}
