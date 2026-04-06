<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project architecture

Before modifying this codebase, read **`ARCHITECTURE.md`** at the repository root and keep changes consistent with the structure and patterns documented there (actions, services, routing, auth, forms, validation, RBAC, i18n).

## UI components (shadcn/ui)

Use **shadcn/ui** primitives from **`@/components/ui/*`** for standard UI: buttons, tables, cards, forms (inputs, labels, fields), dialogs, sheets, menus, tabs, alerts, badges, selects, and similar. Do not add other component libraries for those roles. If a shadcn block is missing, add it with the shadcn CLI so it matches `components.json`. Domain components should compose these primitives.
