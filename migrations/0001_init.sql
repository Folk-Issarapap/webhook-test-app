-- Webhook catcher: minimal schema (expand as the app grows)
CREATE TABLE IF NOT EXISTS webhook_endpoints (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_requests (
	id TEXT PRIMARY KEY,
	endpoint_id TEXT NOT NULL,
	method TEXT NOT NULL,
	path TEXT NOT NULL,
	headers TEXT NOT NULL,
	body TEXT,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (endpoint_id) REFERENCES webhook_endpoints(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_requests_endpoint_created
	ON webhook_requests (endpoint_id, created_at DESC);
