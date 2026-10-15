# Leafline

Snap a plant photo and get its name, a care guide and a health check. Save plants and track watering.

- Frontend: `public/` (one page, installable as an app).
- Backend: Netlify Functions in `netlify/functions/` (`/api/identify`, `/api/ask`) calling the **free Google Gemini API**. The key stays on the server.
- Saved plants live in each phone's browser storage (no database yet).

## Go live on Netlify (free)

1. Free Gemini key (no card): https://aistudio.google.com/apikey → Create API key.
2. Put this folder in a GitHub repo.
3. Netlify → project **leafline-plants** → Project configuration → Build & deploy → **Link repository** → pick the repo. Build settings come from `netlify.toml`.
4. Netlify → Project configuration → **Environment variables** → Add `GEMINI_API_KEY` (scope: Functions) → paste key.
5. Deploys → **Trigger deploy**. Live at https://leafline-plants.netlify.app

Or from a laptop with Node: `npx netlify-cli deploy --prod` in this folder.

## Settings

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | yes | none |
| `GEMINI_MODEL` | no | `gemini-3.5-flash-lite,gemini-3.1-flash-lite` (tried in order) |

## Features

- Identify + health check (camera or upload), care guide, ask-a-question
- Profiles: home gardener, farmer, nursery (changes wording, rooms/fields, and AI advice)
- English / हिंदी (UI + AI answers)
- Watering reminders: web push at 9 AM IST via `netlify/functions/daily-reminders.mjs`; calendar (.ics) fallback
- Share card for WhatsApp / Instagram
- Anonymous usage tracking (`/api/track`) and a private stats page at `/stats?key=STATS_KEY`

| Extra variable | Purpose |
|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | push notifications |
| `STATS_KEY` | password for /stats |
| `GUEST_DAILY_SCANS` | scans per day per phone without login (default 3) |
| `MEMBER_DAILY_SCANS` | scans per day per signed-in account (default 15) |
| `IP_DAILY_SCANS` | scans per day per network (default 40) |
| `TOTAL_DAILY_SCANS` | scans per day for the whole app (default 300) |
| `DAILY_QUESTIONS` | plant questions per person per day (default 20) |

Failed scans and "no plant found" don't count. Bursts are capped at 6 scans/min per network.

## Notes

- Free Gemini tier has rate limits; heavy use shows "Free limit reached, wait a minute".
- Google may use free-tier requests to improve its models. Fine for testing.
- Next: accounts and sync (Supabase), watering push reminders, per-user rate limits.
