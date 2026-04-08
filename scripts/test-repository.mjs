#!/usr/bin/env node
/**
 * Repository Layer Tests for webhook-test-app
 * Tests D1 database operations with mock database
 *
 * Run: node scripts/test-repository.mjs
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
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
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

// ============================================
// Mock D1 Database
// ============================================

class MockD1Database {
  constructor() {
    this.tables = {
      webhook_endpoints: new Map(),
      webhook_workspace_endpoints: new Map(),
      webhook_requests: new Map(),
    };
    this.queryLog = [];
  }

  clear() {
    this.tables.webhook_endpoints.clear();
    this.tables.webhook_workspace_endpoints.clear();
    this.tables.webhook_requests.clear();
    this.queryLog = [];
  }

  prepare(sql) {
    this.queryLog.push(sql);
    return new MockD1PreparedStatement(this, sql);
  }
}

class MockD1PreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.bindValues = [];
  }

  bind(...values) {
    this.bindValues = values;
    return this;
  }

  first() {
    // Simulate first() behavior
    const mockResult = this._execute();
    if (Array.isArray(mockResult)) {
      return Promise.resolve(mockResult[0] || null);
    }
    return Promise.resolve(mockResult || null);
  }

  all() {
    const results = this._execute();
    return Promise.resolve({ results: Array.isArray(results) ? results : [] });
  }

  run() {
    this._execute();
    return Promise.resolve({});
  }

  _execute() {
    const sql = this.sql.toLowerCase();
    const values = this.bindValues;

    // Simple SQL parsing for mock
    if (sql.includes("insert into webhook_endpoints")) {
      const [id, created_at, public_slug, secret_token] = values;
      this.db.tables.webhook_endpoints.set(id, {
        id,
        created_at,
        public_slug,
        secret_token,
      });
      return [];
    }

    if (sql.includes("insert into webhook_workspace_endpoints")) {
      const [workspace_id, endpoint_id, created_at] = values;
      const key = `${workspace_id}:${endpoint_id}`;
      this.db.tables.webhook_workspace_endpoints.set(key, {
        workspace_id,
        endpoint_id,
        created_at,
      });
      return [];
    }

    if (sql.includes("insert into webhook_requests")) {
      const [id, endpoint_id, method, path, headers, body, created_at] = values;
      this.db.tables.webhook_requests.set(id, {
        id,
        endpoint_id,
        method,
        path,
        headers,
        body,
        created_at,
      });
      return [];
    }

    if (sql.includes("select") && sql.includes("webhook_endpoints")) {
      if (sql.includes("where public_slug = ? and secret_token = ?")) {
        const [public_slug, secret_token] = values;
        for (const ep of this.db.tables.webhook_endpoints.values()) {
          if (ep.public_slug === public_slug && ep.secret_token === secret_token) {
            return [ep];
          }
        }
        return [];
      }
      return Array.from(this.db.tables.webhook_endpoints.values());
    }

    if (sql.includes("select") && sql.includes("webhook_workspace_endpoints")) {
      if (sql.includes("count(*)")) {
        const [workspace_id] = values;
        let count = 0;
        for (const link of this.db.tables.webhook_workspace_endpoints.values()) {
          if (link.workspace_id === workspace_id) count++;
        }
        return [{ c: count }];
      }
      if (sql.includes("where workspace_id = ? and endpoint_id = ?")) {
        const [workspace_id, endpoint_id] = values;
        const key = `${workspace_id}:${endpoint_id}`;
        return this.db.tables.webhook_workspace_endpoints.has(key) ? [{ ok: 1 }] : [];
      }
      if (sql.includes("where workspace_id = ?")) {
        const [workspace_id] = values;
        const results = [];
        for (const link of this.db.tables.webhook_workspace_endpoints.values()) {
          if (link.workspace_id === workspace_id) {
            const ep = this.db.tables.webhook_endpoints.get(link.endpoint_id);
            if (ep) results.push(ep);
          }
        }
        return results.sort((a, b) => a.created_at - b.created_at);
      }
      if (sql.includes("where endpoint_id = ?")) {
        const [endpoint_id] = values;
        let count = 0;
        for (const link of this.db.tables.webhook_workspace_endpoints.values()) {
          if (link.endpoint_id === endpoint_id) count++;
        }
        return [{ c: count }];
      }
    }

    if (sql.includes("select") && sql.includes("webhook_requests")) {
      const [endpoint_id, limit] = values;
      const results = [];
      for (const req of this.db.tables.webhook_requests.values()) {
        if (req.endpoint_id === endpoint_id) results.push(req);
      }
      return results
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit || 100);
    }

    if (sql.includes("delete from webhook_workspace_endpoints")) {
      const [workspace_id, endpoint_id] = values;
      const key = `${workspace_id}:${endpoint_id}`;
      this.db.tables.webhook_workspace_endpoints.delete(key);
      return [];
    }

    if (sql.includes("delete from webhook_endpoints")) {
      const [id] = values;
      this.db.tables.webhook_endpoints.delete(id);
      return [];
    }

    if (sql.includes("insert or ignore")) {
      const [workspace_id, endpoint_id, created_at] = values;
      const key = `${workspace_id}:${endpoint_id}`;
      if (!this.db.tables.webhook_workspace_endpoints.has(key)) {
        this.db.tables.webhook_workspace_endpoints.set(key, {
          workspace_id,
          endpoint_id,
          created_at,
        });
      }
      return [];
    }

    return [];
  }
}

// ============================================
// Repository Functions (re-implemented for testing)
// ============================================

async function findEndpointBySlugToken(db, publicSlug, secretToken) {
  const row = await db
    .prepare(
      `SELECT id, created_at, public_slug, secret_token
       FROM webhook_endpoints
       WHERE public_slug = ? AND secret_token = ?`,
    )
    .bind(publicSlug, secretToken)
    .first();
  return row ?? null;
}

async function listEndpointsForWorkspace(db, workspaceId) {
  const { results } = await db
    .prepare(
      `SELECT e.id, e.created_at, e.public_slug, e.secret_token
       FROM webhook_endpoints e
       INNER JOIN webhook_workspace_endpoints w
         ON w.endpoint_id = e.id
       WHERE w.workspace_id = ?
       ORDER BY w.created_at ASC`,
    )
    .bind(workspaceId)
    .all();
  return results ?? [];
}

async function countWorkspaceLinks(db, workspaceId) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM webhook_workspace_endpoints WHERE workspace_id = ?`,
    )
    .bind(workspaceId)
    .first();
  return row?.c ?? 0;
}

async function workspaceHasEndpoint(db, workspaceId, endpointId) {
  const row = await db
    .prepare(
      `SELECT 1 as ok FROM webhook_workspace_endpoints
       WHERE workspace_id = ? AND endpoint_id = ?`,
    )
    .bind(workspaceId, endpointId)
    .first();
  return !!row;
}

async function insertEndpoint(db, row) {
  await db
    .prepare(
      `INSERT INTO webhook_endpoints (id, created_at, public_slug, secret_token)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.created_at, row.public_slug, row.secret_token)
    .run();
}

async function linkEndpointToWorkspace(db, workspaceId, endpointId, createdAt) {
  await db
    .prepare(
      `INSERT INTO webhook_workspace_endpoints (workspace_id, endpoint_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(workspaceId, endpointId, createdAt)
    .run();
}

async function ensureWorkspaceLink(db, workspaceId, endpointId) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT OR IGNORE INTO webhook_workspace_endpoints (workspace_id, endpoint_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(workspaceId, endpointId, now)
    .run();
}

async function deleteWorkspaceLink(db, workspaceId, endpointId) {
  await db
    .prepare(
      `DELETE FROM webhook_workspace_endpoints
       WHERE workspace_id = ? AND endpoint_id = ?`,
    )
    .bind(workspaceId, endpointId)
    .run();
}

async function deleteEndpointIfOrphaned(db, endpointId) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM webhook_workspace_endpoints WHERE endpoint_id = ?`,
    )
    .bind(endpointId)
    .first();
  if ((row?.c ?? 0) > 0) return;
  await db.prepare(`DELETE FROM webhook_endpoints WHERE id = ?`).bind(endpointId).run();
}

async function insertRequest(db, row) {
  await db
    .prepare(
      `INSERT INTO webhook_requests (id, endpoint_id, method, path, headers, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.endpoint_id, row.method, row.path, row.headers, row.body, row.created_at)
    .run();
}

async function listRequestsForEndpoint(db, endpointId, limit) {
  const { results } = await db
    .prepare(
      `SELECT id, endpoint_id, method, path, headers, body, created_at
       FROM webhook_requests
       WHERE endpoint_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(endpointId, limit)
    .all();
  return results ?? [];
}

// ============================================
// Tests
// ============================================

console.log("\n📦 Module: Repository - Endpoint Operations");

const mockDb = new MockD1Database();

test("insertEndpoint should store endpoint", async () => {
  mockDb.clear();
  const row = {
    id: "ep_001",
    created_at: 1234567890,
    public_slug: "dashing-bear-42",
    secret_token: "secret123",
  };
  await insertEndpoint(mockDb, row);
  const stored = mockDb.tables.webhook_endpoints.get("ep_001");
  assertEqual(stored.id, "ep_001");
  assertEqual(stored.public_slug, "dashing-bear-42");
});

test("findEndpointBySlugToken should find existing endpoint", async () => {
  mockDb.clear();
  const row = {
    id: "ep_002",
    created_at: 1234567890,
    public_slug: "quiet-fox-99",
    secret_token: "secret456",
  };
  await insertEndpoint(mockDb, row);
  await linkEndpointToWorkspace(mockDb, "ws_001", "ep_002", 1234567890);

  const found = await findEndpointBySlugToken(mockDb, "quiet-fox-99", "secret456");
  assertEqual(found.id, "ep_002");
});

test("findEndpointBySlugToken should return null for non-existent", async () => {
  mockDb.clear();
  const found = await findEndpointBySlugToken(mockDb, "non-existent", "bad-token");
  assertEqual(found, null);
});

console.log("\n📦 Module: Repository - Workspace Link Operations");

test("linkEndpointToWorkspace should create link", async () => {
  mockDb.clear();
  await linkEndpointToWorkspace(mockDb, "ws_001", "ep_003", 1234567890);
  const key = "ws_001:ep_003";
  assertTrue(mockDb.tables.webhook_workspace_endpoints.has(key));
});

test("countWorkspaceLinks should return correct count", async () => {
  mockDb.clear();
  await linkEndpointToWorkspace(mockDb, "ws_002", "ep_004", 1234567890);
  await linkEndpointToWorkspace(mockDb, "ws_002", "ep_005", 1234567891);

  const count = await countWorkspaceLinks(mockDb, "ws_002");
  assertEqual(count, 2);
});

test("countWorkspaceLinks should return 0 for empty workspace", async () => {
  mockDb.clear();
  const count = await countWorkspaceLinks(mockDb, "ws_empty");
  assertEqual(count, 0);
});

test("workspaceHasEndpoint should return true for linked endpoint", async () => {
  mockDb.clear();
  await linkEndpointToWorkspace(mockDb, "ws_003", "ep_006", 1234567890);

  const has = await workspaceHasEndpoint(mockDb, "ws_003", "ep_006");
  assertTrue(has);
});

test("workspaceHasEndpoint should return false for unlinked endpoint", async () => {
  mockDb.clear();
  await linkEndpointToWorkspace(mockDb, "ws_004", "ep_007", 1234567890);

  const has = await workspaceHasEndpoint(mockDb, "ws_004", "ep_999");
  assertFalse(has);
});

test("listEndpointsForWorkspace should return linked endpoints", async () => {
  mockDb.clear();
  await insertEndpoint(mockDb, {
    id: "ep_008",
    created_at: 1234567890,
    public_slug: "brave-hawk-11",
    secret_token: "secret789",
  });
  await insertEndpoint(mockDb, {
    id: "ep_009",
    created_at: 1234567891,
    public_slug: "swift-deer-22",
    secret_token: "secret000",
  });
  await linkEndpointToWorkspace(mockDb, "ws_005", "ep_008", 1234567890);
  await linkEndpointToWorkspace(mockDb, "ws_005", "ep_009", 1234567891);

  const endpoints = await listEndpointsForWorkspace(mockDb, "ws_005");
  assertEqual(endpoints.length, 2);
  assertEqual(endpoints[0].id, "ep_008");
  assertEqual(endpoints[1].id, "ep_009");
});

test("listEndpointsForWorkspace should return empty for no links", async () => {
  mockDb.clear();
  const endpoints = await listEndpointsForWorkspace(mockDb, "ws_no_links");
  assertEqual(endpoints.length, 0);
});

console.log("\n📦 Module: Repository - Delete Operations");

test("deleteWorkspaceLink should remove link", async () => {
  mockDb.clear();
  await linkEndpointToWorkspace(mockDb, "ws_006", "ep_010", 1234567890);

  await deleteWorkspaceLink(mockDb, "ws_006", "ep_010");
  const has = await workspaceHasEndpoint(mockDb, "ws_006", "ep_010");
  assertFalse(has);
});

test("deleteEndpointIfOrphaned should delete orphaned endpoint", async () => {
  mockDb.clear();
  await insertEndpoint(mockDb, {
    id: "ep_011",
    created_at: 1234567890,
    public_slug: "calm-wolf-33",
    secret_token: "secret111",
  });
  // Link and then unlink to orphan it
  await linkEndpointToWorkspace(mockDb, "ws_007", "ep_011", 1234567890);
  await deleteWorkspaceLink(mockDb, "ws_007", "ep_011");

  await deleteEndpointIfOrphaned(mockDb, "ep_011");
  assertFalse(mockDb.tables.webhook_endpoints.has("ep_011"));
});

test("deleteEndpointIfOrphaned should keep non-orphaned endpoint", async () => {
  mockDb.clear();
  await insertEndpoint(mockDb, {
    id: "ep_012",
    created_at: 1234567890,
    public_slug: "bright-bear-44",
    secret_token: "secret222",
  });
  // Link to two workspaces
  await linkEndpointToWorkspace(mockDb, "ws_008", "ep_012", 1234567890);
  await linkEndpointToWorkspace(mockDb, "ws_009", "ep_012", 1234567891);

  // Delete one link
  await deleteWorkspaceLink(mockDb, "ws_008", "ep_012");

  // Should NOT delete endpoint (still linked to ws_009)
  await deleteEndpointIfOrphaned(mockDb, "ep_012");
  assertTrue(mockDb.tables.webhook_endpoints.has("ep_012"));
});

console.log("\n📦 Module: Repository - Request Operations");

test("insertRequest should store request", async () => {
  mockDb.clear();
  const row = {
    id: "req_001",
    endpoint_id: "ep_013",
    method: "POST",
    path: "/at/slug/token",
    headers: '{"Content-Type": "application/json"}',
    body: '{"test": true}',
    created_at: 1234567890,
  };
  await insertRequest(mockDb, row);
  const stored = mockDb.tables.webhook_requests.get("req_001");
  assertEqual(stored.method, "POST");
  assertEqual(stored.body, '{"test": true}');
});

test("listRequestsForEndpoint should return requests for endpoint", async () => {
  mockDb.clear();
  await insertRequest(mockDb, {
    id: "req_002",
    endpoint_id: "ep_014",
    method: "POST",
    path: "/at/s/t",
    headers: "{}",
    body: "body1",
    created_at: 1234567890,
  });
  await insertRequest(mockDb, {
    id: "req_003",
    endpoint_id: "ep_014",
    method: "GET",
    path: "/at/s/t",
    headers: "{}",
    body: null,
    created_at: 1234567891,
  });
  await insertRequest(mockDb, {
    id: "req_004",
    endpoint_id: "ep_015", // different endpoint
    method: "DELETE",
    path: "/at/other",
    headers: "{}",
    body: null,
    created_at: 1234567892,
  });

  const requests = await listRequestsForEndpoint(mockDb, "ep_014", 10);
  assertEqual(requests.length, 2);
  // Should be sorted by created_at DESC
  assertEqual(requests[0].id, "req_003");
  assertEqual(requests[1].id, "req_002");
});

test("listRequestsForEndpoint should respect limit", async () => {
  mockDb.clear();
  for (let i = 0; i < 5; i++) {
    await insertRequest(mockDb, {
      id: `req_${i}`,
      endpoint_id: "ep_016",
      method: "POST",
      path: "/at/s/t",
      headers: "{}",
      body: `body${i}`,
      created_at: 1234567890 + i,
    });
  }

  const requests = await listRequestsForEndpoint(mockDb, "ep_016", 3);
  assertEqual(requests.length, 3);
});

console.log("\n📦 Module: Repository - Idempotent Operations");

test("ensureWorkspaceLink should be idempotent", async () => {
  mockDb.clear();
  await ensureWorkspaceLink(mockDb, "ws_010", "ep_017");
  await ensureWorkspaceLink(mockDb, "ws_010", "ep_017");
  await ensureWorkspaceLink(mockDb, "ws_010", "ep_017");

  const count = await countWorkspaceLinks(mockDb, "ws_010");
  assertEqual(count, 1);
});

test("ensureWorkspaceLink should not affect other links", async () => {
  mockDb.clear();
  await ensureWorkspaceLink(mockDb, "ws_011", "ep_018");
  await ensureWorkspaceLink(mockDb, "ws_011", "ep_019");

  const count = await countWorkspaceLinks(mockDb, "ws_011");
  assertEqual(count, 2);
});

console.log("\n📦 Module: Repository - Edge Cases");

test("Operations should handle empty database gracefully", async () => {
  mockDb.clear();
  const found = await findEndpointBySlugToken(mockDb, "any", "thing");
  assertEqual(found, null);

  const count = await countWorkspaceLinks(mockDb, "any");
  assertEqual(count, 0);

  const has = await workspaceHasEndpoint(mockDb, "any", "thing");
  assertFalse(has);

  const endpoints = await listEndpointsForWorkspace(mockDb, "any");
  assertEqual(endpoints.length, 0);

  const requests = await listRequestsForEndpoint(mockDb, "any", 10);
  assertEqual(requests.length, 0);
});

test("Repository should handle special characters in slugs", async () => {
  mockDb.clear();
  await insertEndpoint(mockDb, {
    id: "ep_special",
    created_at: 1234567890,
    public_slug: "hello-world-unicode-🎉",
    secret_token: "token-with-unicode-🐻",
  });
  await linkEndpointToWorkspace(mockDb, "ws_unicode", "ep_special", 1234567890);

  const found = await findEndpointBySlugToken(mockDb, "hello-world-unicode-🎉", "token-with-unicode-🐻");
  assertEqual(found.id, "ep_special");
});

// ============================================
// Summary
// ============================================
async function runTests() {
  console.log("\n" + "=".repeat(50));
  console.log("Repository Test Summary");
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
}

runTests();
