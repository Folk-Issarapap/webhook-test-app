# Product Requirements Document (PRD)

**Product:** webhook-test-app (self-hosted webhook catcher)  
**Stack:** Vinext, Cloudflare Workers, D1 (see [README](../README.md))  
**Status:** Draft — for team alignment  
**Reference inspiration:** [webhook.cool](https://webhook.cool) — “simple but powerful” debugging flow (not a feature-for-feature clone).

---

## 1. Summary

Build a **self-hosted webhook request bin** where users can **create and manage their own catcher endpoints**, send traffic from real providers (Stripe, GitHub, etc.) or `curl`, and **inspect, persist, and optionally forward** requests—with less friction than tailing logs or building one-off servers.

**Differentiator vs. only using webhook.cool:** data stays on **your** Cloudflare account (D1 + Workers), customizable retention/auth, and room for org-specific workflows (e.g. Bropay-style patterns from [ARCHITECTURE.md](./ARCHITECTURE.md)).

---

## 2. Goals

| Goal | Description |
|------|-------------|
| **Fast debugging** | See method, path, headers, and body for each delivery without redeploying app code. |
| **User-owned endpoints** | Users can **add** one or more webhook URLs (unique paths or tokens) tied to their workspace or session. |
| **Low ceremony** | Prefer “open app → get URL → paste in provider” over multi-step wizards for the MVP. |
| **Trust & privacy** | Clear retention/expiry; optional auth for the dashboard; secrets (signing keys) never stored in plaintext in UI logs if avoidable. |

---

## 3. Non-goals (MVP)

- Full multi-tenant billing, SSO, or RBAC parity with a large admin product (can follow [ARCHITECTURE.md](./ARCHITECTURE.md) later).
- Guaranteed byte-for-byte replay of every edge case (streaming bodies, huge uploads) without limits.
- Replacing a production observability stack (Datadog, etc.).

---

## 4. Personas

- **Backend / integration engineer** — configures webhooks in third-party dashboards and needs to see payloads quickly.
- **Full-stack dev on the team** — uses the same tool for local/staging verification before production Worker routes exist.
- **Tech lead** — wants self-hosted data residency and simple audit (who created which endpoint).

---

## 5. Reference patterns (from webhook.cool)

Map inspiration into **our** product language:

| Inspiration | Intent for webhook-test-app |
|-------------|----------------------------|
| **Instant unique URL** | Creating an endpoint should yield a **copy-ready public URL** immediately (minimal clicks after optional “Create endpoint”). |
| **WebSocket real-time** | New requests appear in the UI **without full page refresh** (WebSocket preferred; **SSE** acceptable on Workers if simpler). |
| **Request persistence** | Store metadata + body in **D1**; reopening the same endpoint shows recent history (within TTL). |
| **Payload inspection** | Separate **headers** vs **body**; **pretty-print JSON**; raw view toggle. |
| **Forwarding / replay** | User can **forward** a captured request to another URL (e.g. localhost tunnel) or **replay** with confirmation. |
| **Auto-expiry** | Per-endpoint or global **TTL**; automatic purge or soft-archive for privacy. |

---

## 6. Core user flows

### 6.1 Add your own webhook (primary ask)

1. User signs in **or** uses a **session/workspace** model (MVP may use opaque session cookie if auth deferred).
2. User clicks **“New endpoint”** (or lands on dashboard with first endpoint auto-created — product choice).
3. System creates row in `webhook_endpoints` (existing migration baseline), returns **unique public URL**, e.g.  
   `https://<worker-host>/api/hook/<endpointId>`  
   or path style `.../hook/<secret-token>` (token must be unguessable).
4. User **copies URL** into GitHub / Stripe / `curl`.
5. Incoming HTTP requests hit **Worker route** → validate endpoint → insert `webhook_requests` → **push event** to subscribers (WebSocket/SSE) → show in UI.

### 6.2 Inspect a request

1. User opens endpoint detail; left rail = request list (newest first); right = selected request detail.
2. Tabs or sections: **Overview** (method, path, status, time), **Headers** (table + copy), **Body** (raw / formatted JSON).

### 6.3 Forward / replay

1. User selects a stored request → **Forward** → enters target URL (validate URL, optional allowlist in v2).
2. Server-side or client-initiated forward (PRD recommends **server-side** from Worker to avoid CORS and hide user network).
3. **Replay** = same as forward with default target = original URL optional, or “duplicate request builder” — define in implementation spec.

### 6.4 Retention

1. Default TTL (e.g. 24h / 7d) configurable per endpoint or env.
2. Scheduled Worker (**Cron Triggers**) or delete-on-read policy — pick one for MVP and document.

---

## 7. Functional requirements

### 7.1 Endpoints (CRUD)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-1 | Create endpoint; receive **unique public URL** + optional human-readable label | P0 |
| F-2 | List user’s endpoints | P0 |
| F-3 | Archive/delete endpoint (stops accepting new requests or returns 410) | P1 |
| F-4 | Show endpoint **created** time and **last request** time | P1 |

### 7.2 Ingest (HTTP)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-5 | Accept **GET, POST, PUT, PATCH, DELETE** (at minimum POST; others as feasible) | P0 |
| F-6 | Capture **headers** (allowlist/denylist for hop-by-hop headers), **raw body** (size cap, e.g. 1MB MVP) | P0 |
| F-7 | Respond **200** quickly with small JSON `{"ok":true}` or 204 — document contract | P0 |
| F-8 | Invalid / unknown endpoint → **404** without leaking existence (optional: same 404 for expired) | P1 |

### 7.3 Real-time UI

| ID | Requirement | Priority |
|----|-------------|----------|
| F-9 | Dashboard updates when new request stored (**WebSocket** or **SSE**) | P0 |
| F-10 | Graceful fallback: poll every N seconds if socket unavailable | P2 |

### 7.4 Inspection UI

| ID | Requirement | Priority |
|----|-------------|----------|
| F-11 | Request list with method badge, path snippet, relative time | P0 |
| F-12 | JSON body **formatting** + **copy** buttons (body, headers, as cURL) | P0 |
| F-13 | **Copy as cURL** generation server-side or client-side from stored fields | P1 |

### 7.5 Forward / replay

| ID | Requirement | Priority |
|----|-------------|----------|
| F-14 | Forward stored request to user-supplied URL (HTTPS only for MVP) | P1 |
| F-15 | Timeout + size limits; surface success/failure in UI | P1 |
| F-16 | Rate limit forwards per user/endpoint | P2 |

### 7.6 Privacy & cleanup

| ID | Requirement | Priority |
|----|-------------|----------|
| F-17 | **Auto-delete** requests older than TTL | P0 |
| F-18 | Optional “**delete all** for this endpoint” | P1 |

### 7.7 Auth (recommended sequencing)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-19 | MVP **optional**: shareable secret link only (long unguessable path) — weak for teams | P0/P1 tradeoff |
| F-20 | **Phase 2:** login; endpoints scoped to user/org | P1 |

*Recommendation:* ship **unguessable URL** + **no index** as MVP if auth slips; add login before any “team visible” claim.

---

## 8. Non-functional requirements

| ID | Area | Requirement |
|----|------|-------------|
| N-1 | Performance | Ingest path &lt; ~300ms p95 excluding provider latency; D1 write async acceptable if UI uses WS after commit. |
| N-2 | Limits | Max body size, max headers length, max requests per endpoint per day (configurable). |
| N-3 | Security | No execution of user body as code; sanitize logs in UI (XSS). |
| N-4 | Reliability | D1 as source of truth; WS is best-effort notification. |

---

## 9. Data model (align with existing schema)

Existing tables ([`migrations/0001_init.sql`](../migrations/0001_init.sql)):

- `webhook_endpoints`: extend with `label`, `expires_at`, `owner_id` (nullable until auth), `secret_path` or use `id` as opaque token.
- `webhook_requests`: consider `query_string`, `response_echo` optional; index already on `(endpoint_id, created_at DESC)`.

Document migrations in PR for every schema change ([TEAM-CLOUDFLARE-D1.md](./TEAM-CLOUDFLARE-D1.md)).

---

## 10. Technical notes (Cloudflare)

- **Worker route** for `/api/hook/*` or `/hook/*` must be registered in Vinext/Worker config alongside existing app routes.
- **D1 binding** `DB` already in `wrangler.jsonc`; use `env.DB` from `cloudflare:workers` in route handlers.
- **WebSocket:** supported on Workers; design **one Durable Object** or **partykit-style** fan-out if multiple tabs — MVP can use **SSE** from a route if WS complexity is high.
- **R2 (optional):** store large bodies in R2, pointer in D1 — **Phase 2** if body cap is hit often.

---

## 11. MVP vs later phases

### MVP (ship first)

- Create/list endpoints + copy URL  
- Ingest + D1 persist + basic UI list/detail  
- Headers/body inspection + JSON pretty  
- TTL cleanup (simplest policy)  
- Unguessable URL security baseline  

### Phase 2

- Real-time (WS) + Copy as cURL  
- Forward/replay with limits  
- Auth + multi-user  

### Phase 3

- R2 for large payloads, org RBAC, audit log, custom domains per endpoint  

---

## 12. Success metrics (lightweight)

- Time from “new developer joins” to “first captured request” &lt; 10 minutes (docs + UX).  
- % of sessions that create ≥1 endpoint and receive ≥1 request (activation).  
- Support tickets: “can’t see webhook” reduced vs ad-hoc logging.

---

## 13. Open questions

1. **Identity model:** anonymous + magic link vs mandatory login for v1?  
2. **Endpoint URL shape:** subdomain vs path vs custom domain later?  
3. **Forward SSRF policy:** allow localhost URLs in dev only?  
4. **Compliance:** any PII rules that force shorter TTL or regional D1?

---

## 14. Related documents

- [README](../README.md) — setup & scripts  
- [TEAM-CLOUDFLARE-D1.md](./TEAM-CLOUDFLARE-D1.md) — migrations & deploy  
- [PROJECT-HISTORY.md](./PROJECT-HISTORY.md) — what exists today  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — patterns from admin app (actions, services, etc.)
