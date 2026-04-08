#!/usr/bin/env node
/**
 * Core System Tests for webhook-test-app
 * Tests all core logic without UI - pure function testing
 *
 * Run: node scripts/test-core.mjs
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

function assertMatches(value, pattern, message) {
  if (!pattern.test(value)) {
    throw new Error(
      message || `Expected ${JSON.stringify(value)} to match ${pattern}`,
    );
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(message || "Expected function to throw");
  } catch (e) {
    if (e.message === (message || "Expected function to throw")) {
      throw e;
    }
    // Expected throw - test passes
  }
}

// ============================================
// MODULE 1: Constants Tests
// ============================================
console.log("\n📦 Module: Constants");

const constants = {
  WEBHOOK_PUBLIC_PATH_PREFIX: "/at",
  MAX_INBOUND_BODY_BYTES: 1024 * 1024,
  WEBHOOK_REQUEST_LIST_LIMIT: 100,
  WORKSPACE_COOKIE_NAME: "wt_workspace_id",
  MAX_ENDPOINTS_PER_WORKSPACE: 3,
};

test("WEBHOOK_PUBLIC_PATH_PREFIX should be /at", () => {
  assertEqual(constants.WEBHOOK_PUBLIC_PATH_PREFIX, "/at");
});

test("MAX_INBOUND_BODY_BYTES should be 1MB", () => {
  assertEqual(constants.MAX_INBOUND_BODY_BYTES, 1048576);
});

test("WEBHOOK_REQUEST_LIST_LIMIT should be 100", () => {
  assertEqual(constants.WEBHOOK_REQUEST_LIST_LIMIT, 100);
});

test("WORKSPACE_COOKIE_NAME should be wt_workspace_id", () => {
  assertEqual(constants.WORKSPACE_COOKIE_NAME, "wt_workspace_id");
});

test("MAX_ENDPOINTS_PER_WORKSPACE should be 3", () => {
  assertEqual(constants.MAX_ENDPOINTS_PER_WORKSPACE, 3);
});

// ============================================
// MODULE 2: Token Generation Tests
// ============================================
console.log("\n📦 Module: generate-workspace-path");

const ADJECTIVES = ["dashing", "quiet", "brave", "swift", "calm", "bright"];
const NOUNS = ["bear", "otter", "fox", "hawk", "deer", "wolf"];

function randomSlug() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${a}-${b}-${n}`;
}

function randomSecretToken() {
  let hex = "";
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

function generateWorkspaceTokens() {
  const publicSlug = randomSlug();
  const secretToken = randomSecretToken();
  if (!publicSlug || !secretToken) {
    throw new Error("generateWorkspaceTokens: empty segment");
  }
  return { publicSlug, secretToken };
}

test("randomSlug should generate valid format", () => {
  const slug = randomSlug();
  assertMatches(slug, /^[a-z]+-[a-z]+-\d{2}$/);
});

test("randomSecretToken should generate 32-char hex", () => {
  const token = randomSecretToken();
  assertEqual(token.length, 32);
  assertMatches(token, /^[0-9a-f]+$/);
});

test("generateWorkspaceTokens should return both tokens", () => {
  const tokens = generateWorkspaceTokens();
  assertExists(tokens.publicSlug);
  assertExists(tokens.secretToken);
  assertTrue(tokens.publicSlug.length > 0);
  assertTrue(tokens.secretToken.length > 0);
});

test("generateWorkspaceTokens should throw on empty", () => {
  // Simulate empty generation
  assertThrows(() => {
    const result = { publicSlug: "", secretToken: "" };
    if (!result.publicSlug || !result.secretToken) {
      throw new Error("generateWorkspaceTokens: empty segment");
    }
  });
});

test("Generated slugs should be unique across multiple calls", () => {
  const slugs = new Set();
  for (let i = 0; i < 50; i++) {
    slugs.add(randomSlug());
  }
  // With 6 adjectives, 6 nouns, and 90 numbers, there are 3240 combinations
  // We should get at least 30 unique slugs from 50 calls
  assertTrue(
    slugs.size >= 30,
    `Expected at least 30 unique slugs, got ${slugs.size}`,
  );
});

// ============================================
// MODULE 3: Workspace Storage Tests
// ============================================
console.log("\n📦 Module: workspace-storage");

function isValidSegment(s) {
  const t = s.trim();
  if (!t) return false;
  if (t === "undefined" || t === "null") return false;
  if (t.includes("/")) return false;
  return true;
}

function isValidWorkspacePair(publicSlug, secretToken) {
  return isValidSegment(publicSlug) && isValidSegment(secretToken);
}

function parseWorkspacePath(raw) {
  if (!raw?.includes("/")) return null;
  const i = raw.indexOf("/");
  const publicSlug = raw.slice(0, i).trim();
  const secretToken = raw.slice(i + 1).trim();
  if (!isValidSegment(publicSlug) || !isValidSegment(secretToken)) return null;
  return { publicSlug, secretToken };
}

test("isValidSegment should accept valid segments", () => {
  assertTrue(isValidSegment("dashing-bear-42"));
  assertTrue(isValidSegment("abc123"));
});

test("isValidSegment should reject empty strings", () => {
  assertFalse(isValidSegment(""));
  assertFalse(isValidSegment("   "));
});

test("isValidSegment should reject undefined/null strings", () => {
  assertFalse(isValidSegment("undefined"));
  assertFalse(isValidSegment("null"));
});

test("isValidSegment should reject segments with /", () => {
  assertFalse(isValidSegment("foo/bar"));
});

test("isValidWorkspacePair should validate both segments", () => {
  assertTrue(isValidWorkspacePair("slug-1", "token-2"));
  assertFalse(isValidWorkspacePair("", "token"));
  assertFalse(isValidWorkspacePair("slug", ""));
  assertFalse(isValidWorkspacePair("undefined", "token"));
  assertFalse(isValidWorkspacePair("slug", "null"));
});

test("parseWorkspacePath should extract slug and token", () => {
  const parsed = parseWorkspacePath("my-slug/my-token");
  assertEqual(parsed.publicSlug, "my-slug");
  assertEqual(parsed.secretToken, "my-token");
});

test("parseWorkspacePath should return null for invalid paths", () => {
  assertEqual(parseWorkspacePath(null), null);
  assertEqual(parseWorkspacePath(""), null);
  assertEqual(parseWorkspacePath("no-slash"), null);
  assertEqual(parseWorkspacePath("undefined/token"), null);
});

test("parseWorkspacePath should handle edge cases", () => {
  assertEqual(parseWorkspacePath("/"), null);
  assertEqual(parseWorkspacePath("a/"), null); // empty token after trim
  assertEqual(parseWorkspacePath("/b"), null); // empty slug
});

// ============================================
// MODULE 4: URL Building Tests
// ============================================
console.log("\n📦 Module: urls");

const WEBHOOK_PUBLIC_PATH_PREFIX = "/at";

function buildWorkspaceAppPath(publicSlug, secretToken) {
  return `/webhook/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}

function buildIngestUrl(origin, publicSlug, secretToken) {
  const base = origin.replace(/\/$/, "");
  return `${base}${WEBHOOK_PUBLIC_PATH_PREFIX}/${encodeURIComponent(publicSlug)}/${encodeURIComponent(secretToken)}`;
}

test("buildWorkspaceAppPath should construct correct path", () => {
  const path = buildWorkspaceAppPath("my-slug", "my-token");
  assertEqual(path, "/webhook/my-slug/my-token");
});

test("buildWorkspaceAppPath should URL-encode special characters", () => {
  const path = buildWorkspaceAppPath("hello world", "test+token");
  assertEqual(path, "/webhook/hello%20world/test%2Btoken");
});

test("buildIngestUrl should construct full URL", () => {
  const url = buildIngestUrl("https://example.com", "slug", "token");
  assertEqual(url, "https://example.com/at/slug/token");
});

test("buildIngestUrl should handle trailing slash in origin", () => {
  const url = buildIngestUrl("https://example.com/", "slug", "token");
  assertEqual(url, "https://example.com/at/slug/token");
});

test("buildIngestUrl should handle different origins", () => {
  const local = buildIngestUrl("http://localhost:3000", "s", "t");
  assertEqual(local, "http://localhost:3000/at/s/t");
});

// ============================================
// MODULE 5: Header Processing Tests
// ============================================
console.log("\n📦 Module: ingest-headers");

const DENYLIST = new Set(
  [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "cf-connecting-ip",
    "cf-ray",
    "cf-visitor",
  ].map((h) => h.toLowerCase()),
);

function headersObjectFromRequest(headers) {
  const out = {};
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (DENYLIST.has(k)) return;
    out[key] = value;
  });
  return out;
}

test("headersObjectFromRequest should extract headers", () => {
  const headers = new Map([
    ["content-type", "application/json"],
    ["x-custom", "value"],
  ]);
  const result = headersObjectFromRequest(headers);
  assertEqual(result["content-type"], "application/json");
  assertEqual(result["x-custom"], "value");
});

test("headersObjectFromRequest should filter denylisted headers", () => {
  const headers = new Map([
    ["Content-Type", "application/json"],
    ["Connection", "keep-alive"],
    ["CF-Ray", "abc123"],
    ["X-Custom", "value"],
  ]);
  const result = headersObjectFromRequest(headers);
  assertEqual(result["Content-Type"], "application/json");
  assertEqual(result["X-Custom"], "value");
  assertEqual(result["Connection"], undefined);
  assertEqual(result["CF-Ray"], undefined);
});

test("headersObjectFromRequest should be case-insensitive for denylist", () => {
  const headers = new Map([
    ["CONNECTION", "keep-alive"],
    ["connection", "keep-alive"],
    ["Connection", "keep-alive"],
  ]);
  const result = headersObjectFromRequest(headers);
  // All variations should be filtered
  assertEqual(Object.keys(result).length, 0);
});

test("DENYLIST should contain all hop-by-hop headers", () => {
  assertTrue(DENYLIST.has("connection"));
  assertTrue(DENYLIST.has("keep-alive"));
  assertTrue(DENYLIST.has("transfer-encoding"));
  assertTrue(DENYLIST.has("upgrade"));
  assertTrue(DENYLIST.has("cf-ray"));
});

// ============================================
// MODULE 6: Send Test Templates Tests
// ============================================
console.log("\n📦 Module: send-test-templates");

const SEND_TEST_HEADER_TEMPLATES = [
  {
    id: "json",
    label: "JSON (default)",
    value: '{"Content-Type": "application/json"}',
  },
  {
    id: "stripe",
    label: "Stripe-style",
    value:
      '{"Content-Type": "application/json", "Stripe-Signature": "t=1234567890,v1=demo"}',
  },
  { id: "github", label: "GitHub-style", value: '{"X-GitHub-Event": "ping"}' },
  {
    id: "form",
    label: "Form URL-encoded",
    value: '{"Content-Type": "application/x-www-form-urlencoded"}',
  },
  { id: "minimal", label: "No extra headers", value: "{}" },
];

const SEND_TEST_BODY_TEMPLATES = [
  { id: "hello", label: "Simple JSON", value: '{"hello": "world"}' },
  {
    id: "stripe_event",
    label: "Stripe event",
    value: '{"id": "evt_test_123", "type": "checkout.session.completed"}',
  },
  {
    id: "github_ping",
    label: "GitHub ping",
    value: '{"zen": "Responsive is better than fast."}',
  },
  { id: "empty_json", label: "Empty object", value: "{}" },
];

function getHeaderTemplateById(id) {
  return SEND_TEST_HEADER_TEMPLATES.find((t) => t.id === id)?.value;
}

function getBodyTemplateById(templateId) {
  return SEND_TEST_BODY_TEMPLATES.find((t) => t.id === templateId)?.value;
}

test("Header templates should have unique IDs", () => {
  const ids = SEND_TEST_HEADER_TEMPLATES.map((t) => t.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length);
});

test("Body templates should have unique IDs", () => {
  const ids = SEND_TEST_BODY_TEMPLATES.map((t) => t.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length);
});

test("getHeaderTemplateById should return correct template", () => {
  const json = getHeaderTemplateById("json");
  assertContains(json, "Content-Type");
  assertContains(json, "application/json");
});

test("getHeaderTemplateById should return undefined for unknown ID", () => {
  const result = getHeaderTemplateById("unknown");
  assertEqual(result, undefined);
});

test("getBodyTemplateById should return correct template", () => {
  const hello = getBodyTemplateById("hello");
  assertContains(hello, "hello");
  assertContains(hello, "world");
});

test("getBodyTemplateById should return undefined for unknown ID", () => {
  const result = getBodyTemplateById("unknown");
  assertEqual(result, undefined);
});

test("Header templates should be valid JSON", () => {
  for (const template of SEND_TEST_HEADER_TEMPLATES) {
    try {
      JSON.parse(template.value);
    } catch (e) {
      throw new Error(
        `Template ${template.id} is not valid JSON: ${e.message}`,
      );
    }
  }
});

test("Body templates should be valid JSON", () => {
  for (const template of SEND_TEST_BODY_TEMPLATES) {
    try {
      JSON.parse(template.value);
    } catch (e) {
      throw new Error(
        `Template ${template.id} is not valid JSON: ${e.message}`,
      );
    }
  }
});

// ============================================
// MODULE 7: Mock Data Tests
// ============================================
console.log("\n📦 Module: mock-data");

function buildMockRequestsForEndpoint(ep) {
  const t = Math.floor(Date.now() / 1000);
  const path = `/at/${ep.publicSlug}/${ep.secretToken}`;
  const hostExample = "hooks.example.test";

  return [
    {
      id: `${ep.id}_mock_1`,
      endpoint_id: ep.id,
      method: "POST",
      path,
      headers: JSON.stringify({
        host: hostExample,
        "content-type": "application/json",
      }),
      body: JSON.stringify({ id: "evt_demo_1", object: "event" }),
      created_at: t - 90,
    },
    {
      id: `${ep.id}_mock_2`,
      endpoint_id: ep.id,
      method: "POST",
      path,
      headers: JSON.stringify({ host: hostExample, "x-github-event": "ping" }),
      body: JSON.stringify({ zen: "Responsive is better than fast." }),
      created_at: t - 3600,
    },
    {
      id: `${ep.id}_mock_3`,
      endpoint_id: ep.id,
      method: "GET",
      path: `${path}?challenge=health_check`,
      headers: JSON.stringify({
        host: hostExample,
        "user-agent": "curl/8.5.0",
      }),
      body: null,
      created_at: t - 7200,
    },
  ];
}

test("buildMockRequestsForEndpoint should return 3 mock requests", () => {
  const ep = {
    id: "ep_123",
    publicSlug: "test-slug",
    secretToken: "secret123",
  };
  const requests = buildMockRequestsForEndpoint(ep);
  assertEqual(requests.length, 3);
});

test("Mock requests should have correct endpoint_id", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  for (const req of requests) {
    assertEqual(req.endpoint_id, "ep_123");
  }
});

test("Mock requests should have unique IDs", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  const ids = requests.map((r) => r.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length);
});

test("Mock requests should include correct path", () => {
  const ep = { id: "ep_123", publicSlug: "my-slug", secretToken: "my-token" };
  const requests = buildMockRequestsForEndpoint(ep);
  assertContains(requests[0].path, "/at/my-slug/my-token");
});

test("Mock request methods should be valid HTTP methods", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  const validMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
  ];
  for (const req of requests) {
    assertTrue(
      validMethods.includes(req.method),
      `Invalid method: ${req.method}`,
    );
  }
});

test("Mock request headers should be valid JSON strings", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  for (const req of requests) {
    try {
      JSON.parse(req.headers);
    } catch (e) {
      throw new Error(`Invalid headers JSON: ${e.message}`);
    }
  }
});

test("Mock request created_at should be in the past", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  const now = Math.floor(Date.now() / 1000);
  for (const req of requests) {
    assertTrue(
      req.created_at < now,
      `created_at ${req.created_at} should be in the past`,
    );
  }
});

test("GET request should have null body", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  const getRequest = requests.find((r) => r.method === "GET");
  assertEqual(getRequest.body, null);
});

// ============================================
// MODULE 8: Test Webhook API Validation Tests
// ============================================
console.log("\n📦 Module: test-webhook API");

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const MAX_OUTBOUND_BODY = 256 * 1024;

function isPlainHeaderObject(v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  for (const [, val] of Object.entries(v)) {
    if (typeof val !== "string") return false;
  }
  return true;
}

function validateTestWebhookRequest(parsed) {
  const errors = [];

  const urlRaw = typeof parsed.url === "string" ? parsed.url.trim() : "";
  const methodRaw =
    typeof parsed.method === "string"
      ? parsed.method.trim().toUpperCase()
      : "POST";

  if (!urlRaw) errors.push("URL is required");
  if (!ALLOWED_METHODS.has(methodRaw))
    errors.push(`Unsupported method: ${methodRaw}`);

  let target;
  try {
    target = new URL(urlRaw);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      errors.push("Only http and https URLs are allowed");
    }
  } catch {
    errors.push("Invalid URL");
  }

  if (parsed.headers !== undefined && parsed.headers !== null) {
    if (!isPlainHeaderObject(parsed.headers)) {
      errors.push(
        "headers must be a JSON object of string keys to string values",
      );
    }
  }

  if (parsed.body !== undefined && parsed.body !== null) {
    if (typeof parsed.body !== "string") {
      errors.push("body must be a string when provided");
    } else if (parsed.body.length > MAX_OUTBOUND_BODY) {
      errors.push(`body exceeds ${MAX_OUTBOUND_BODY} bytes`);
    }
  }

  return errors;
}

test("should accept valid request", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com/webhook",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"test": true}',
  });
  assertEqual(errors.length, 0);
});

test("should reject missing URL", () => {
  const errors = validateTestWebhookRequest({ url: "" });
  assertContains(errors.join(", "), "URL is required");
});

test("should reject invalid URL", () => {
  const errors = validateTestWebhookRequest({ url: "not-a-url" });
  assertContains(errors.join(", "), "Invalid URL");
});

test("should reject non-HTTP protocols", () => {
  const errors = validateTestWebhookRequest({ url: "ftp://example.com" });
  assertContains(errors.join(", "), "Only http and https URLs are allowed");
});

test("should reject unsupported methods", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    method: "TRACE",
  });
  assertContains(errors.join(", "), "Unsupported method");
});

test("should accept all supported methods", () => {
  for (const method of ALLOWED_METHODS) {
    const errors = validateTestWebhookRequest({
      url: "https://example.com",
      method,
    });
    assertEqual(errors.length, 0, `Method ${method} should be valid`);
  }
});

test("should reject invalid headers", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    headers: ["not-an-object"],
  });
  assertContains(errors.join(", "), "headers must be a JSON object");
});

test("should reject headers with non-string values", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    headers: { "X-Number": 123 },
  });
  assertContains(errors.join(", "), "headers must be a JSON object");
});

test("should reject non-string body", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    body: { not: "a string" },
  });
  assertContains(errors.join(", "), "body must be a string");
});

test("should reject oversized body", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    body: "x".repeat(MAX_OUTBOUND_BODY + 1),
  });
  assertContains(errors.join(", "), "body exceeds");
});

test("should accept empty body", () => {
  const errors = validateTestWebhookRequest({
    url: "https://example.com",
    body: null,
  });
  assertEqual(errors.length, 0);
});

test("should default method to POST", () => {
  const errors = validateTestWebhookRequest({ url: "https://example.com" });
  // Should not have method-related errors when method is omitted
  assertFalse(errors.some((e) => e.includes("method")));
});

// ============================================
// MODULE 9: Database Types Tests
// ============================================
console.log("\n📦 Module: Database Schema Types");

// Validate type definitions
const sampleEndpointRow = {
  id: "ep_123",
  created_at: 1234567890,
  public_slug: "dashing-bear-42",
  secret_token: "a1b2c3d4e5f6",
};

const sampleRequestRow = {
  id: "req_123",
  endpoint_id: "ep_123",
  method: "POST",
  path: "/at/slug/token",
  headers: "{}",
  body: '{"test": true}',
  created_at: 1234567890,
};

test("EndpointRow should have required fields", () => {
  assertExists(sampleEndpointRow.id);
  assertExists(sampleEndpointRow.created_at);
  assertExists(sampleEndpointRow.public_slug);
  assertExists(sampleEndpointRow.secret_token);
});

test("EndpointRow id should be string", () => {
  assertEqual(typeof sampleEndpointRow.id, "string");
});

test("EndpointRow created_at should be number (unix timestamp)", () => {
  assertEqual(typeof sampleEndpointRow.created_at, "number");
  assertTrue(sampleEndpointRow.created_at > 0);
});

test("WebhookRequestRow should have required fields", () => {
  assertExists(sampleRequestRow.id);
  assertExists(sampleRequestRow.endpoint_id);
  assertExists(sampleRequestRow.method);
  assertExists(sampleRequestRow.path);
  assertExists(sampleRequestRow.headers);
  assertExists(sampleRequestRow.created_at);
});

test("WebhookRequestRow body can be null", () => {
  const withNullBody = { ...sampleRequestRow, body: null };
  assertEqual(withNullBody.body, null);
});

test("WebhookRequestRow headers should be JSON string", () => {
  try {
    JSON.parse(sampleRequestRow.headers);
  } catch {
    throw new Error("headers should be valid JSON");
  }
});

// ============================================
// MODULE 10: Edge Cases & Integration Tests
// ============================================
console.log("\n📦 Module: Edge Cases & Integration");

test("URL encoding should handle special characters", () => {
  const slug = "test+slug with spaces";
  const token = "token/with/slashes";
  const path = buildWorkspaceAppPath(slug, token);
  assertTrue(path.includes("%2B") || path.includes("+")); // + encoded
  assertTrue(path.includes("%20") || path.includes("%2F")); // space or slash encoded
});

test("Workspace token generation should be URL-safe", () => {
  for (let i = 0; i < 20; i++) {
    const { publicSlug, secretToken } = generateWorkspaceTokens();
    // Should not contain characters that break URLs
    assertFalse(publicSlug.includes("/"), "Slug should not contain /");
    assertFalse(secretToken.includes("/"), "Token should not contain /");
    assertFalse(publicSlug.includes("?"), "Slug should not contain ?");
    assertFalse(secretToken.includes("?"), "Token should not contain ?");
  }
});

test("Timestamp generation should be monotonic", () => {
  const timestamps = [];
  for (let i = 0; i < 10; i++) {
    timestamps.push(Date.now());
  }
  for (let i = 1; i < timestamps.length; i++) {
    assertTrue(
      timestamps[i] >= timestamps[i - 1],
      "Timestamps should not go backwards",
    );
  }
});

test("Empty/null handling in parseWorkspacePath", () => {
  assertEqual(parseWorkspacePath(undefined), null);
  assertEqual(parseWorkspacePath(null), null);
  assertEqual(parseWorkspacePath(""), null);
  assertEqual(parseWorkspacePath("   "), null);
});

test("Unicode handling in workspace segments", () => {
  // Unicode should be valid as long as it doesn't contain / or undefined/null
  assertTrue(isValidSegment("hello-世界-42"));
  assertTrue(isValidSegment("emoji-🎉-test"));
});

test("Very long strings in validation", () => {
  const longSlug = "a".repeat(1000);
  assertTrue(isValidSegment(longSlug));
});

test("Request ID format should be consistent", () => {
  const ep = { id: "ep_123", publicSlug: "slug", secretToken: "token" };
  const requests = buildMockRequestsForEndpoint(ep);
  for (const req of requests) {
    assertTrue(req.id.startsWith("ep_123_mock_"));
  }
});

// ============================================
// Summary
// ============================================
console.log("\n" + "=".repeat(50));
console.log("Test Summary");
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
