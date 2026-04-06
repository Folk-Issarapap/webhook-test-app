#!/usr/bin/env node
/**
 * Verifies Cloudflare R2 API access using CLOUDFLARE_API_TOKEN (or R2_API_TOKEN)
 * and account id from .env — no secrets on the command line.
 *
 * Needs token permission: Account → R2 Storage → Read (or higher).
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.error("Missing .env at", filePath);
    process.exit(1);
  }
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv(path.join(process.cwd(), ".env"));
const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
const token = env.CLOUDFLARE_API_TOKEN || env.R2_API_TOKEN;
const bucketName = env.R2_BUCKET_NAME;
const publicUrl = env.R2_BUCKET_URL?.replace(/\/$/, "");

if (!accountId || !token) {
  console.error(
    "Set CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID) and CLOUDFLARE_API_TOKEN (or R2_API_TOKEN) in .env",
  );
  process.exit(1);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;

async function main() {
  console.log("Calling Cloudflare R2 list buckets API…");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    console.error("Request failed:", res.status, res.statusText);
    console.error(JSON.stringify(data.errors || data, null, 2));
    process.exit(1);
  }

  const buckets = data.result?.buckets ?? [];
  console.log("Success. Buckets on this account:");
  if (buckets.length === 0) {
    console.log("  (none)");
  } else {
    for (const b of buckets) {
      console.log(`  - ${b.name}`);
    }
  }

  if (bucketName) {
    const found = buckets.some((b) => b.name === bucketName);
    if (found) {
      console.log(`\n✓ R2_BUCKET_NAME "${bucketName}" is present.`);
    } else {
      console.log(`\n✗ R2_BUCKET_NAME "${bucketName}" not in list (check name / account).`);
      process.exit(1);
    }
  }

  if (publicUrl) {
    console.log(`\nPublic base URL HEAD: ${publicUrl}`);
    try {
      const pr = await fetch(publicUrl, { method: "HEAD", redirect: "follow" });
      console.log(`  Status: ${pr.status} ${pr.statusText}`);
      if (pr.status >= 400) {
        console.log(
          "  (Non-2xx is normal if the bucket root has no default object; custom domains may differ.)",
        );
      }
    } catch (e) {
      console.log("  FETCH_ERROR:", e instanceof Error ? e.message : e);
    }
  }
}

main();
