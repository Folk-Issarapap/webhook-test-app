# UI snapshot (reference)

**Updated:** 2026-04-06 — baseline for future redesigns; not a spec.

## Routes

- **`/`** — Marketing-style hero (steps + soft gradient) + embedded `WebhookWorkspace` with `showHeader={false}` and `routeBasePath="/"`.
- **`/webhook`** — Same workspace with full page header (`showHeader` default).

## Workspace

- **Sidebar:** Endpoint list, add/delete, selection ring on active item.
- **Tabs:** Inspect (ingest URL, incoming requests) · Send test.
- **Request rows:** Collapsible cards; HTTP method as a colored pill; path + relative time.

## Globals

- **Footer:** `SiteFooter` in root layout; copy from `lib/site.ts` (`APP_DISPLAY_NAME`, `APP_FOOTER_TAGLINE`).
- **Method colors:** `getHttpMethodBadgeClass()` in `lib/http-method-styles.ts` (badges + optional accents).

## Stack

shadcn/ui primitives under `@/components/ui`, Tailwind v4 + `globals.css` theme tokens.
