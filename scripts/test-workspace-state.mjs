#!/usr/bin/env node
/**
 * Workspace State Management Tests
 * Tests localStorage-based workspace state operations
 *
 * Run: node scripts/test-workspace-state.mjs
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

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected value to exist, got ${JSON.stringify(value)}`);
  }
}

// ============================================
// Mock localStorage and crypto
// ============================================

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

let uuidCounter = 0;
function mockRandomUUID() {
  uuidCounter++;
  return `mock-uuid-${uuidCounter}`;
}

// ============================================
// Workspace State Implementation
// ============================================

const MAX_ENDPOINTS = 3;
const WORKSPACE_STATE_KEY = "webhook_workspace_state_v2";
const WORKSPACE_STORAGE_KEY = "webhook_test_workspace_v1";

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

function newId() {
  return mockRandomUUID();
}

function createEndpoint() {
  const { publicSlug, secretToken } = generateWorkspaceTokens();
  return {
    id: newId(),
    publicSlug,
    secretToken,
    createdAt: Date.now(),
  };
}

function loadWorkspaceState(storage) {
  try {
    const raw = storage.getItem(WORKSPACE_STATE_KEY);
    if (!raw) return { endpoints: [], selectedId: null };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.endpoints)) return { endpoints: [], selectedId: null };
    const endpoints = data.endpoints.filter(
      (e) =>
        e?.id &&
        typeof e.publicSlug === "string" &&
        typeof e.secretToken === "string" &&
        isValidWorkspacePair(e.publicSlug, e.secretToken),
    );
    let selectedId = data.selectedId;
    if (!selectedId || !endpoints.some((e) => e.id === selectedId)) {
      selectedId = endpoints[0]?.id ?? null;
    }
    if (endpoints.length > MAX_ENDPOINTS) {
      const trimmed = endpoints.slice(0, MAX_ENDPOINTS);
      if (!selectedId || !trimmed.some((e) => e.id === selectedId)) {
        selectedId = trimmed[0]?.id ?? null;
      }
      const next = { endpoints: trimmed, selectedId };
      saveWorkspaceState(storage, next);
      return next;
    }
    return { endpoints, selectedId };
  } catch {
    return { endpoints: [], selectedId: null };
  }
}

function saveWorkspaceState(storage, state) {
  try {
    storage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function migrateFromV1(storage) {
  try {
    if (storage.getItem(WORKSPACE_STATE_KEY)) return;
    const v1 = storage.getItem(WORKSPACE_STORAGE_KEY);
    const parsed = parseWorkspacePath(v1);
    if (!parsed) return;
    const ep = {
      id: newId(),
      publicSlug: parsed.publicSlug,
      secretToken: parsed.secretToken,
      createdAt: Date.now(),
    };
    saveWorkspaceState(storage, { endpoints: [ep], selectedId: ep.id });
  } catch {
    /* ignore */
  }
}

function ensureWorkspaceInitialized(storage) {
  migrateFromV1(storage);
  let state = loadWorkspaceState(storage);
  if (state.endpoints.length === 0) {
    const ep = createEndpoint();
    state = { endpoints: [ep], selectedId: ep.id };
    saveWorkspaceState(storage, state);
    return state;
  }
  if (!state.selectedId) {
    state = { ...state, selectedId: state.endpoints[0].id };
    saveWorkspaceState(storage, state);
  }
  return state;
}

function addEndpoint(storage) {
  const state = loadWorkspaceState(storage);
  if (state.endpoints.length >= MAX_ENDPOINTS) return null;
  const ep = createEndpoint();
  const next = {
    endpoints: [...state.endpoints, ep],
    selectedId: ep.id,
  };
  saveWorkspaceState(storage, next);
  return ep;
}

function selectEndpoint(storage, id) {
  const state = loadWorkspaceState(storage);
  if (!state.endpoints.some((e) => e.id === id)) return;
  saveWorkspaceState(storage, { ...state, selectedId: id });
}

function removeEndpoint(storage, id) {
  const state = loadWorkspaceState(storage);
  if (state.endpoints.length <= 1) return false;
  const endpoints = state.endpoints.filter((e) => e.id !== id);
  if (endpoints.length === state.endpoints.length) return false;
  let selectedId = state.selectedId;
  if (selectedId === id || !selectedId || !endpoints.some((e) => e.id === selectedId)) {
    selectedId = endpoints[0]?.id ?? null;
  }
  saveWorkspaceState(storage, { endpoints, selectedId });
  return true;
}

function upsertEndpointByTokens(storage, publicSlug, secretToken) {
  let state = loadWorkspaceState(storage);
  const hit = state.endpoints.find(
    (e) => e.publicSlug === publicSlug && e.secretToken === secretToken,
  );
  if (hit) {
    saveWorkspaceState(storage, { ...state, selectedId: hit.id });
    return { selected: hit };
  }
  if (state.endpoints.length >= MAX_ENDPOINTS) {
    const first = state.endpoints[0];
    saveWorkspaceState(storage, { ...state, selectedId: first.id });
    return { selected: first };
  }
  const ep = {
    id: newId(),
    publicSlug,
    secretToken,
    createdAt: Date.now(),
  };
  state = {
    endpoints: [...state.endpoints, ep],
    selectedId: ep.id,
  };
  saveWorkspaceState(storage, state);
  return { selected: ep };
}

// ============================================
// Tests
// ============================================

console.log("\n📦 Module: Workspace State - Initialization");

let storage;

test("loadWorkspaceState should return empty state for new storage", () => {
  storage = new MockLocalStorage();
  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 0);
  assertEqual(state.selectedId, null);
});

test("ensureWorkspaceInitialized should create endpoint if empty", () => {
  storage = new MockLocalStorage();
  const state = ensureWorkspaceInitialized(storage);
  assertEqual(state.endpoints.length, 1);
  assertExists(state.selectedId);
  assertEqual(state.selectedId, state.endpoints[0].id);
});

test("ensureWorkspaceInitialized should not modify existing state", () => {
  storage = new MockLocalStorage();
  const initial = ensureWorkspaceInitialized(storage);
  const id1 = initial.endpoints[0].id;

  const second = ensureWorkspaceInitialized(storage);
  assertEqual(second.endpoints.length, 1);
  assertEqual(second.endpoints[0].id, id1);
});

console.log("\n📦 Module: Workspace State - Migration");

test("migrateFromV1 should migrate v1 storage to v2", () => {
  storage = new MockLocalStorage();
  storage.setItem(WORKSPACE_STORAGE_KEY, "old-slug/old-token");

  migrateFromV1(storage);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1);
  assertEqual(state.endpoints[0].publicSlug, "old-slug");
  assertEqual(state.endpoints[0].secretToken, "old-token");
});

test("migrateFromV1 should not overwrite v2 if exists", () => {
  storage = new MockLocalStorage();
  storage.setItem(WORKSPACE_STORAGE_KEY, "old-slug/old-token");
  saveWorkspaceState(storage, {
    endpoints: [{ id: "ep1", publicSlug: "new-slug", secretToken: "new-token", createdAt: 1 }],
    selectedId: "ep1",
  });

  migrateFromV1(storage);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints[0].publicSlug, "new-slug");
});

test("migrateFromV1 should handle invalid v1 storage gracefully", () => {
  storage = new MockLocalStorage();
  storage.setItem(WORKSPACE_STORAGE_KEY, "no-slash-here");

  migrateFromV1(storage);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 0);
});

console.log("\n📦 Module: Workspace State - Add Endpoint");

test("addEndpoint should add new endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);

  const added = addEndpoint(storage);
  assertExists(added);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 2);
  assertEqual(state.selectedId, added.id);
});

test("addEndpoint should return null when at max endpoints", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  addEndpoint(storage);
  addEndpoint(storage);

  const third = addEndpoint(storage);
  assertEqual(third, null);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 3);
});

test("addEndpoint should create valid tokens", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);

  const added = addEndpoint(storage);
  assertTrue(isValidWorkspacePair(added.publicSlug, added.secretToken));
});

console.log("\n📦 Module: Workspace State - Remove Endpoint");

test("removeEndpoint should delete endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const added = addEndpoint(storage);

  const removed = removeEndpoint(storage, added.id);
  assertTrue(removed);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1);
});

test("removeEndpoint should prevent removing last endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const onlyEndpoint = loadWorkspaceState(storage).endpoints[0];

  const removed = removeEndpoint(storage, onlyEndpoint.id);
  assertFalse(removed);

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1);
});

test("removeEndpoint should select different endpoint after removal", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const ep1 = loadWorkspaceState(storage).endpoints[0];
  const ep2 = addEndpoint(storage);

  selectEndpoint(storage, ep2.id);
  removeEndpoint(storage, ep2.id);

  const state = loadWorkspaceState(storage);
  assertEqual(state.selectedId, ep1.id);
});

test("removeEndpoint should return false for non-existent endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  addEndpoint(storage);

  const removed = removeEndpoint(storage, "non-existent-id");
  assertFalse(removed);
});

console.log("\n📦 Module: Workspace State - Select Endpoint");

test("selectEndpoint should change selected endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const ep2 = addEndpoint(storage);

  selectEndpoint(storage, ep2.id);

  const state = loadWorkspaceState(storage);
  assertEqual(state.selectedId, ep2.id);
});

test("selectEndpoint should not change for invalid endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const original = loadWorkspaceState(storage).selectedId;

  selectEndpoint(storage, "non-existent-id");

  const state = loadWorkspaceState(storage);
  assertEqual(state.selectedId, original);
});

console.log("\n📦 Module: Workspace State - Upsert by Tokens");

test("upsertEndpointByTokens should select existing matching endpoint", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  const ep = loadWorkspaceState(storage).endpoints[0];

  const result = upsertEndpointByTokens(storage, ep.publicSlug, ep.secretToken);

  assertEqual(result.selected.id, ep.id);
  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1); // No new endpoint added
});

test("upsertEndpointByTokens should add new endpoint if not exists", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);

  const result = upsertEndpointByTokens(storage, "new-slug-123", "new-token-456");

  assertEqual(result.selected.publicSlug, "new-slug-123");
  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 2);
});

test("upsertEndpointByTokens should use first endpoint when at max", () => {
  storage = new MockLocalStorage();
  ensureWorkspaceInitialized(storage);
  addEndpoint(storage);
  addEndpoint(storage);

  const first = loadWorkspaceState(storage).endpoints[0];

  const result = upsertEndpointByTokens(storage, "another-slug", "another-token");

  assertEqual(result.selected.id, first.id); // Returns first, not new
  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 3); // Still at max
});

console.log("\n📦 Module: Workspace State - Validation");

test("loadWorkspaceState should filter invalid endpoints", () => {
  storage = new MockLocalStorage();
  saveWorkspaceState(storage, {
    endpoints: [
      { id: "ep1", publicSlug: "valid-slug", secretToken: "valid-token", createdAt: 1 },
      { id: "ep2", publicSlug: "undefined", secretToken: "token", createdAt: 2 }, // invalid
      { id: "ep3", publicSlug: "slug", secretToken: "null", createdAt: 3 }, // invalid
    ],
    selectedId: "ep1",
  });

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1);
  assertEqual(state.endpoints[0].id, "ep1");
});

test("loadWorkspaceState should trim to max endpoints", () => {
  storage = new MockLocalStorage();
  const endpoints = [];
  for (let i = 0; i < 5; i++) {
    endpoints.push({
      id: `ep${i}`,
      publicSlug: `slug-${i}`,
      secretToken: `token-${i}`,
      createdAt: i,
    });
  }
  saveWorkspaceState(storage, { endpoints, selectedId: "ep4" });

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 3);
  // Should keep first 3 and update selected to first
  assertEqual(state.selectedId, "ep0");
});

console.log("\n📦 Module: Workspace State - Edge Cases");

test("should handle corrupted storage gracefully", () => {
  storage = new MockLocalStorage();
  storage.setItem(WORKSPACE_STATE_KEY, "not-valid-json");

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 0);
  assertEqual(state.selectedId, null);
});

test("should handle null storage values", () => {
  storage = new MockLocalStorage();
  // getItem returns null by default
  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 0);
});

test("should handle endpoints array with non-objects", () => {
  storage = new MockLocalStorage();
  saveWorkspaceState(storage, {
    endpoints: [null, undefined, "string", 123, { id: "ep1", publicSlug: "slug", secretToken: "token", createdAt: 1 }],
    selectedId: "ep1",
  });

  const state = loadWorkspaceState(storage);
  assertEqual(state.endpoints.length, 1);
});

test("newId should generate unique IDs", () => {
  const ids = new Set();
  for (let i = 0; i < 10; i++) {
    ids.add(newId());
  }
  assertEqual(ids.size, 10);
});

// ============================================
// Summary
// ============================================
console.log("\n" + "=".repeat(50));
console.log("Workspace State Test Summary");
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
