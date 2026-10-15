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

## Notes

- Free Gemini tier has rate limits; heavy use shows "Free limit reached, wait a minute".
- Google may use free-tier requests to improve its models. Fine for testing.
- Next: accounts and sync (Supabase), watering push reminders, per-user rate limits.
