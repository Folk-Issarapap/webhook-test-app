# สรุปสิ่งที่ทำในโปรเจกต์ webhook-test-app

เอกสารนี้สรุปงานที่ทำสะสมตั้งแต่เริ่มจากโปรเจกต์ Next.js (create-next-app) จนถึงสถานะปัจจุบัน — ใช้เป็นภาพรวมสำหรับทีมหรือตัวคุณเองเมื่อกลับมาดูทีหลัง

---

## 1. พื้นฐานแอปและเครื่องมือรัน

- โปรเจกต์เป็น **App Router** (React 19 / Next 16) แต่ใช้ **Vinext** เป็นหลักสำหรับ dev/build/start (`pnpm dev` / `pnpm build` / `pnpm start`) เพราะต้องการรันบน Vite stack ที่ Vinext รองรับ
- ยังมีสคริปต์สำรองแบบ Next เดิม: `dev:next`, `build:next`, `start:next`
- ตั้ง **`NODE_OPTIONS=--max-http-header-size=65536`** ในสคริปต์ dev/start เพื่อลดปัญหา HTTP 431 จาก header ใหญ่
- **pnpm patch** สำหรับ `vinext@0.0.39` (`patches/vinext@0.0.39.patch`): ให้ production server หา entry เป็น **`index.mjs` / `entry.mjs`** ได้ ไม่ใช่แค่ `.js`
- สคริปต์ **`scripts/fix-vinext-dist-imports.cjs`**: หลัง `vinext build` แก้ dynamic import ใน output ให้ชี้ `.mjs` ให้สอดคล้องกับไฟล์จริง
- devDependency **`@vitejs/plugin-rsc`** สำหรับ App Router / RSC

---

## 2. UI และหน้าเว็บ

- เพิ่มชุด **shadcn/ui** ภายใต้ `components/ui/*` และมีกฎ Cursor ให้ใช้ primitive เหล่านี้เป็นหลัก (`.cursor/rules/shadcn-ui-components.mdc`)
- **`app/layout.tsx`**: metadata ชื่อแอปแบบ webhook test; โหลดฟอนต์ **Geist / Geist Mono** ผ่าน Google Fonts (`<link>`) แทน `next/font` เพื่อหลีกเลี่ยงปัญหา static/font บนบางสภาพแวดล้อม
- **`app/globals.css`**: กำหนด stack ฟอนต์ `--font-sans` / `--font-mono` ให้สอดคล้องกับ layout
- **`app/page.tsx`**: ปรับเป็นหน้าแรกสำหรับ **webhook test** — อธิบายจุดประสงค์, พื้นฐานที่เว็บควรมี (endpoint, เก็บ payload, ประวัติ), ลิงก์ไป `/webhooks`, checklist งานที่ยังต้องต่อ
- **`app/(authenticate)/webhooks/page.tsx`**: หน้า placeholder สำหรับ workspace webhooks (ยังไม่มีตารางจริงจาก D1)
- เดิมมีการแก้การอ้างอิง SVG (`next.svg` / `vercel.svg`) ผ่าน import แบบ `?url` เพื่อให้ bundle โหลดได้ดีขึ้นบนบางการรัน

---

## 3. โครงสร้างโฟลเดอร์ (แนว ARCHITECTURE)

จัดโฟลเดอร์ให้พร้อมต่อฟีเจอร์ webhook ตามแนวใน **`docs/ARCHITECTURE.md`** (อ้างอิงแอป admin แต่ย่อมาใช้ที่ root):

| พื้นที่ | หมายเหตุ |
|--------|----------|
| `actions/webhooks/`, `actions/auth/` | สำหรับ server actions (ตอนนี้มีแต่ `.gitkeep`) |
| `components/webhooks/`, `layouts/`, `providers/`, `auth/` | องค์ประกอบ UI (ส่วนใหญ่ placeholder) |
| `lib/db/`, `lib/webhooks/`, `lib/auth/` | ชั้น data/domain (placeholder) |
| `lib/services.ts` | stub `ServiceContainer` / `getServices()` |
| `schemas/webhook.ts` | ชนิดข้อมูลแถวให้สอดคล้อง D1 |

มีกฎ Cursor ให้อ่าน architecture ก่อนแก้โค้드 (`.cursor/rules/architecture-before-modifications.mdc`)

---

## 4. Cloudflare D1 และ Workers deploy

- **`wrangler.jsonc`** (ที่ root): config สำหรับ **`pnpm deploy:workers` / Vinext บน Workers** — รวม **`d1_databases`** (binding `DB` เดียวกับ migration), assets, `worker/index.ts`
- **`vite.config.ts`**: `vinext` + `@cloudflare/vite-plugin` — ใช้เมื่อ build แบบ Workers; เพิ่ม devDependency **`vite`** เพื่อให้โหลด config ได้
- **`worker/index.ts`**: entry Worker ที่ Vinext สร้าง/ให้แก้ (image route + ส่งต่อแอป)
- **`d1.wrangler.jsonc`**: config **เฉพาะ** คำสั่ง `pnpm db:migrate:*` (database เดียวกัน; เดิมแยกมาเพื่อไม่ให้บังคับใช้ Cloudflare Vite plugin ตอนยังไม่พร้อม)
- **`migrations/0001_init.sql`**: ตาราง `webhook_endpoints`, `webhook_requests` + index
- สคริปต์: `db:migrate:*` ยังชี้ **`d1.wrangler.jsonc`**; `cf-types` ชี้ **`wrangler.jsonc`** เพื่อให้ type ครอบคลุม Worker env ทั้งหมด
- **`pnpm deploy:workers`** / **`pnpm deploy:workers:preview`**: เรียก `vinext deploy` — ต้องมี token สิทธิ์ **Workers** (ไม่ใช่แค่ R2/D1 อย่างเดียว); ห้ามใช้ `pnpm deploy` เพราะเป็นคำสั่ง built-in ของ pnpm
- **`worker-configuration.d.ts`**: สร้างจาก `pnpm cf-types` (อัปเดตเมื่อเปลี่ยน `wrangler.jsonc`)

**หมายเหตุ:** โค้ดแอปหลักยัง**ไม่ได้**เรียกใช้ D1 ใน runtime (เช่น server actions / route handler); schema และ config พร้อมสำหรับขั้นตอนถัดไป

---

## 5. Cloudflare R2

- ตั้งค่าใน **`.env`** (ไม่ commit): account, API token, ชื่อ bucket, public URL
- สคริปต์ **`scripts/test-r2-connection.mjs`** + คำสั่ง **`pnpm test:r2`**: ทดสอบ list buckets ผ่าน Cloudflare API และตรวจว่า `R2_BUCKET_NAME` มีในบัญชี; ลอง `HEAD` public URL (ราก bucket อาจได้ 404 ถ้าไม่มี object ที่ path ว่าง)

การอ่านเขียน object จากแอปผ่าน S3-compatible API ยัง**ไม่ได้**ผูกในโค้ดแอปในสรุปรอบนี้

---

## 6. Git และความสะอาดของ repo

- เพิ่ม **`.vinext/`**, **`/dist`**, **`.wrangler/`** ใน `.gitignore`
- เอา **cache ฟอนต์ใต้ `.vinext/fonts/`** และ **ไฟล์ build ใต้ `dist/`** ออกจากการ track ใน git (build artifact สร้างใหม่จาก CI/เครื่อง dev)

---

## 7. เอกสารและกฎสำหรับทีม

| ไฟล์ | เนื้อหา |
|------|---------|
| **`docs/TEAM-CLOUDFLARE-D1.md`** | วิธีให้ทีมทำ migration, สิทธิ์ Cloudflare, token, build/deploy |
| **`docs/ARCHITECTURE.md`** | คู่มือ architecture ฉบับอ้างอิง (เดิมอยู่ root; ปัจจุบันอยู่ใต้ `docs/`) |
| **`AGENTS.md`** | กฎสำหรับ agent: Next รุ่นนี้ต่างจากที่คุ้น + อ้าง architecture + shadcn |

---

## 8. สิ่งที่ยังไม่ทำ / ต่อไป (เชิงผลิตภัณฑ์)

- Route **รับ HTTP webhook** (เช่น `app/api/...` หรือ pattern ที่ Vinext/Next รองรับ) → บันทึกลง D1
- **Server actions** สร้าง endpoint / ดึงรายการคำขอ
- หน้า **`/webhooks`** แบบมีข้อมูลจริง (ตาราง, copy URL)
- **Deploy สำเร็จบน production** — ต้องใช้ API token ที่ deploy Workers ได้ (แก้สิทธิ์หรือใช้ `wrangler login`); D1 binding อยู่ใน `wrangler.jsonc` แล้ว — เพิ่ม **R2 binding** ใน wrangler ถ้าต้องใช้ใน Worker
- **Auth** สำหรับ UI บนอินเทอร์เน็ต (ตามที่เคย обсужนไว้ว่าใช้หรือไม่ขึ้นกับการ expose)

---

## 9. คำสั่งสรุปที่ใช้บ่อย

```bash
pnpm dev              # Vinext dev
pnpm build && pnpm start   # production บนเครื่อง
pnpm db:migrate:local | remote
pnpm cf-types
pnpm deploy:workers   # build + Workers deploy (ต้อง token สิทธิ์ Workers)
pnpm test:r2          # ทดสอบการเชื่อม R2 ผ่าน API (อ่านจาก .env)
```

---

*อัปเดตลงในเอกสารนี้เมื่อมี milestone ใหม่ เพื่อให้ประวัติโปรเจกต์ไม่กระจัดกระจาย*
