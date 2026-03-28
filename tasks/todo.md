# Deploy ThreatPad Demo — Vercel + Render + Neon

## Step 1: Neon (Free Postgres)

1. Go to **https://neon.tech** → Sign up (GitHub login works)
2. Click **"New Project"**
   - Project name: `threatpad`
   - Postgres version: 16
   - Region: **US East (Ohio)** (pick closest to Render region)
3. Once created, go to **Dashboard → Connection Details**
4. Copy the connection string — it looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this — you'll need it for Render

## Step 2: Render (Backend — Free Web Service)

1. Go to **https://render.com** → Sign up → **New Web Service**
2. Connect your GitHub repo (`bhavikmalhotra/ThreatPad`)
3. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `threatpad-api` |
   | **Region** | Ohio (US East) — match Neon region |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `pnpm install --frozen-lockfile && cd packages/db && npx drizzle-kit push && npx tsx src/seed.ts && npx tsx src/seed-demo.ts` |
   | **Start Command** | `npx tsx apps/server/src/index.ts` |
   | **Instance Type** | Free |

4. Scroll to **Environment Variables** → add these:

   | Variable | Value |
   |----------|-------|
   | `NODE_VERSION` | `22` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(paste Neon connection string from Step 1)* |
   | `JWT_SECRET` | *(generate: run `openssl rand -hex 32` in terminal)* |
   | `JWT_REFRESH_SECRET` | *(generate: run `openssl rand -hex 32` again)* |
   | `CORS_ORIGIN` | `https://threat-pad.vercel.app` *(update after Vercel deploy if URL differs)* |
   | `APP_URL` | `https://threat-pad.vercel.app` *(same as above)* |
   | `API_URL` | `https://threatpad-api.onrender.com` *(Render gives you this URL after creation)* |
   | `SELF_HOSTED` | `true` |

   **Do NOT add** `REDIS_URL` — not needed, app works without it.

5. Click **Create Web Service**
6. Wait for the first build to complete (~3-5 min). The build will:
   - Install dependencies
   - Push DB schema to Neon
   - Seed the demo user and CTI content
7. Once deployed, note your Render URL (e.g. `https://threatpad-api.onrender.com`)
8. Test: visit `https://threatpad-api.onrender.com/api/health` — should return JSON with `database: { status: "ok" }`

## Step 3: Vercel (Frontend — Free)

1. Go to **https://vercel.com** → Sign up → **"Add New Project"**
2. Import your GitHub repo (`bhavikmalhotra/ThreatPad`)
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Next.js |
   | **Root Directory** | Click "Edit" → type `apps/web` |
   | **Build Command** | Override → `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @threatpad/web build` |
   | **Output Directory** | Leave as `.next` |
   | **Install Command** | Override → leave empty (or just a space) |

4. Expand **Environment Variables** → add:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://threatpad-api.onrender.com` *(your Render URL from Step 2)* |
   | `NEXT_PUBLIC_WS_URL` | `wss://threatpad-api.onrender.com` |

5. Click **Deploy**
6. Wait ~2-3 min for build
7. Note your Vercel URL (e.g. `https://threat-pad.vercel.app`)

## Step 4: Update Render CORS (if Vercel URL differs)

If your Vercel URL is different from what you set in Step 2:

1. Go to Render dashboard → `threatpad-api` → **Environment**
2. Update `CORS_ORIGIN` and `APP_URL` to match your actual Vercel URL
3. Click **Save Changes** — Render will auto-redeploy

## Step 5: Test

1. Open your Vercel URL
2. Log in with: **`demo@threatpad.io`** / **`password123`**
3. You should see the CTI Team workspace with:
   - 5 pre-populated notes (APT29 campaign, LockBit IOCs, Lazarus profile, etc.)
   - IOCs already extracted on each note
   - Tags applied (IOC, Threat Actor, Campaign, Malware, etc.)
   - 2 pinned notes on the dashboard
4. Test features: open a note → check IOC panel → try exporting to STIX/CSV/JSON → search for "malware"

## Notes

- **Cold starts:** Render free tier spins down after 15 min of no traffic. First request takes ~30-60 seconds. Subsequent requests are fast.
- **Neon cold starts:** Free tier suspends compute after 5 min idle. First DB query after idle adds ~1-2 seconds. Neon auto-wakes on connection.
- **No Redis needed:** App works fine without it. Health check will show Redis as "error" but everything else functions normally.
- **Demo resets:** If you want to wipe and re-seed, go to Render → Manual Deploy → "Clear build cache & deploy". Or delete/recreate the Neon database.
- **Custom domain:** Both Vercel and Render support custom domains on free tier if you want something nicer than the default URLs.
