# Doxhund — Developer Setup

Everything is static-first and runs locally with zero external services. The
recon engine ships in "demo" mode — no proxy, captcha, or network required to
run it.

## Run the static site (index / wizard / browse)

No build step. Serve the repo root over HTTP (`fetch()` needs http, not file://):

    cd doxhund
    python3 -m http.server 8000
    # open http://localhost:8000/

Every page is plain HTML + inline JS + `catalog/brokers.json`. Edit a file,
refresh — that's the whole loop.

Styling is pre-compiled into `styles.css` (self-hosted, no CDN). If you change
Tailwind classes, rebuild it and commit the result:

    npx tailwindcss@3 -i ./input.css -o ./styles.css --minify --content "./*.html"

## Run the recon engine (demo mode)

    cd doxhund
    uv venv .venv --python 3.11 && source .venv/bin/activate
    uv pip install -r requirements.txt
    uvicorn engine.api:app --port 8001

Demo mode returns clearly-labeled synthetic previews. `GET /health` and
`POST /api/scan` are live with no network dependencies.

## Go live (real broker scraping)

Live mode needs Playwright + a rotating residential proxy + a captcha solver:

    uv pip install playwright && playwright install chromium
    # then in .env:
    DOXHUND_MODE=live
    DOXHUND_PROXY_URL=...          # rotating residential
    DOXHUND_CAPTCHA_API_KEY=...    # CapSolver / 2Captcha

Cloudflare-fronted brokers return status `"blocked"` without these — that's
expected, not a bug. See `docs/automation-playbook.md` for the full picture.

## Conventions

- **Never edit `catalog/brokers.json` across sessions.** Enrichment writes a
  `catalog/*_patch.json`, then a single merge folds it in by `id` (see
  `CONTRIBUTING.md`).
- **Verify:** `node --check` any inline JS you touch; `python -m json.tool`
  any JSON you touch; load pages over HTTP, not `file://`.
- **No real PII anywhere** — use fictional placeholders ("Jane Doe",
  "742 Evergreen Terrace").
