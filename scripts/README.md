# Test Scripts Documentation

> เอกสารนี้อธิบาย test scripts ทั้งหมดในระบบ webhook-test-app - ครอบคลุม core logic โดยไม่ต้อง test UI

---

## Quick Start

```bash
# รันทุก test
pnpm test:all

# รันแต่ละชุด
pnpm test:core         # Core modules (68 tests)
pnpm test:repo         # Repository/D1 (20 tests)
pnpm test:state        # Workspace state (24 tests)
pnpm test:integration  # Integration (18 tests)
```

---

## Test Coverage Summary

| Script | File | Tests | Focus Area |
|--------|------|-------|------------|
| Core | `test-core.mjs` | 68 | Constants, utilities, validation |
| Repository | `test-repository.mjs` | 20 | Database operations (D1) |
| Workspace State | `test-workspace-state.mjs` | 24 | localStorage state management |
| Integration | `test-integration.mjs` | 18 | Cross-module workflows |
| **Total** | | **130** | |

---

## 1. Core Tests (`test-core.mjs`)

### Module: Constants (5 tests)
- ✅ WEBHOOK_PUBLIC_PATH_PREFIX = `/at`
- ✅ MAX_INBOUND_BODY_BYTES = 1MB
- ✅ WEBHOOK_REQUEST_LIST_LIMIT = 100
- ✅ WORKSPACE_COOKIE_NAME = `wt_workspace_id`
- ✅ MAX_ENDPOINTS_PER_WORKSPACE = 3

### Module: Token Generation (5 tests)
- ✅ randomSlug format: `adjective-noun-NN`
- ✅ randomSecretToken: 32-char hex
- ✅ generateWorkspaceTokens returns both parts
- ✅ Throws on empty generation
- ✅ Uniqueness across 50 calls

### Module: Workspace Storage (7 tests)
- ✅ isValidSegment (empty, undefined, null, slashes)
- ✅ isValidWorkspacePair (both segments valid)
- ✅ parseWorkspacePath (extract slug/token)
- ✅ Edge cases (no slash, empty, undefined strings)

### Module: URL Building (5 tests)
- ✅ buildWorkspaceAppPath format
- ✅ URL encoding special characters
- ✅ buildIngestUrl with different origins
- ✅ Trailing slash handling

### Module: Header Processing (5 tests)
- ✅ Extract headers from request
- ✅ Filter denylisted headers (connection, cf-ray, etc.)
- ✅ Case-insensitive denylist matching
- ✅ DENYLIST coverage

### Module: Send Test Templates (6 tests)
- ✅ Unique template IDs
- ✅ getHeaderTemplateById / getBodyTemplateById
- ✅ Valid JSON in all templates
- ✅ JSON, Stripe, GitHub, Form, Minimal headers
- ✅ Hello, Stripe event, GitHub ping, Slack, Empty bodies

### Module: Mock Data (9 tests)
- ✅ buildMockRequestsForEndpoint returns 3 requests
- ✅ Correct endpoint_id in all requests
- ✅ Unique request IDs
- ✅ Path includes slug/token
- ✅ Valid HTTP methods
- ✅ Valid JSON headers
- ✅ Timestamps in the past
- ✅ GET request has null body

### Module: Test Webhook API (13 tests)
- ✅ Valid request acceptance
- ✅ Reject missing URL
- ✅ Reject invalid URL
- ✅ Reject non-HTTP protocols (ftp, file, etc.)
- ✅ Reject unsupported methods (TRACE)
- ✅ Accept all supported methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- ✅ Reject invalid headers (arrays, non-string values)
- ✅ Reject non-string body
- ✅ Reject oversized body (>256KB)
- ✅ Accept empty/null body
- ✅ Default method to POST

### Module: Database Schema Types (6 tests)
- ✅ EndpointRow required fields
- ✅ ID type (string)
- ✅ created_at type (unix timestamp)
- ✅ WebhookRequestRow fields
- ✅ Body can be null
- ✅ Headers as JSON string

### Module: Edge Cases (4 tests)
- ✅ URL encoding special characters
- ✅ URL-safe tokens (no /, ?, #)
- ✅ Monotonic timestamps
- ✅ Empty/null parseWorkspacePath
- ✅ Unicode handling
- ✅ Very long strings
- ✅ Request ID format consistency

---

## 2. Repository Tests (`test-repository.mjs`)

Mock D1 database สำหรับ test CRUD operations

### Module: Endpoint Operations (3 tests)
- ✅ insertEndpoint stores endpoint
- ✅ findEndpointBySlugToken finds existing
- ✅ findEndpointBySlugToken returns null for non-existent

### Module: Workspace Link Operations (6 tests)
- ✅ linkEndpointToWorkspace creates link
- ✅ countWorkspaceLinks correct count
- ✅ countWorkspaceLinks returns 0 for empty
- ✅ workspaceHasEndpoint true for linked
- ✅ workspaceHasEndpoint false for unlinked
- ✅ listEndpointsForWorkspace returns linked
- ✅ listEndpointsForWorkspace empty for no links

### Module: Delete Operations (3 tests)
- ✅ deleteWorkspaceLink removes link
- ✅ deleteEndpointIfOrphaned deletes orphaned
- ✅ deleteEndpointIfOrphaned keeps non-orphaned (linked elsewhere)

### Module: Request Operations (3 tests)
- ✅ insertRequest stores request
- ✅ listRequestsForEndpoint filters by endpoint
- ✅ listRequestsForEndpoint respects limit
- ✅ Sorted by created_at DESC

### Module: Idempotent Operations (2 tests)
- ✅ ensureWorkspaceLink idempotent (INSERT OR IGNORE)
- ✅ Does not affect other links

### Module: Edge Cases (3 tests)
- ✅ Empty database graceful handling
- ✅ Special characters in slugs (Unicode, emoji)

---

## 3. Workspace State Tests (`test-workspace-state.mjs`)

Mock localStorage สำหรับ test browser state

### Module: Initialization (3 tests)
- ✅ loadWorkspaceState empty for new storage
- ✅ ensureWorkspaceInitialized creates endpoint if empty
- ✅ Does not modify existing state

### Module: Migration (3 tests)
- ✅ migrateFromV1 migrates v1 to v2
- ✅ Does not overwrite v2 if exists
- ✅ Handles invalid v1 gracefully

### Module: Add Endpoint (3 tests)
- ✅ addEndpoint adds new endpoint
- ✅ Returns null at max endpoints (3)
- ✅ Creates valid tokens

### Module: Remove Endpoint (4 tests)
- ✅ removeEndpoint deletes endpoint
- ✅ Prevents removing last endpoint
- ✅ Selects different endpoint after removal
- ✅ Returns false for non-existent

### Module: Select Endpoint (2 tests)
- ✅ selectEndpoint changes selection
- ✅ No change for invalid endpoint

### Module: Upsert by Tokens (3 tests)
- ✅ Selects existing matching endpoint
- ✅ Adds new if not exists
- ✅ Uses first endpoint when at max (no new add)

### Module: Validation (2 tests)
- ✅ Filters invalid endpoints (undefined, null slugs)
- ✅ Trims to max endpoints (3)
- ✅ Updates selectedId appropriately

### Module: Edge Cases (4 tests)
- ✅ Handles corrupted storage (invalid JSON)
- ✅ Handles null storage values
- ✅ Handles non-objects in endpoints array
- ✅ Unique ID generation

---

## 4. Integration Tests (`test-integration.mjs`)

Cross-module workflows และ real-world scenarios

### Module: Full Workflow (2 tests)
- ✅ Complete lifecycle: create tokens → build URLs → validate
- ✅ Multiple workspaces have unique tokens

### Module: URL Consistency (2 tests)
- ✅ Ingest URL and app path use same encoding
- ✅ Handle origins with/without trailing slash

### Module: Security & Validation (3 tests)
- ✅ Tokens without URL-unsafe characters
- ✅ Generated URLs parseable
- ✅ Secret token entropy (128 bits, 32 hex chars)

### Module: Data Flow (2 tests)
- ✅ Mock request matches endpoint structure
- ✅ Request ID includes endpoint reference

### Module: Boundary Conditions (3 tests)
- ✅ Maximum endpoints (3) handling
- ✅ Empty/null validation handling
- ✅ Oversized body validation

### Module: Error Scenarios (2 tests)
- ✅ Invalid protocol rejection (ftp, file, javascript, data)
- ✅ Malformed workspace path rejection

### Module: Real-world Scenarios (2 tests)
- ✅ Simulate webhook catcher lifecycle
- ✅ Simulate multiple concurrent workspaces

### Module: Template & Payload (2 tests)
- ✅ Header templates match providers (Stripe, GitHub, JSON, Form)
- ✅ Payload templates valid JSON

---

## Test Structure

```javascript
// Pattern ใช้ในทุก test file
const results = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

// Assertion helpers
assertEqual(actual, expected)
assertTrue(value)
assertFalse(value)
assertExists(value)
assertContains(haystack, needle)
```

---

## When to Run Tests

| Scenario | Command |
|----------|---------|
| ก่อน commit | `pnpm test:all` |
| แก้ไข core logic | `pnpm test:core` |
| แก้ไข database code | `pnpm test:repo` |
| แก้ไข state management | `pnpm test:state` |
| แก้ไขหลาย modules | `pnpm test:integration` |
| CI/CD pipeline | `pnpm test:all` |

---

## Adding New Tests

1. เลือก test file ที่เหมาะสม (core/repo/state/integration)
2. เพิ่ม `test("description", () => { ... })` block
3. ใช้ assertion helpers ที่มีอยู่
4. รัน `pnpm test:all` เพื่อตรวจสอบ

---

## Notes

- ทุก test เป็น **pure function tests** - ไม่ต้องการ UI, browser, หรือ external services
- Repository tests ใช้ **MockD1Database** จำลอง D1
- State tests ใช้ **MockLocalStorage** จำลอง localStorage
- Integration tests ไม่มี mock - test การทำงานร่วมกันจริง
