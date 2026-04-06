/** localStorage key: value is `{publicSlug}/{secretToken}` (single segment pair). */
export const WORKSPACE_STORAGE_KEY = "webhook_test_workspace_v1" as const;

function isValidSegment(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t === "undefined" || t === "null") return false;
  if (t.includes("/")) return false;
  return true;
}

/** True if both parts are safe workspace segments (not literal “undefined”, etc.). */
export function isValidWorkspacePair(
  publicSlug: string,
  secretToken: string,
): boolean {
  return isValidSegment(publicSlug) && isValidSegment(secretToken);
}

export function parseWorkspacePath(raw: string | null): {
  publicSlug: string;
  secretToken: string;
} | null {
  if (!raw?.includes("/")) return null;
  const i = raw.indexOf("/");
  const publicSlug = raw.slice(0, i).trim();
  const secretToken = raw.slice(i + 1).trim();
  if (!isValidSegment(publicSlug) || !isValidSegment(secretToken)) return null;
  return { publicSlug, secretToken };
}
