# คู่มือทีม: D1, Build และ Deploy

เอกสารนี้สรุปขั้นตอนให้สมาชิกในทีมสามารถร่วมพัฒนา schema บน Cloudflare D1, build โปรเจกต์ และ deploy ได้อย่างสม่ำเสมอ โดยอิง config ปัจจุบันที่ [`d1.wrangler.jsonc`](../d1.wrangler.jsonc) และโฟลเดอร์ [`migrations/`](../migrations/)

---

## 1. สร้าง / เปลี่ยนแปลงตารางบน D1 (แนวทางที่แนะนำ)

อย่าให้ schema production หลุดไปพึ่งการกดสร้างใน Dashboard อย่างเดียว — ใช้ **migration ใน repo** เป็นข้อกำหนดหลัก

1. **เพิ่มไฟล์ SQL ใหม่** ใน `migrations/` โดยใช้เลข prefix ต่อจากไฟล์ล่าสุด เช่น `0002_ชื่อสิ่งที่ทำ.sql`
2. ใส่คำสั่ง SQL ที่ต้องการ เช่น `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`
3. เปิด **Pull Request** ให้ทีม review ก่อน merge
4. หลัง merge:
   - ทดสอบบนเครื่อง: `pnpm db:migrate:local` (ไม่แตะ remote)
   - ขึ้น database จริงบน Cloudflare: `pnpm db:migrate:remote` (ต้องมีสิทธิ์และ authentication — ดูข้อ 2 กับ 3)

คำสั่งที่มีในโปรเจกต์:

| คำสั่ง | ความหมาย |
|--------|----------|
| `pnpm db:migrate:local` | apply migrations ไปที่ D1 แบบ local (Wrangler) |
| `pnpm db:migrate:remote` | apply migrations ไปที่ D1 remote ตามที่ระบุใน `d1.wrangler.jsonc` |
| `pnpm cf-types` | สร้าง `worker-configuration.d.ts` จาก binding ใน config (รันหลังเปลี่ยน wrangler config ที่เกี่ยวกับ Workers/D1) |

---

## 2. สิทธิ์สมาชิกบน Cloudflare

- ไปที่ **Cloudflare Dashboard → Manage account → Members** แล้วเชิญอีเมลของทีม
- แบ่งบทบาทตามหน้าที่:
  - **ผู้ที่ต้องรัน `db:migrate:remote` หรือ deploy ขึ้น production** ควรมีสิทธิ์แก้ **D1** และ **Workers** ได้ (เช่น Administrator หรือ custom role ที่ครอบคลุม D1 + Workers)
  - **ผู้ที่พัฒนาเฉพาะในเครื่อง** สามารถใช้ `pnpm db:migrate:local` ได้โดยไม่จำเป็นต้องมีสิทธิ์แก้ production หากองค์กรไม่ให้สิทธิ์นั้น

---

## 3. ยืนยันตัวตน Wrangler (เครื่อง dev และ CI)

### บนเครื่องนักพัฒนา

รันครั้งแรก (หรือเมื่อ token หมดอายุ):

```bash
pnpm exec wrangler login
```

จากนั้น `pnpm db:migrate:remote` จะใช้ account ที่ login ไว้ **ตราบใดที่ account นั้นมีสิทธิ์กับ D1 ชุดเดียวกับที่กำหนดใน `d1.wrangler.jsonc`**

### บน CI (GitHub Actions ฯลฯ)

1. สร้าง **API Token** ที่ [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. ใช้ template **Edit Cloudflare Workers** เป็นแนวทางเริ่มต้น (มักครอบคลุมการ deploy และทรัพยากรที่เกี่ยวข้อง รวม D1 ในหลายกรณี)
3. เก็บ token เป็น secret ของ repository แล้วตั้งตัวแปรสภาพแวดล้อม เช่น `CLOUDFLARE_API_TOKEN`
4. หาก pipeline ต้องการ ให้ตั้ง `CLOUDFLARE_ACCOUNT_ID` ให้ตรงกับ account ใน Cloudflare

---

## 4. Build (ไม่บังคับต้องมี Cloudflare token)

ติดตั้ง dependency แล้ว build:

```bash
pnpm install
pnpm build
```

โดยทั่วไป **ไม่ต้อง** มี Cloudflare API token สำหรับขั้นตอน build ล้วน ๆ

---

## 5. Deploy — เลือกแพลตฟอร์มให้ชัด

### ก) Cloudflare Workers (Vinext)

โปรเจกต์มีไฟล์สำหรับ deploy แบบ Workers แล้ว:

| ไฟล์ | หน้าที่ |
|------|---------|
| [`wrangler.jsonc`](../wrangler.jsonc) | Worker name, `account_id`, assets, **D1 binding `DB`**, ฯลฯ |
| [`vite.config.ts`](../vite.config.ts) | `vinext` + `@cloudflare/vite-plugin` (ใช้ตอน `pnpm build` / deploy) |
| [`worker/index.ts`](../worker/index.ts) | entry Worker (image optimization + ส่งต่อให้ Vinext) |

คำสั่ง:

```bash
pnpm deploy:workers              # build + wrangler deploy production
pnpm deploy:workers:preview      # deploy ไป preview environment
```

สคริปต์ใช้ **`pnpm run build` แล้ว `pnpm exec wrangler deploy`** (ไม่เรียก `vinext deploy` โดยตรง) เพราะบน **Windows** คำสั่ง `vinext deploy` อาจล้มด้วย `spawnSync ... wrangler ENOENT` — Wrangler ใน `node_modules/.bin` เป็น shim ที่ `execFileSync` รันไม่ได้; การใช้ `pnpm exec wrangler` แก้ปัญหานี้

ถ้าเปิด Workers URL แล้วได้ **HTTP 404** และ body เป็น **`error code: 1042`** — มักเกิดเมื่อ Worker / เฟรมเวิร์ก (เช่น Vinext RSC) ทำ **`fetch` ไปที่ hostname ของ Worker ตัวเอง** ซึ่ง Cloudflare บล็อกตามค่าเริ่มต้น ให้ตรวจว่า [`wrangler.jsonc`](../wrangler.jsonc) มี **`global_fetch_strictly_public`** ใน `compatibility_flags` แล้ว **deploy ใหม่** (ดู [Compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags))

> **หมายเหตุ:** อย่าใช้ `pnpm deploy` อย่างเดียว — นี่เป็นคำสั่ง built-in ของ pnpm สำหรับ workspace (`ERR_PNPM_CANNOT_DEPLOY`) ไม่ได้รันสคริปต์ใน `package.json` ให้ใช้ชื่อด้านบน หรือ `pnpm run deploy:workers`

**Authentication**

- **แนะนำ:** สร้าง API Token แบบ template **Edit Cloudflare Workers** ที่ [API Tokens](https://dash.cloudflare.com/profile/api-tokens) แล้วตั้งเป็น `CLOUDFLARE_API_TOKEN` ใน `.env` (ต้องมี **Account → Workers Scripts → Edit** อย่างน้อย; token ที่มีแค่ R2/D1 มัก deploy ไม่ได้)
- หรือใช้ OAuth: `pnpm exec wrangler login` — **ห้ามพึงแค่ `unset` ในเชลล์** เพราะ Vinext/Wrangler โหลด **`CLOUDFLARE_API_TOKEN` จากไฟล์ `.env`** อีกครั้ง (log จะขึ้น *Using secrets defined in .env*)

ถ้าได้ error **10000 / Authentication error** จาก Workers API ให้ตรวจว่า token มีสิทธิ์แก้ **Workers Scripts** สำหรับ account นั้น

### Deploy ล้มด้วย `10000` + `9106` (`/memberships`)

Log แบบนี้มักเกิดเมื่อ **`CLOUDFLARE_API_TOKEN` เป็น Account API token ที่ scope แคบ** (เช่น สร้างมาเพื่อ R2/D1 อย่างเดียว) — Wrangler ยังเรียก API ระดับ user เช่น **`GET /memberships`** ซึ่ง token ชุดนั้นใช้ไม่ได้ จึงได้ **9106** และตามด้วย **10000** ตอน deploy Worker

**แก้แบบเร็ว (บนเครื่อง dev — ใช้ `wrangler login`):**

1. **คอมเมนต์หรือลบบรรทัด `CLOUDFLARE_API_TOKEN` ในไฟล์ `.env`** (แค่ `unset` ในเชลล์ไม่พอ เพราะเครื่องมืออ่านจากไฟล์)
2. รัน `pnpm exec wrangler login` ให้สำเร็จ (ถ้ายังขึ้นว่า “logged in with an API Token” แปลว่า `.env` ยังส่ง token อยู่)
3. คืนค่า `CLOUDFLARE_API_TOKEN` ใน `.env` ได้หลัง login ถ้าต้องการใช้กับสคริปต์อื่น — แต่ deploy ด้วย OAuth อาจไม่ต้องใส่ token

**แก้แบบใช้ token (CI / อัตโนมัติ):**

1. Custom token ต้องมี **Account → Workers Scripts → Edit** และถ้ายังเจอ **9106** ให้เพิ่มสิทธิ์ฝั่ง **User** เช่น **Memberships → Read** (ถ้ามีใน token builder) — หรือใช้ preset **Edit Cloudflare Workers** ซึ่งรวมสิทธิ์ที่ Wrangler ต้องใช้บ่อยแล้ว
2. ตรวจว่า **Account Resources** ของ token รวม account ที่ `account_id` ใน `wrangler.jsonc` ชี้อยู่
3. ใส่ token ใหม่ใน `.env` แล้วรัน `pnpm deploy:workers` อีกครั้ง

**แยก token แนะนำ:** ใช้ token หนึ่งตัวสำหรับ **deploy Workers** และอีกตัวสำหรับ **R2/D1 อย่างเดียว** ถ้าต้องการจำกัดสิทธิ์ — อย่าใช้ R2-only token แทน Workers deploy

**D1:** `d1_databases` ถูกผนวกใน `wrangler.jsonc` แล้ว (เดียวกับที่ใช้ใน `d1.wrangler.jsonc` สำหรับ migration) — หลัง deploy แล้ว `env.DB` ใน Worker ใช้ได้เมื่อโค้ด import `env` จาก `cloudflare:workers`

**หมายเหตุ:** โฟลเดอร์ `.wrangler/` เป็น state ของ Wrangler ในเครื่อง — อยู่ใน `.gitignore` แล้ว

### ข) Node.js (`pnpm start`)

- ใช้ `pnpm build` แล้วรัน `pnpm start` ตามที่กำหนดใน `package.json`
- **D1 ไม่ได้ถูก bind เข้า process Node แบบเดียวกับ Workers** — ถ้าแอปต้องอ่าน D1 จาก Node ต้องออกแบบช่องทางอื่น (เช่น Worker กลางหรือ API)

---

## 6. สรุปด่วน

| งาน | สิ่งที่ต้องมี |
|-----|----------------|
| เขียน migration + PR | สิทธิ์ push/PR บน repo |
| `pnpm db:migrate:local` | `pnpm`, Wrangler (ไม่บังคับ token ถ้าแค่ local) |
| `pnpm db:migrate:remote` | `wrangler login` หรือ `CLOUDFLARE_API_TOKEN` + สิทธิ์ D1 บน account ที่ตรงกับ config |
| `pnpm build` | โดยทั่วไปไม่ต้อง token |
| `pnpm deploy:workers` | Token (template **Edit Cloudflare Workers**) หรือ `wrangler login`; D1 อยู่ใน [`wrangler.jsonc`](../wrangler.jsonc) แล้ว |

---

## 7. แก้ error `7403` ตอน `db:migrate:remote` / D1 API

ข้อความแบบ **The given account is not valid or is not authorized to access this service [code: 7403]** แปลว่า **ตัวตนที่ Wrangler ใช้อยู่** (OAuth หรือ `CLOUDFLARE_API_TOKEN`) **ไม่ตรงกับ** `account_id` ใน [`d1.wrangler.jsonc`](../d1.wrangler.jsonc) หรือ **ไม่มีสิทธิ์** กับ D1 database นั้น

ทำตามลำดับนี้:

1. **ยืนยันว่าเป็นสมาชิก account เดียวกับใน config**  
   เจ้าของ Cloudflare account (เพื่อนในทีม) ต้องเชิญอีเมลของคุณที่ **Dashboard → Manage account → Members** และให้ role ที่ทำงานกับ **D1** ได้ (ดูข้อ 2) แล้วคุณต้อง **ยอมรับคำเชิญ** ในอีเมล

2. **เช็คว่า Wrangler ชี้ account ไหน**  
   ```bash
   pnpm exec wrangler whoami
   ```  
   ต้องเห็น account ที่ **ตรงกับ** `account_id` ใน `d1.wrangler.jsonc` (หรืออย่างน้อยคุณต้องมีสิทธิ์บน account นั้น)

3. **อย่าให้ token ผิดตัวบัง OAuth**  
   ถ้ามี `CLOUDFLARE_API_TOKEN` ใน `.env` แต่ token นั้นเป็นของบัญชีอื่นหรือ scope ไม่ครอบคลุม account นี้ — **คอมเมนต์บรรทัดนั้นชั่วคราว** (แค่ `unset` ในเทอร์มินัลไม่พอ เพราะ Wrangler อ่านจากไฟล์) แล้วรัน `pnpm exec wrangler login` ให้ login เข้า **บัญชีที่เป็นสมาชิกของทีม** จากนั้นลอง `pnpm db:migrate:remote` อีกครั้ง

4. **ถ้าใช้ API Token แทน login**  
   สร้าง token ที่ [API Tokens](https://dash.cloudflare.com/profile/api-tokens) โดย **Account Resources** ต้องรวม account ที่มี `account_id` ตรงกับใน config และมีสิทธิ์ที่เกี่ยวกับ **D1** (preset **Edit Cloudflare Workers** มักใช้ได้ แต่ต้องเลือก account ให้ถูก)

5. **ถ้ายังไม่ได้รับสิทธิ์ทีม** — ใช้ได้แค่ **local**  
   รัน `pnpm db:migrate:local` เพื่อพัฒนาในเครื่องได้โดยไม่แตะ remote จนกว่าทีมจะเพิ่มสมาชิกหรือแชร์ token/flow ที่ถูกต้อง

6. **ทางเลือก: สร้าง D1 บน account ของคุณเอง (โปรเจกต์ส่วนตัว)**  
   สร้าง D1 ใหม่ใน Dashboard ของ **บัญชีคุณ** แล้วอัปเดต `account_id` และ `database_id` ใน `d1.wrangler.jsonc` และ [`wrangler.jsonc`](../wrangler.jsonc) ให้ตรงกับ database ชุดใหม่ จากนั้นรัน `pnpm cf-types` — **ไม่ควร commit ค่าส่วนตัวลง repo หลัก** ถ้าทีมใช้ database ร่วมกัน; ใช้เฉพาะ `.dev` / branch ส่วนตัวหรือคุยกับทีมก่อน

---

## 8. อ้างอิงใน repo

- [`wrangler.jsonc`](../wrangler.jsonc) — config หลักสำหรับ **deploy Worker** (รวม D1)
- [`d1.wrangler.jsonc`](../d1.wrangler.jsonc) — config เฉพาะคำสั่ง `db:migrate:*` เมื่อต้องการแยกจาก deploy (database เดียวกัน)
- [`migrations/`](../migrations/) — ไฟล์ migration เรียงลำดับด้วย prefix ตัวเลข
- [`package.json`](../package.json) — สคริปต์ `db:migrate:*`, `cf-types`, `deploy*`
