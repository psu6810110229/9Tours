# 9Tours — 48h Showcase Deployment Plan

> **Executor:** Sonnet 5, high effort. **Author of plan:** Opus (investigation done).
> **Goal:** Put 9Tours live on a **free**, **always-reachable** URL for a **48-hour** student
> showcase. ~300–400 high-school visitors, ≤~100 concurrent. Kids scan a QR in a booth and
> browse/register/book. Owner's laptop will sleep at lunch — hosting **must be cloud**, not local.
> **Deadline:** owner leaves at 07:00 tomorrow; event runs 09:00–16:00. Keep total owner hands-on time low.

---

## 0. Context snapshot (verified facts — do not re-investigate)

**Stack**
- `frontend/` — React 19 + Vite + Tailwind. Static build (`npm run build` → `dist/`).
  - Renders tour images with raw `<img src={image}>` — **no URL transform**. So any string in
    `tours.images` is used as-is by the browser.
  - API base = `import.meta.env.VITE_API_URL` (default `/api`), see `frontend/src/services/apiBaseUrl.ts`.
  - Local prod uses `frontend/nginx.conf` which proxies `/api/` and `/uploads/` → `backend:3000`.
    **Keep nginx.conf for local docker-compose. Render uses a Static Site instead (Sprint 5).**
- `backend/` — NestJS 11 + TypeORM 0.3 + Postgres. `backend/Dockerfile` (node:20).
  - `main.ts`: listens on `process.env.PORT ?? 3000`; `trust proxy` in production; CORS origins from
    `CORS_ORIGINS`; serves `/uploads/` static; global ValidationPipe.
  - **Auth cookies are `httpOnly`, `secure` (in prod), `sameSite:'lax'`** (`backend/src/auth/auth.controller.ts`).
    → **Browser must see ONE origin for app + `/api`** or login breaks. The Static-Site rewrite (Sprint 5)
    preserves same-origin, so **do NOT split to a cross-origin backend domain**.
  - TypeORM config (`backend/src/app.module.ts`) has **no `ssl` option** → add one (Sprint 1).
  - Google OAuth reads `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (`backend/src/auth/google-oauth.config.ts`);
    disabled gracefully if unset. Email/password login always works.
- `db` — Postgres 15. **Local dev DB is RUNNING** in docker: container `9tours-db`,
  creds `init` / `secret` / db `9tours_db` on `localhost:5432`.

**Source of truth for content = the live local DB, NOT `backend/tours-data.json`** (that JSON is stale seed).
The DB has **39 tour rows**:
- `id 1–30` = real, well-written tours (owner authored via admin).
- `id 31–39` = junk / old seed dupes (`"1"`, `"ss"`, `"ทัวร์หนุมาน"`, etc.).

**Image audit of tours (already done):** some tours use owner-uploaded files
(`http://localhost:3000/uploads//<file>` — will break on cloud), some use Unsplash URLs (work anywhere).
Owner's rule: **keep only tours that have his own uploaded images; disable link-only tours.**

**KEEP + ACTIVE (12 tours, have ≥1 uploaded image):** `id 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 16, 17`
**DISABLE (link-only + junk):** everything else (`4, 12, 13, 14, 15, 18–30, 31–39`).
(Kept tours `3,6,8,9,10,11,17` are mixed: they keep some Unsplash images too — those still load on cloud, fine.)

**Booking rounds problem (must fix):** `tour_schedules` for kept tours exist but all dates are
**Apr–May 2026 = in the past** (today = 2026-07-03). So **no bookable rounds** right now.
Columns: `id, tourId, startDate(date), endDate(date), timeSlot, roundName, maxCapacity, currentBooked`.

**Already done by Opus (verify, then commit):**
- Copied the 19 uploaded image files used by the 12 kept tours into
  `frontend/public/tour-images/` (baked into build → survives restarts). See that folder's README.
- Deleted the earlier wrong `TOUR_IMAGES_CHECKLIST.md` (it used invented slugs).

---

## Target architecture (Render free tier + anti-sleep)

```
Render project (all free)
 ├─ 9tours-db        Postgres (free)         → data persists in cloud (laptop sleep irrelevant)
 ├─ 9tours-backend   Web Service (Docker)    → NestJS; sleeps after 15m idle → kept awake by ping
 └─ 9tours-frontend  Static Site (CDN)       → ALWAYS ON. Rewrites /api/* and /uploads/* → backend.
                                               Serves /tour-images/* directly (committed).
UptimeRobot (free) → GET https://<frontend>/api/tours every 5 min
                     → traffic flows through to backend → backend never idles 15m → no cold start mid-event.
```
Why: Static Site never sleeps (CDN); only the backend can sleep, and the ping prevents it.
Same-origin is preserved by the Static-Site proxy rewrite, so `sameSite:'lax'` cookies + Google OAuth work.

---

## Global constraints / non-negotiables
- **Free only.** No paid plans. (Render free Postgres = 1 instance, ~30-day life — fine for 48h.)
- **Minimal code changes.** Only: 1 TypeORM `ssl` line + `render.yaml` + env. Do not refactor auth/CORS.
- **Do not mutate the owner's local DB.** `pg_dump` is read-only; all transforms run on the **cloud** DB.
- **Do not commit secrets.** Real Google/JWT/PromptPay secrets go in Render env, never in git.
- Work on a branch. Do not deploy or push without owner action where noted **[HUMAN]**.

---

## Sprint 1 — Backend cloud-readiness (code)

**Goal:** backend can connect to a managed Postgres and expose a cheap health/ping route.

**Files:** `backend/src/app.module.ts`

1. Add an SSL toggle to the TypeORM factory (managed Postgres may require SSL on external conns):
   ```ts
   useFactory: (configService: ConfigService) => ({
     type: 'postgres',
     host: configService.get<string>('DB_HOST'),
     port: configService.get<number>('DB_PORT'),
     username: configService.get<string>('DB_USERNAME'),
     password: configService.get<string>('DB_PASSWORD'),
     database: configService.get<string>('DB_DATABASE'),
     entities: [__dirname + '/**/*.entity{.ts,.js}'],
     synchronize: configService.get<boolean>('DB_SYNCHRONIZE') ?? false,
     ssl: configService.get<string>('DB_SSL') === 'true'
       ? { rejectUnauthorized: false }
       : false,
   }),
   ```
2. **Health/ping target:** confirm `GET /tours` is public (no auth) — it is the UptimeRobot ping target
   and Render `healthCheckPath`. If `GET /tours` requires auth or is expensive, add a trivial public
   `GET /health` controller returning `{status:'ok'}` and use that instead. Verify in
   `backend/src/tours/tours.controller.ts`.
3. Confirm `backend/src/config/env.validation.ts` does **not** hard-fail when optional vars
   (SMTP, PromptPay, Google) are empty. If it does, relax to optional for showcase.

**Acceptance:** `cd backend && npm run build` passes. With `DB_SSL=false` local behavior unchanged.

---

## Sprint 2 — Images (verify + commit)  *(mostly done)*

**Goal:** owner's real tour photos are in the repo and served by the static site.

1. Verify `frontend/public/tour-images/` contains **19** image files (jpg/jpeg/png) + `README.md`.
2. Confirm Vite copies `public/` to `dist/` (default — no config needed). After `npm run build`,
   check `frontend/dist/tour-images/` exists.
3. Ensure these are **not** gitignored (root/frontend `.gitignore`). `git add frontend/public/tour-images`.

**Acceptance:** `git status` shows the 19 images staged; a local `npm run build` emits them into `dist/`.

---

## Sprint 3 — DB export + cloud transform (data)

**Goal:** move the owner's exact data (tours, prices e.g. เชี่ยวหลาน **1992**, reviews, admin user) to the
cloud DB, then keep 12 tours + rewrite image URLs.

**3a. Dump local DB (read-only, safe):**
```bash
docker exec 9tours-db pg_dump -U init -d 9tours_db --no-owner --no-privileges > showcase_dump.sql
```
Keep `showcase_dump.sql` out of git (add to `.gitignore`; it may contain user rows).

**3b. Restore into the Render Postgres** (after Sprint 6 creates it). Use the **External** connection
string from Render (needs `sslmode=require`). If `psql` isn't installed locally, use docker:
```bash
docker run --rm -i postgres:15-alpine \
  psql "postgres://USER:PASS@HOST/DB?sslmode=require" < showcase_dump.sql
```
Backend must run with `DB_SYNCHRONIZE=false` (schema comes from the dump).

**3c. Transform on the CLOUD DB** (run once, after restore). Save as `showcase_transform.sql`:
```sql
-- 1) Keep only the 12 tours with owner-uploaded images; hide all others (junk included).
UPDATE tours SET "isActive" = ("id" IN (1,2,3,5,6,7,8,9,10,11,16,17));

-- 2) Rewrite local upload URLs -> committed static path (same-origin), preserving image order.
UPDATE tours
SET images = (
  SELECT jsonb_agg(
    CASE WHEN e LIKE '%/uploads/%'
      THEN '/tour-images/' || regexp_replace(e, '^.*/uploads/+', '')
      ELSE e END
    ORDER BY ord)
  FROM jsonb_array_elements_text(images) WITH ORDINALITY AS t(e, ord)
)
WHERE images IS NOT NULL AND jsonb_typeof(images) = 'array';
```
**Acceptance:** `SELECT id, "isActive", images->>0 FROM tours WHERE "isActive";` shows 12 rows, and every
`/uploads/...` cover is now `/tour-images/...`. Kept Unsplash URLs unchanged.

---

## Sprint 4 — Booking rounds → future dates (data)

**Goal:** kept tours have **open, bookable** rounds during the event (currently all past).

1. First **verify how the app decides a round is bookable** — grep backend/frontend for where
   `startDate` is compared to "now"/today and whether past schedules are hidden. Adjust the shift below
   so rounds land safely in the future (deploy ~2026-07-03/04; event 2026-07-04).
2. Shift + reset (append to `showcase_transform.sql`, run on cloud DB):
   ```sql
   -- Move Apr–May 2026 rounds ~100 days forward -> mid-Jul..early-Sep 2026 (future & bookable).
   UPDATE tour_schedules
   SET "startDate" = "startDate" + INTERVAL '100 days',
       "endDate"   = "endDate"   + INTERVAL '100 days'
   WHERE "tourId" IN (1,2,3,5,6,7,8,9,10,11,16,17);

   -- Fresh real-time seat counts for the demo.
   UPDATE tour_schedules SET "currentBooked" = 0
   WHERE "tourId" IN (1,2,3,5,6,7,8,9,10,11,16,17);
   ```
3. Sanity: ensure each kept tour has ≥2 future rounds and `maxCapacity > 0`.
   ```sql
   SELECT "tourId", count(*), min("startDate"), max("startDate")
   FROM tour_schedules WHERE "tourId" IN (1,2,3,5,6,7,8,9,10,11,16,17) GROUP BY 1 ORDER BY 1;
   ```

**Acceptance:** On the deployed site, opening a kept tour shows selectable **future** dates and a working
"book" flow with seat availability.

---

## Sprint 5 — `render.yaml` blueprint (infra-as-code)

**Goal:** one file at repo root describing all three services + rewrites.

Create `render.yaml`:
```yaml
databases:
  - name: 9tours-db
    plan: free

services:
  # ---------- Backend (NestJS, Docker) ----------
  - type: web
    name: 9tours-backend
    runtime: docker
    plan: free
    rootDir: backend
    dockerfilePath: ./Dockerfile
    healthCheckPath: /tours          # change to /health if you added one in Sprint 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "3000"
      - key: DB_HOST
        fromDatabase: { name: 9tours-db, property: host }
      - key: DB_PORT
        fromDatabase: { name: 9tours-db, property: port }
      - key: DB_USERNAME
        fromDatabase: { name: 9tours-db, property: user }
      - key: DB_PASSWORD
        fromDatabase: { name: 9tours-db, property: password }
      - key: DB_DATABASE
        fromDatabase: { name: 9tours-db, property: database }
      - key: DB_SYNCHRONIZE
        value: "false"
      - key: DB_SSL
        value: "false"               # internal Render conn = no SSL; set "true" if connect errors
      - key: JWT_SECRET
        generateValue: true
      - key: ACCESS_TOKEN_TTL
        value: 15m
      - key: FRONTEND_URL
        value: https://9tours-frontend.onrender.com
      - key: CORS_ORIGINS
        value: https://9tours-frontend.onrender.com
      - key: BACKEND_PUBLIC_URL
        value: https://9tours-frontend.onrender.com/api
      - key: UPLOADS_ROOT
        value: /app/uploads
      - key: MAIL_ENABLED
        value: "false"
      - key: ENABLE_TOUR_JSON_IMPORT
        value: "false"
      - key: ENABLE_DEMO_DASHBOARD_SEED
        value: "false"
      # Google OAuth — set as SECRETS in dashboard (sync:false), values from owner's .env
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_CALLBACK_URL
        value: https://9tours-frontend.onrender.com/api/auth/google/callback

  # ---------- Frontend (Vite static site + proxy rewrites) ----------
  - type: web
    name: 9tours-frontend
    runtime: static
    rootDir: frontend
    buildCommand: npm ci --legacy-peer-deps && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: /api
      - key: VITE_TRACKING_ENABLED
        value: "true"
    routes:
      - type: rewrite
        source: /api/*
        destination: https://9tours-backend.onrender.com/*
      - type: rewrite
        source: /uploads/*
        destination: https://9tours-backend.onrender.com/uploads/*
      - type: rewrite
        source: /*
        destination: /index.html
```

**Critical verifications for Sonnet:**
- Render derives the public host from the service **name**; if `9tours-backend`/`9tours-frontend` are
  taken, Render appends a suffix and the hardcoded URLs above are wrong. **After first deploy, read the
  actual URLs and fix** `routes.destination`, `CORS_ORIGINS`, `FRONTEND_URL`, `BACKEND_PUBLIC_URL`,
  `GOOGLE_CALLBACK_URL`, then redeploy.
- Confirm Render Static Sites support **rewrite to an absolute external URL** (proxy). If not, remove the
  two proxy routes from `render.yaml` and add them in the dashboard (Static Site → Redirects/Rewrites) as
  **Rewrite** rules with the same source/destination. Keep the `/*`→`/index.html` SPA fallback last.
- The `/api/*`→`backend/*` rewrite **strips `/api`** (matches the local nginx behavior:
  `/api/tours` → backend `/tours`).

**Acceptance:** `render.yaml` validates in Render's Blueprint preview with 1 db + 2 services.

---

## Sprint 6 — Deploy on Render  **[HUMAN + Sonnet]**

1. **[HUMAN]** Create a free Render account (sign in with GitHub) and push the working branch to GitHub.
2. **[HUMAN]** Render → **New → Blueprint** → pick the repo/branch → apply. Creates db + 2 services.
3. **[HUMAN]** In the backend service, set the two secret env vars `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET` (values from `.env`).
4. Wait for the DB to be live, then run **Sprint 3b** (restore dump) and **Sprint 3c + Sprint 4**
   (transform SQL) against the Render **External** connection string.
5. Restart the backend service so it reads the restored schema. Fix service URLs if suffixed (Sprint 5).

**Acceptance:** backend `healthCheckPath` is green; visiting the frontend URL lists the 12 tours with images.

---

## Sprint 7 — Google OAuth callback  **[HUMAN]**

1. Set `GOOGLE_CALLBACK_URL` (backend env) = `https://<actual-frontend>/api/auth/google/callback`.
2. **[HUMAN]** Google Cloud Console → APIs & Services → Credentials → the OAuth 2.0 Client →
   **Authorized redirect URIs** → add the exact URL above → Save.
3. Test "Sign in with Google" end-to-end. Email/password login should already work regardless.

**Acceptance:** Google login completes and lands back logged-in (no `redirect_uri_mismatch`).

---

## Sprint 8 — Anti-sleep ping  **[HUMAN]**

1. **[HUMAN]** Create a free UptimeRobot account.
2. Add an **HTTP(s)** monitor: URL `https://<actual-frontend>/api/tours`, interval **5 min**.
   (Routes through the static site to the backend → prevents the 15-min idle sleep.)

**Acceptance:** monitor shows "Up"; after 20 min idle, opening the site has no ~50s cold-start delay.

---

## Sprint 9 — Verify + QR  **[HUMAN + Sonnet]**

Run this checklist on a phone (mobile network, not the booth wifi if possible):
- [ ] Home lists 12 tours, all cover images load (no broken icons).
- [ ] Open a tour → gallery images load; **future** booking dates are selectable.
- [ ] Register a new account (email/password) → success.
- [ ] Google login → success.
- [ ] Make a test booking → seat count decrements (real-time).
- [ ] Reviews visible on tour pages.
- [ ] Admin login (owner's account from the dump) → dashboard loads.

Then **[HUMAN]** generate a QR from the frontend URL (any free QR generator) and print for the booth.

---

## Sprint 10 — Teardown (after the event)  **[HUMAN]**
- After 48h, in Render **suspend or delete** the 3 services to stop using free-tier hours.
- Optionally delete `showcase_dump.sql` locally (contains user rows).
- The `feat/*` deploy branch can be kept or deleted; do not merge showcase-only config to `main` unless wanted.

---

## Env var reference (backend, cloud)

| Var | Value (cloud) | Notes |
|---|---|---|
| NODE_ENV | production | enables secure cookies + trust proxy |
| PORT | 3000 | Render maps 443→this; main.ts reads it |
| DB_* | from Render db | via `fromDatabase` |
| DB_SYNCHRONIZE | false | schema comes from the dump |
| DB_SSL | false→true | flip to true only if DB connect errors |
| JWT_SECRET | generated | Render `generateValue` |
| FRONTEND_URL / CORS_ORIGINS | https://<frontend> | exact scheme+host, no trailing slash |
| BACKEND_PUBLIC_URL | https://<frontend>/api | same-origin via rewrite |
| GOOGLE_CLIENT_ID/SECRET | secret (sync:false) | from owner .env |
| GOOGLE_CALLBACK_URL | https://<frontend>/api/auth/google/callback | must match Google console |
| MAIL_ENABLED | false | no SMTP for demo |

---

## Risk register
- **Wrong Render URLs (name suffix)** → most common failure. Verify actual URLs post-deploy and update
  all 5 URL-bearing settings + rewrites.
- **Static-site absolute-URL rewrite unsupported** → fall back to dashboard rewrite rules.
- **DB SSL** → if backend logs `no pg_hba`/SSL errors, set `DB_SSL=true`.
- **Ephemeral disk** → any NEW uploads during the event (admin/payment slips) vanish on restart. Tour
  images are safe (committed to `/tour-images/`). Avoid redeploying during 09:00–16:00.
- **Schedules still past** → confirm the booking-open filter; increase the day-shift if needed.
- **Free Postgres cold/limits** → fine for 48h/≤100 concurrent; don't stress-test.

## Human-only steps (collected)
1. Render account + push branch + apply Blueprint.
2. Set Google secret env vars in Render.
3. Run dump restore + transform SQL against Render DB (Sonnet can provide exact commands live).
4. Add the redirect URI in Google Cloud Console.
5. Create UptimeRobot monitor.
6. Generate + print QR.
7. Teardown after 48h.
