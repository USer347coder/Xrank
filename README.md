# Social Score Vault

Snapshot-based ranking and collectible card platform for X profiles.

- Enter an X username → capture a snapshot of 6 KPIs
- Compute a Social Score (0–100) with tier (Bronze → Mythic)
- Generate a collectible card (PNG + PDF) with dark sci-fi design
- Save cards to your Vault (public/private/unlisted)
- Public vault pages per profile, leaderboard, card compare

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS v4
- **Backend:** Netlify Functions (TypeScript, v2 API)
- **DB/Auth/Storage:** Supabase (Postgres + Auth + Storage)
- **Card Rendering:** Playwright + @sparticuz/chromium-min

## Deploy to Netlify

### 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in order:
   - `supabase/migrations/001_schema.sql` — tables + indexes
   - `supabase/migrations/002_rls.sql` — Row Level Security policies
   - `supabase/migrations/003_storage.sql` — "cards" storage bucket
3. Note your project URL, anon key, and service role key

### 2. Netlify Setup

1. Push this repo to GitHub
2. In Netlify: **Add new site → Import from Git**
3. Settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### 3. Environment Variables

Set these in Netlify → Site settings → Environment variables:

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Build + Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Build + Frontend | Supabase anon/public key |
| `SUPABASE_URL` | Functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions | Supabase service role key (secret!) |
| `SITE_URL` | Functions | Your Netlify deploy URL (e.g. `https://your-app.netlify.app`) |
| `X_BEARER_TOKEN` | Functions | X API Bearer token (optional — mock data used if absent) |

### 4. Deploy

Trigger a deploy. The app should be live.

## Local Development

```bash
# Install
npm install

# Create .env file (copy from .env.example and fill in values)
cp .env.example .env

# Start dev server (Vite only — no functions)
npm run dev

# Start with Netlify Functions (requires netlify-cli)
npx netlify dev
```

## Architecture

### Netlify Functions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/capture-snapshot` | POST | Optional | Capture KPIs, compute score, generate card |
| `/api/render-card` | POST | — | Re-render card for a snapshot |
| `/api/card/:snapshotId` | GET | — | Get card data + QR |
| `/api/assets/:snapshotId` | GET | — | Get card PNG/PDF URLs |
| `/api/save-to-vault` | POST | Required | Save snapshot to user's vault |
| `/api/my-vault` | GET | Required | Get user's vault entries |
| `/api/vault/:username` | GET | — | Get public vault for an X username |
| `/api/leaderboard` | GET | — | Top scores by time window |

### Score Formula (v1)

```
influence   = log10(followers + 1)              // [0, 8]
credibility = log10(listed + 1)                 // [0, 5]
quality     = log10(avgEngPerPost + 1)          // [0, 6]
momentum    = min(velocity7d, 100) / 100        // [0, 1]
healthN     = clamp(followers/following, 0, 10) / 10  // [0, 1]

raw = 0.35*influence + 0.15*credibility + 0.25*quality + 0.15*momentum + 0.10*healthN
score = round(100 * normalize(raw))             // [0, 100]
```

### Tiers

| Range | Tier |
|-------|------|
| 90–100 | Mythic |
| 75–89 | Platinum |
| 50–74 | Gold |
| 25–49 | Silver |
| 0–24 | Bronze |

### Tags

- **genesis**: First snapshot ever stored for a profile
- **foil**: Score increased ≥10 vs previous snapshot, OR captured at month-end (UTC)

## Pages

- `/` — Home: capture snapshot, preview card, download, save to vault
- `/leaderboard` — Top cards by score (configurable time window)
- `/vault` — My Vault (auth required): grid + tier filter
- `/vault/:username` — Public profile vault: timeline + compare
- `/card/:snapshotId` — Public card view: preview, downloads, share link
- `/render/card/:snapshotId` — Clean card render (for debugging/Playwright)
