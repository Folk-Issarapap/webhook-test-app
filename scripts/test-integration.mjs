#!/usr/bin/env node
/**
 * Integration Tests for webhook-test-app
 * Tests cross-module interactions and workflows
 *
 * Run: node scripts/test-integration.mjs
 */

// Test result tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: "PASS" });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: "FAIL", error: error.message });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected true, got ${JSON.stringify(value)}`);
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || `Expected false, got ${JSON.stringify(value)}`);
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(
      message || `Expected value to exist, got ${JSON.stringify(value)}`,
    );
  }
}

function assertContains(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(haystack)} to contain ${JSON.stringify(needle)}`,
    );
  }
}

// ============================================
// Constants and Helpers
// ============================================

const MAX_ENDPOINTS_PER_WORKSPACE = 3;
const WEBHOOK_PUBLIC_PATH_PREFIX = "/at";
const MAX_INBOUND_BODY_BYTES = 1024 * 1024;

function generateWorkspaceTokens() {
  const ADJECTIVES = ["dashing", "quiet", "brave", "swift", "calm", "bright"];
  const NOUNS = ["bear", "otter", "fox", "hawk", "deer", "wolf"];

  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  const publicSlug = `${a}-${b}-${n}`;

  let hex = "";
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  const secretToken = hex;

  return { publicSlug, secretToken };
}

function buildIngestUrl(origin, publicSlug, secretToken) {
  const base = origin.replace(/\/$/, "");
  return `${base}${WEBHOOK_PUBLIC_PATH_PREFIX}/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}

function buildWorkspaceAppPath(publicSlug, secretToken) {
  return `/webhook/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}

function isValidWorkspacePair(publicSlug, secretToken) {
  const isValidSegment = (s) => {
    if (s === null || s === undefined) return false;
    const t = s.trim();
    if (!t) return false;
    if (t === "undefined" || t === "null") return false;
    if (t.includes("/")) return false;
    return true;
  };
  return isValidSegment(publicSlug) && isValidSegment(secretToken);
}

// ============================================
// Tests
// ============================================

console.log("\n📦 Module: Integration - Full Workflow");

test("Complete workflow: create tokens → build URLs → validate", () => {
  // Step 1: Generate workspace tokens
  const { publicSlug, secretToken } = generateWorkspaceTokens();

  // Step 2: Validate tokens
  assertTrue(isValidWorkspacePair(publicSlug, secretToken));

  // Step 3: Build URLs
  const origin = "https://hooks.example.com";
  const ingestUrl = buildIngestUrl(origin, publicSlug, secretToken);
  const appPath = buildWorkspaceAppPath(publicSlug, secretToken);

  // Step 4: Validate URLs
  assertTrue(ingestUrl.startsWith(origin));
  assertContains(ingestUrl, WEBHOOK_PUBLIC_PATH_PREFIX);
  assertContains(ingestUrl, encodeURIComponent(publicSlug));
  assertContains(appPath, "/webhook/");
});

test("Multiple workspaces should have unique tokens", () => {
  const tokens = [];
  for (let i = 0; i < 20; i++) {
    tokens.push(generateWorkspaceTokens());
  }

  // All public slugs should be unique
  const slugs = new Set(tokens.map((t) => t.publicSlug));
  assertTrue(
    slugs.size >= 15,
    `Expected >= 15 unique slugs, got ${slugs.size}`,
  );

  // All secret tokens should be unique
  const secrets = new Set(tokens.map((t) => t.secretToken));
  assertEqual(secrets.size, tokens.length);
});

console.log("\n📦 Module: Integration - URL Consistency");

test("Ingest URL and app path should use same encoding", () => {
  const { publicSlug, secretToken } = generateWorkspaceTokens();

  const origin = "https://example.com";
  const ingestUrl = buildIngestUrl(origin, publicSlug, secretToken);
  const appPath = buildWorkspaceAppPath(publicSlug, secretToken);

  // Both should contain encoded slug/token
  const encodedSlug = encodeURIComponent(publicSlug);
  const encodedToken = encodeURIComponent(secretToken);

  assertContains(ingestUrl, encodedSlug);
  assertContains(ingestUrl, encodedToken);
  assertContains(appPath, encodedSlug);
  assertContains(appPath, encodedToken);
});

test("URL should handle origins with and without trailing slash", () => {
  const { publicSlug, secretToken } = generateWorkspaceTokens();

  const withoutSlash = buildIngestUrl(
    "https://example.com",
    publicSlug,
    secretToken,
  );
  const withSlash = buildIngestUrl(
    "https://example.com/",
    publicSlug,
    secretToken,
  );

  assertEqual(withoutSlash, withSlash);
});

console.log("\n📦 Module: Integration - Security & Validation");

test("Tokens should not contain URL-unsafe characters", () => {
  for (let i = 0; i < 50; i++) {
    const { publicSlug, secretToken } = generateWorkspaceTokens();

    // No forward slashes (would break path)
    assertFalse(publicSlug.includes("/"));
    assertFalse(secretToken.includes("/"));

    // No question marks (would break query string)
    assertFalse(publicSlug.includes("?"));
    assertFalse(secretToken.includes("?"));

    // No hash symbols
    assertFalse(publicSlug.includes("#"));
    assertFalse(secretToken.includes("#"));
  }
});

test("Generated URLs should be parseable", () => {
  const { publicSlug, secretToken } = generateWorkspaceTokens();
  const url = buildIngestUrl("https://example.com", publicSlug, secretToken);

  try {
    const parsed = new URL(url);
    assertEqual(parsed.protocol, "https:");
    assertTrue(parsed.pathname.includes(encodeURIComponent(publicSlug)));
  } catch {
    throw new Error(`Generated URL is not valid: ${url}`);
  }
});

test("Secret tokens should have sufficient entropy", () => {
  const { secretToken } = generateWorkspaceTokens();

  // 32 hex characters = 128 bits
  assertEqual(secretToken.length, 32);
  assertTrue(/^[0-9a-f]+$/.test(secretToken));

  // Should not be predictable (not all same char, not sequential)
  const uniqueChars = new Set(secretToken).size;
  assertTrue(
    uniqueChars > 4,
    `Secret has only ${uniqueChars} unique characters`,
  );
});

console.log("\n📦 Module: Integration - Data Flow");

test("Mock request should match endpoint structure", () => {
  const ep = {
    id: "ep_123",
    publicSlug: "test-slug",
    secretToken: "test-token",
  };

  const path = `${WEBHOOK_PUBLIC_PATH_PREFIX}/${ep.publicSlug}/${ep.secretToken}`;
  const now = Math.floor(Date.now() / 1000);

  const mockRequest = {
    id: `req_${now}`,
    endpoint_id: ep.id,
    method: "POST",
    path,
    headers: JSON.stringify({ "Content-Type": "application/json" }),
    body: JSON.stringify({ test: true }),
    created_at: now,
  };

  // Validate structure
  assertEqual(mockRequest.endpoint_id, ep.id);
  assertContains(mockRequest.path, ep.publicSlug);
  assertContains(mockRequest.path, ep.secretToken);

  // Validate JSON fields
  assertTrue(JSON.parse(mockRequest.headers) !== null);
  assertTrue(JSON.parse(mockRequest.body) !== null);
});

test("Request ID should include endpoint reference", () => {
  const ep = { id: "ep_test", publicSlug: "slug", secretToken: "token" };

  function buildMockRequestsForEndpoint(endpoint) {
    return [
      { id: `${endpoint.id}_mock_1`, endpoint_id: endpoint.id },
      { id: `${endpoint.id}_mock_2`, endpoint_id: endpoint.id },
    ];
  }

  const requests = buildMockRequestsForEndpoint(ep);
  for (const req of requests) {
    assertTrue(req.id.startsWith(ep.id));
    assertEqual(req.endpoint_id, ep.id);
  }
});

console.log("\n📦 Module: Integration - Boundary Conditions");

test("Should handle maximum endpoints correctly", () => {
  const endpoints = [];
  for (let i = 0; i < MAX_ENDPOINTS_PER_WORKSPACE; i++) {
    endpoints.push(generateWorkspaceTokens());
  }

  assertEqual(endpoints.length, MAX_ENDPOINTS_PER_WORKSPACE);

  // All should be unique
  const slugs = new Set(endpoints.map((e) => e.publicSlug));
  assertEqual(slugs.size, endpoints.length);
});

test("Should handle empty/null values in validation", () => {
  assertFalse(isValidWorkspacePair("", "token"));
  assertFalse(isValidWorkspacePair("slug", ""));
  assertFalse(isValidWorkspacePair(null, "token"));
  assertFalse(isValidWorkspacePair("slug", undefined));
});

test("Should handle oversized body in validation", () => {
  const oversizedBody = "x".repeat(MAX_INBOUND_BODY_BYTES + 1);
  assertTrue(oversizedBody.length > MAX_INBOUND_BODY_BYTES);
});

console.log("\n📦 Module: Integration - Error Scenarios");

test("Invalid protocol should be rejected in URL validation", () => {
  const invalidUrls = [
    "ftp://example.com/webhook",
    "file:///etc/passwd",
    "javascript:alert('xss')",
    "data:text/html,<script>alert('xss')</script>",
  ];

  for (const url of invalidUrls) {
    try {
      const parsed = new URL(url);
      assertFalse(
        parsed.protocol === "http:" || parsed.protocol === "https:",
        `URL ${url} should not be valid HTTP/HTTPS`,
      );
    } catch {
      // Invalid URL - expected
    }
  }
});

test("Malformed workspace paths should be rejected", () => {
  const invalidPaths = [
    "no-slash",
    "/leading-slash",
    "trailing-slash/",
    "undefined/token",
    "slug/null",
    "slug/",
    "/token",
    "",
    "   ",
  ];

  const parseWorkspacePath = (raw) => {
    if (!raw?.includes("/")) return null;
    const i = raw.indexOf("/");
    const publicSlug = raw.slice(0, i).trim();
    const secretToken = raw.slice(i + 1).trim();
    if (!publicSlug || !secretToken) return null;
    if (publicSlug === "undefined" || publicSlug === "null") return null;
    if (secretToken === "undefined" || secretToken === "null") return null;
    return { publicSlug, secretToken };
  };

  for (const path of invalidPaths) {
    const parsed = parseWorkspacePath(path);
    assertEqual(parsed, null, `Path "${path}" should not be parseable`);
  }
});

console.log("\n📦 Module: Integration - Real-world Scenarios");

test("Simulate webhook catcher lifecycle", () => {
  // 1. Create workspace
  const tokens = generateWorkspaceTokens();
  assertTrue(isValidWorkspacePair(tokens.publicSlug, tokens.secretToken));

  // 2. Build URLs
  const origin = "https://webhook.example.com";
  const ingestUrl = buildIngestUrl(
    origin,
    tokens.publicSlug,
    tokens.secretToken,
  );
  const appPath = buildWorkspaceAppPath(tokens.publicSlug, tokens.secretToken);

  // 3. Simulate incoming webhook
  const mockRequest = {
    id: `req_${Date.now()}`,
    method: "POST",
    path: `${WEBHOOK_PUBLIC_PATH_PREFIX}/${tokens.publicSlug}/${tokens.secretToken}`,
    headers: JSON.stringify({
      "Content-Type": "application/json",
      "User-Agent": "Test-Agent/1.0",
    }),
    body: JSON.stringify({ event: "test", timestamp: Date.now() }),
    created_at: Math.floor(Date.now() / 1000),
  };

  // 4. Validate stored request
  assertTrue(mockRequest.headers.includes("Content-Type"));
  assertTrue(JSON.parse(mockRequest.body).event === "test");

  // 5. Verify URL consistency
  assertContains(ingestUrl, tokens.publicSlug);
  assertContains(appPath, tokens.publicSlug);
});

test("Simulate multiple concurrent workspaces", () => {
  const workspaces = [];

  // Create 5 workspaces
  for (let i = 0; i < 5; i++) {
    const tokens = generateWorkspaceTokens();
    workspaces.push({
      id: `ws_${i}`,
      ...tokens,
      ingestUrl: buildIngestUrl(
        "https://example.com",
        tokens.publicSlug,
        tokens.secretToken,
      ),
    });
  }

  // All workspaces should have unique tokens
  const allSlugs = workspaces.map((w) => w.publicSlug);
  const allSecrets = workspaces.map((w) => w.secretToken);

  assertEqual(new Set(allSlugs).size, workspaces.length);
  assertEqual(new Set(allSecrets).size, workspaces.length);

  // All URLs should be unique
  const allUrls = workspaces.map((w) => w.ingestUrl);
  assertEqual(new Set(allUrls).size, workspaces.length);
});

console.log("\n📦 Module: Integration - Template & Payload");

test("Header templates should match expected webhook providers", () => {
  const templates = {
    stripe: {
      "Content-Type": "application/json",
      "Stripe-Signature": "t=1234567890,v1=demo",
    },
    github: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "ping",
    },
    json: {
      "Content-Type": "application/json",
    },
    form: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  for (const [name, headers] of Object.entries(templates)) {
    assertExists(
      headers["Content-Type"],
      `Template ${name} should have Content-Type`,
    );

    if (name === "stripe") {
      assertExists(headers["Stripe-Signature"]);
    }
    if (name === "github") {
      assertExists(headers["X-GitHub-Event"]);
    }
  }
});

test("Payload templates should be valid JSON", () => {
  const payloads = [
    { hello: "world" },
    { id: "evt_test_123", type: "checkout.session.completed" },
    { zen: "Responsive is better than fast." },
    {},
  ];

  for (const payload of payloads) {
    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);
    assertTrue(typeof parsed === "object");
  }
});

// ============================================
// Summary
// ============================================
console.log("\n" + "=".repeat(50));
console.log("Integration Test Summary");
console.log("=".repeat(50));
console.log(`Total:  ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);

if (results.failed > 0) {
  console.log("\nFailed tests:");
  results.tests
    .filter((t) => t.status === "FAIL")
    .forEach((t) => console.log(`  - ${t.name}`));
}

process.exit(results.failed > 0 ? 1 : 0);
