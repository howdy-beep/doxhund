# Contributing to Doxhund

Doxhund is a defensive, manual-first privacy tool. Read `ONBOARDING.md`
first — it defines the vision, the trust story, and the build order.

## Ground rules

1. **Defensive only.** This is a self-lookup / self-removal tool. Do not add
   offensive OSINT, "look up anyone," or doxxing features — they would destroy
   the brand's trust. If a change could be used to investigate *other people*,
   it does not belong here.
2. **No PII intake.** Do not add quizzes, signup flows, profiles, or any
   server-side storage of names/addresses/phones. Ephemeral client-side input
   (a name typed in the browser to build a link) is the maximum allowed.
3. **Surgical edits.** Make focused, verifiable changes. Don't rewrite files
   wholesale or reformat unrelated code.
4. **Verify before merging.** Run the tests and a smoke check; don't ship
   unverified work. For catalog data, load-test URLs with a fictional name
   ("Jane Doe") and skip rather than guess.

## How to contribute

1. **Fork** the repo (don't push directly to `main`).
2. Create a branch off `main`.
3. Make your changes and commit them.
4. Open a **pull request** against `howdy-beep/doxhund`.

A maintainer reviews and merges. Nothing deploys to production until it's
merged into `main`.

## Developer setup

How to run the static site + the recon engine locally:
[`docs/dev-setup.md`](docs/dev-setup.md).

## Good first builds

- **Email-removal automation** (easiest, highest leverage): send a templated
  "remove me" to each broker's `opt_out_email`. No anti-detection work needed.
- **Scan go-live**: add a proxy + CapSolver key to the existing `engine/` so
  recon returns real (redacted) previews.
- **Pre-filled removal form URLs** and the **re-scan cron** — see the full map
  in [`docs/automation-playbook.md`](docs/automation-playbook.md).

## Catalog conventions (`catalog/brokers.json`)

- `search_url_template` uses exactly these placeholders: `{name}`,
  `{first_name}`, `{last_name}`, `{city_state}`, `{query}`.
- Never invent a `search_url_template` — visit the site, confirm the URL
  pattern loads real results for a fictional name, then add it. A 404
  template is worse than a missing one.
- `leak_severity` is one of: `address`, `phone`, `relatives`, `employment`,
  `social`, `records`. `records` marks an official government public-records
  source (court, criminal, sex-offender, offender/custody lookups): these have
  `category: public_records`, `recon_supported: true`, and an empty
  `opt_out_url` — they cannot be removed by opt-out (expungement/sealing is a
  court action, not a deletion request). Re-run `scripts/classify_severity.py`
  after bulk edits to regenerate it.
- `request_method` is one of `web_form` / `email` / `fax` / `unknown` / `none`.
  `contact` holds raw (possibly multiple) removal email(s); `opt_out_email` is
  the curated single address the wizard uses — leave it empty to fall back to
  `contact`.
- **Never edit `brokers.json` directly across sessions.** Enrichment writes a
  separate `catalog/*_patch.json` file, then a single merge folds it in by
  `id`, never overwrites a non-empty `opt_out_url`, sorts by `id`, and deletes
  the patch file.
- `catalog/us_cities.json` is the local "City, ST" list for the autocomplete.
  Do NOT replace it with a remote geocoding API — that breaks zero-intake.

## Secrets

Never commit real credentials. Add new variables to `.env.example` (blank), not
to `.env`. `.env` is gitignored.

## Automating scans & opt-outs

The paid-layer path is documented in [`docs/automation-playbook.md`](docs/automation-playbook.md).
Two ladders: **scans** (recon — already scaffolded in `engine/`) and **removals**
(email → letters → web-form, easiest-first). Before building, re-read the
zero-knowledge guardrails in that doc — automation must not break the "no PII
intake / defensive-only / ciphertext-at-rest" guarantees.
