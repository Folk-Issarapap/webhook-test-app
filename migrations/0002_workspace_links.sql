-- Webhook catcher: global endpoints + workspace↔endpoint links (cookie-scoped workspace).
-- Replaces 0001 tables (no production data assumed yet).

PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS webhook_requests;
DROP TABLE IF EXISTS webhook_workspace_endpoints;
DROP TABLE IF EXISTS webhook_endpoints;
PRAGMA foreign_keys = ON;

CREATE TABLE webhook_endpoints (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL,
	public_slug TEXT NOT NULL,
	secret_token TEXT NOT NULL,
	UNIQUE (public_slug, secret_token)
);

CREATE TABLE webhook_workspace_endpoints (
	workspace_id TEXT NOT NULL,
	endpoint_id TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (workspace_id, endpoint_id),
	FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints (id) ON DELETE CASCADE
);

CREATE INDEX idx_wse_workspace ON webhook_workspace_endpoints (workspace_id);

CREATE TABLE webhook_requests (
	id TEXT PRIMARY KEY,
	endpoint_id TEXT NOT NULL,
	method TEXT NOT NULL,
	path TEXT NOT NULL,
	headers TEXT NOT NULL,
	body TEXT,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints (id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_requests_endpoint_created
	ON webhook_requests (endpoint_id, created_at DESC);
