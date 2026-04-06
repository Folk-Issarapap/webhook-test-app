# webhook-test-app

HTTP webhook test app — runs on **[Vinext](https://github.com/cloudflare/vinext)** (Vite + Next.js App Router), targets **Cloudflare Workers**, and uses **D1** for the database schema.

---

## Key libraries and tooling

| Name | Role in this repo |
|------|-------------------|
| **[Vinext](https://github.com/cloudflare/vinext)** | Primary toolchain: `pnpm dev` / `build` / `start` / `deploy:workers` — Next App Router on Vite, deploy to Workers |
| **Next.js 16** (App Router) | Routing / RSC model that Vinext implements (fallback scripts: `dev:next` / `build:next`) |
| **React 19** | UI runtime |
| **[Vite](https://vitejs.dev/) 8** | Bundler under Vinext; `vite.config.ts` with `@cloudflare/vite-plugin` for Workers builds |
| **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** | D1 migrations, `wrangler types`, deploy step invoked by Vinext |
| **[Tailwind CSS](https://tailwindcss.com/) 4** | Styling (`@tailwindcss/postcss`, `app/globals.css`) |
| **[shadcn/ui](https://ui.shadcn.com/)** (`shadcn` + **Radix** / **Base UI**) | UI primitives in `components/ui/*` (see `.cursor/rules/shadcn-ui-components.mdc`) |
| **lucide-react** | Icons |
| **class-variance-authority**, **clsx**, **tailwind-merge** | Component variants / `className` (shadcn-style) |
| **next-themes**, **sonner**, **vaul**, **cmdk**, etc. | Theme, toasts, drawer, command palette from installed shadcn blocks |

This repo includes a **pnpm patch** for `vinext` (`patches/vinext@0.0.39.patch`) and **`scripts/fix-vinext-dist-imports.cjs`** after build — see [docs/PROJECT-HISTORY.md](./docs/PROJECT-HISTORY.md).

---

## Before you start

| Topic | Notes |
|-------|--------|
| **Package manager** | Use **pnpm** (`pnpm install`) |
| **Secrets** | Copy [`.env.example`](./.env.example) to `.env` — **do not commit `.env`** |
| **Longer docs** | [PRD (product scope)](./docs/PRD.md) · [Team guide: Cloudflare / D1 / deploy](./docs/TEAM-CLOUDFLARE-D1.md) · [Project history](./docs/PROJECT-HISTORY.md) · [Architecture reference](./docs/ARCHITECTURE.md) |
| **AI / Cursor** | Read [`AGENTS.md`](./AGENTS.md) and `.cursor/rules/` |

---

## Local setup

```bash
pnpm install
cp .env.example .env
# Edit .env for your account / tokens (see comments in .env.example)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Core scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development (Vinext) |
| `pnpm build` | Production build |
| `pnpm start` | Run production build locally (after `pnpm build`) |
| `pnpm lint` | ESLint |

---

## D1 migrations

SQL lives in [`migrations/`](./migrations/) with ordered numeric prefixes — **schema changes = new file + PR**.

| Command | When |
|---------|------|
| `pnpm db:migrate:local` | Test migrations on local D1 (does not touch remote) |
| `pnpm db:migrate:remote` | Apply to **remote** D1 on Cloudflare — needs permissions + `wrangler login` or `CLOUDFLARE_API_TOKEN` |

Migration config: [`d1.wrangler.jsonc`](./d1.wrangler.jsonc)

Token scopes, separating deploy vs R2/D1 tokens, and **10000 / 9106** troubleshooting: [docs/TEAM-CLOUDFLARE-D1.md](./docs/TEAM-CLOUDFLARE-D1.md).

---

## Deploy — Cloudflare Workers

| Command | Description |
|---------|-------------|
| `pnpm deploy:workers` | Build + deploy to production |
| `pnpm deploy:workers:preview` | Preview deploy |

> **Do not use `pnpm deploy`** — that is a pnpm built-in (workspace deploy), not this project’s script.

Worker + D1 binding: [`wrangler.jsonc`](./wrangler.jsonc).

---

## Other useful scripts

| Command | Description |
|---------|-------------|
| `pnpm cf-types` | Generate / refresh `worker-configuration.d.ts` from `wrangler.jsonc` (after binding changes) |
| `pnpm test:r2` | Smoke-test R2 via Cloudflare API (reads `.env`) |

---

## `wrangler login` and HTTP 431

If the OAuth callback returns **HTTP 431**, run:

```bash
NODE_OPTIONS='--max-http-header-size=65536' pnpm exec wrangler login
```

(Optional — only if you hit 431; normally `pnpm exec wrangler login` is enough.)

Also **comment out `CLOUDFLARE_API_TOKEN` in `.env` temporarily** during login (`unset` in the shell is not enough because tools load from the file).

---

## Repository layout (short)

- `app/` — Pages and routes (including `(authenticate)/webhooks`)
- `actions/`, `lib/`, `components/`, `schemas/` — Patterns aligned with [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- `worker/index.ts` — Cloudflare Worker entry (Vinext)

---

## License

Private — rights reserved by the repository owner.
