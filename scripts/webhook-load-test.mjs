#!/usr/bin/env node
/**
 * Webhook Load Test Script
 * 
 * สร้าง webhook endpoint ใหม่ และส่ง request ทุกๆ 1 วินาทีอย่างต่อเนื่อง
 * 
 * Usage:
 *   node scripts/webhook-load-test.mjs <origin> [intervalMs] [count]
 * 
 * Examples:
 *   # ส่งทุก 1 วินาที ไม่จำกัดจำนวน (กด Ctrl+C เพื่อหยุด)
 *   node scripts/webhook-load-test.mjs http://localhost:3000
 * 
 *   # ส่งทุก 500ms จำนวน 100 ครั้ง
 *   node scripts/webhook-load-test.mjs http://localhost:3000 500 100
 * 
 *   # ส่งทุก 2 วินาที ไม่จำกัด
 *   node scripts/webhook-load-test.mjs http://localhost:3000 2000
 */

const origin = process.argv[2]?.replace(/\/$/, "") || "http://localhost:3000";
const intervalMs = parseInt(process.argv[3], 10) || 1000;
const maxCount = parseInt(process.argv[4], 10) || Infinity;

let requestCount = 0;
let successCount = 0;
let errorCount = 0;
let isRunning = true;

function log(message) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${message}`);
}

async function createWebhook() {
  log("🚀 Creating new webhook endpoint...");

  try {
    // เรียก bootstrap เพื่อสร้าง workspace + endpoint ใหม่
    const res = await fetch(`${origin}/api/workspace-bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
    });

    if (!res.ok) {
      throw new Error(`Bootstrap failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.success || !data.endpoints || data.endpoints.length === 0) {
      throw new Error("No endpoint created");
    }

    const endpoint = data.endpoints[data.endpoints.length - 1];
    const ingestUrl = `${origin}/at/${endpoint.publicSlug}/${endpoint.secretToken}`;

    log(`✅ Created endpoint: ${endpoint.publicSlug}`);
    log(`📡 Ingest URL: ${ingestUrl}`);

    return ingestUrl;
  } catch (error) {
    log(`❌ Failed to create webhook: ${error.message}`);
    process.exit(1);
  }
}

async function sendRequest(ingestUrl, counter) {
  const payload = {
    testId: counter,
    timestamp: Date.now(),
    message: `Test request #${counter}`,
    data: {
      random: Math.random(),
      source: "load-test-script",
    },
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Test-ID": String(counter),
    "X-Test-Timestamp": new Date().toISOString(),
    "User-Agent": "WebhookLoadTest/1.0",
  };

  try {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      successCount++;
      log(`✅ #${counter} - ${res.status} (${res.statusText})`);
    } else {
      errorCount++;
      log(`❌ #${counter} - ${res.status} (${res.statusText})`);
    }
  } catch (error) {
    errorCount++;
    log(`💥 #${counter} - Network error: ${error.message}`);
  }
}

async function runLoadTest() {
  console.log("=".repeat(60));
  console.log("🔥 Webhook Load Test");
  console.log("=".repeat(60));
  console.log(`Origin: ${origin}`);
  console.log(`Interval: ${intervalMs}ms`);
  console.log(`Max Count: ${maxCount === Infinity ? "∞ (unlimited)" : maxCount}`);
  console.log("=".repeat(60));

  const ingestUrl = await createWebhook();

  console.log("\n⚡ Starting load test... (Press Ctrl+C to stop)\n");

  const interval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(interval);
      return;
    }

    requestCount++;
    await sendRequest(ingestUrl, requestCount);

    if (requestCount >= maxCount) {
      isRunning = false;
      clearInterval(interval);
      printSummary();
      process.exit(0);
    }
  }, intervalMs);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    log("\n🛑 Stopping load test...");
    isRunning = false;
    clearInterval(interval);
    printSummary();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    isRunning = false;
    clearInterval(interval);
    printSummary();
    process.exit(0);
  });
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Load Test Summary");
  console.log("=".repeat(60));
  console.log(`Total Requests: ${requestCount}`);
  console.log(`Success: ${successCount} ✅`);
  console.log(`Errors: ${errorCount} ❌`);
  console.log(`Success Rate: ${((successCount / requestCount) * 100).toFixed(1)}%`);
  console.log("=".repeat(60));
}

// Run the test
runLoadTest();
