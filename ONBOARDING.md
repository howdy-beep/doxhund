# Doxhund — Orientation

## The one-line vision

**A free, one-stop privacy resource where everything can be done by hand,
with zero personal-data intake — automation is a possible future paid layer,
never the gate.**

## The pitch

An open-source privacy engine that helps people find where their data is
publicly exposed and remove it, one click at a time. Free for everyone.
Nothing you type is stored or transmitted to our servers.

## What "one-stop shop" means (the scope)

Data-broker removal is the core, but the product is a hub for the things a
privacy-conscious person actually needs:

- **Data-broker opt-outs** (349 brokers, direct links)
- **Credit freeze + Do-Not-Call + breach check** (already in the free toolkit)
- **Pre-filled forms, one-click `mailto:` removals, copy-paste CCPA/CPRA letters**
- **Guides** (`guide.html`)
- Later: email-breach lookup, car-privacy, and other self-lookup tools

## The business model (free-first, automation is the upsell)

| Tier | What you get | Cost |
|---|---|---|
| **Free (the whole point)** | Everything, done manually: Search Yourself, Browse, direct links, letter templates, checklist | $0 |
| **Paid (future)** | The bot does the repetitive parts (auto-scan + auto-remove + re-scan loop) | subscription |

## The core insight (this is the build order)

Data-broker removal is **three channels**, not one:

1. **Public opt-out FORMS** → browser automation (hard: Cloudflare / bot-walls)
2. **Templated removal EMAILS** → just auto-send "remove me" (no stealth needed)
3. **Legal-force CCPA/DPO LETTERS** → formal requests (no stealth needed)

The hard part (stealth + residential proxies) only matters for channel 1.
The other two are automatable much sooner.

**Build order:**
1. **Manual-first friction reduction** — Search Yourself + Browse + the guided
   Wizard are shipped. Next: fill the ~67 active brokers missing an
   `opt_out_url`, add more verified `search_url_template`s, and add
   copy-paste letter generators (one-click `mailto:` is already in the Wizard).
   *(All $0, static, no backend.)*
2. **Email + legal-letter automation** — send templated removals. *(No
   Cloudflare wall to fight — highest-value automation, done first.)*
3. **Form automation** — the genuinely hard part. Deferred. When needed:
   Patchright + sticky residential IPs.

## The automation path (how the paid layer actually works)

Two separate automation ladders, one catalog:

- **Scans (recon)** — auto-check brokers for a name and return a *redacted*
  "record exists" preview. Scaffolded in `engine/` (FastAPI + Playwright +
  server-side `blur_text` redaction). Needs a residential proxy + CapSolver to
  go live; Cloudflare-fronted brokers return "blocked" until then.
- **Removals (opt-out)** — three channels: (2) email "remove me" → easiest,
  (3) CCPA/DPO letters → easy, (1) web-form automation → hard (Cloudflare +
  anti-detection). Build email + letters first, forms last.

**Full map + techniques** (Patchright, CapSolver, disposable aliases, re-scan
cron, pre-filled form URLs, the `engine/` code map): see
[`docs/automation-playbook.md`](docs/automation-playbook.md).

Same guardrails as the free tier, plus the zero-knowledge vault for the paid
layer: client-side AES-256, ciphertext-only at rest, disposable email aliases,
no human eyes, defensive-only.

## The trust story (non-negotiable — do NOT break this)

- **No PII intake.** No quiz, no signup, no profile, no server-side storage
  of names/addresses/phones. Ephemeral input never leaves the browser.
- **No accounts.** Progress (checkboxes) lives in `localStorage` only.
- **Zero-knowledge for any future paid layer:** PII encrypted client-side
  (AES-256), servers see ciphertext only.
- **No human eyes:** automation is 100% code.
- **Open source & auditable.**
- **DEFENSIVE ONLY.** Self-lookup / self-removal. NOT an OSINT/doxxing
  toolkit. No "look up anyone" features. No backdoors. Shipping offensive
  tooling would kill the brand overnight.

## Current state (honest)

**DONE (on `main`):**
- **Search Yourself** (`index.html`) — client-side deep-link launcher: name +
  city fills each broker's `search_url_template`, renders a clean list of
  "where your name may appear," each row with Search + Remove links. No
  backend, no PII stored. 25 brokers currently template-backed. City/state
  autocomplete (local `catalog/us_cities.json`, zero network); location optional.
- **Removal Wizard** (`wizard.html`) — guided flow: stop-new-data quick-wins
  (credit freeze / Do-Not-Call / opt-out prescreen) → templated brokers by
  severity → one-click `mailto:` email removals → honest "X of Y" progress bar
  with a privacy-level picker. Name/city carry over from Search Yourself.
- **Browse** (`browse.html`) — full 349-broker directory (343 active) sorted by
  `leak_severity` (address → phone → relatives → employment → social), with
  `localStorage` progress + a "2-minute wins" filter (web form + email).
- **349-broker catalog** with `leak_severity` (349/349), `search_url_template`
  (25), `opt_out_url` (276, 79%), `request_method`, `opt_out_email` (172
  covered, 26 verified), `contact` (raw removal emails).
- **Free toolkit** (`guide` / `freeze` / `request` / `leak` / `archive` + DNC).
- **Dormant backends** for the future paid layer: recon API (`engine/api.py`,
  demo/live, redaction, rate-limit, auth) + AES-256-GCM vault (`web/js/vault.js`).

**NOT DONE:**
- ~67 active brokers still lack `opt_out_url` (the "no link" rows in Browse).
- Only 25 of 349 brokers have a verified `search_url_template`.
- `leak_severity` is keyword-inferred, not hand-verified — top-50 needs an eyeball.
- Email/letter automation + form automation (channels 2–3) not built.

## Tech stack

- **Frontend:** static HTML + JS on Cloudflare Pages (no build, $0).
- **Backend (dormant):** Python FastAPI + Playwright (destined for a VPS).
- **Vault (dormant):** Web Crypto AES-GCM (client-side).
- **Secrets:** gitignored `.env` (see `.env.example`).

## Deploy gotcha (read before touching Cloudflare)

If the GitHub repo is ever **deleted + recreated** (e.g. a PII hard-wipe),
Cloudflare Pages silently keeps building the *old* repo. The fix: Settings →
Builds & deployments → Git connection → disconnect + reconnect, confirm the
production branch is `main`, then push (or "Retry deployment"). Symptom: the
live site serves stale HTML and ignores new pushes.

## Repo

- Remote: https://github.com/howdy-beep/doxhund
- Local: `~/hermes/apps/doxhund`

## Where to help first

Two data tasks move the product fastest (both touch `catalog/brokers.json`,
pure JSON, no backend):

1. **Mine missing `opt_out_url`s** — ~67 active brokers have "no link" in Browse.
   Find each broker's removal page and add the URL + `request_method`.
2. **Add verified `search_url_template`s** — for each broker, find the
   name-search URL pattern, load-test with a fictional "Jane Doe," and add
   the template (see `docs/self-search-spec.md` §3 for the placeholder
   conventions). Skip rather than guess — a 404 template is worse than none.
