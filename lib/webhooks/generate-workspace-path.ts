/**
 * Random workspace identity (browser or Node). Mirrors webhook.cool-style
 * `adjective-noun-NN` + unguessable secret.
 */
const ADJECTIVES = [
  "dashing",
  "quiet",
  "brave",
  "swift",
  "calm",
  "bright",
] as const;
const NOUNS = ["bear", "otter", "fox", "hawk", "deer", "wolf"] as const;

function randomSlug(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${a}-${b}-${n}`;
}

/** URL-safe secret (no `/`), ~24 chars of entropy from random bytes. */
function randomSecretToken(): string {
  try {
    const c = globalThis.crypto;
    if (c?.getRandomValues) {
      const bytes = new Uint8Array(18);
      c.getRandomValues(bytes);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
      if (typeof btoa === "function") {
        return btoa(bin)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      }
    }
  } catch {
    /* fall through */
  }
  let hex = "";
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

export function generateWorkspaceTokens(): {
  publicSlug: string;
  secretToken: string;
} {
  const publicSlug = randomSlug();
  const secretToken = randomSecretToken();
  if (!publicSlug || !secretToken) {
    throw new Error("generateWorkspaceTokens: empty segment");
  }
  return { publicSlug, secretToken };
}
