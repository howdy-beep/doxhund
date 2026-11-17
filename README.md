# Doxhund 🐾
> **The scent-hound that helps you find — and delete — your own public records.**

Doxhund is a free, open-source, manual-first privacy resource. It maps the
public data brokers that may hold your records, gives you one-click deep-links
to see what each site has on you, and hands you the removal link right next to
it. **Nothing you type ever leaves your browser. There are no accounts, no
signup, and no stored personal data.** Automation is a possible future paid
layer — never the gate.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Privacy: No PII Stored](https://img.shields.io/badge/Privacy-No%20PII%20Stored-blue.svg)](#principles)
[![Manual-first](https://img.shields.io/badge/Free-100%25%20Manual-green.svg)](#what-doxhund-is)

---

## What Doxhund is

Three surfaces, all free, all zero-storage:

1. **Search Yourself** (`index.html`) — type a name + city *in your own
   browser*. Doxhund fills each broker's search URL and shows you a clean
   list of "where your name may appear," each with a **Search** link (opens
   that site's own results in a new tab) and a **Remove** link. You click
   one at a time. Nothing is sent to us. City/state autocomplete runs on a
   local US list — no network, location optional.
2. **Removal Wizard** (`wizard.html`) — a guided walkthrough: stop new data
   first (credit freeze, Do-Not-Call, opt-out prescreen), then work through
   address-exposing brokers, then one-click `mailto:` removal emails. An
   honest "X of Y" progress bar with a privacy-level picker. Name + city
   carry over from Search Yourself via `localStorage`.
3. **Browse** (`browse.html`) — the full **349-broker** catalog (343 active),
   sorted by what actually leaks (home address → phone → relatives →
   employment → social). Check off what you've removed; progress is stored in
   your browser's `localStorage` only. A "2-minute wins" toggle filters to
   online-removable brokers (web form + email).

## Principles (non-negotiable)

- **No PII intake.** No quiz, no signup, no profile, no server-side storage
  of names/addresses/phones. Ephemeral input never leaves the browser.
- **Defensive only.** Self-lookup / self-removal. This is not an OSINT or
  "look up anyone" tool, and it never will be.
- **Manual-first.** Everything is free to do by hand. Automation (auto-scan +
  auto-remove) is an *optional* future paid layer.
- **Open source & auditable.** The broker catalog and logic are public.

## The catalog

`catalog/brokers.json` holds **349 brokers** (343 active; 6 deactivated dead
or malware sites) plus **4 official public-records sources** (Iowa court,
sex-offender, DOC offender, and VINE lookups; `category: public_records`).
Key fields:

| Field | Meaning | Coverage |
|---|---|---|
| `leak_severity` | what the site exposes (address / phone / relatives / employment / social / records) | 353/353 |
| `search_url_template` | pre-fillable name-search URL (powers "Search Yourself") | 25 |
| `opt_out_url` | direct removal link | 276 (79%) |
| `request_method` | web_form / email / fax / unknown / none | 349/349 |
| `contact` / `opt_out_email` | raw mined emails / curated opt-out address ("" for web-form brokers) | 173 raw · 26 verified |

The `search_url_template` and `opt_out_url` counts are the main growth levers —
every broker with a template shows up in "Search Yourself" automatically, and
every broker with an `opt_out_url` gets a working Remove link in Browse.
`catalog/us_cities.json` (~30k "City, ST" strings) powers the city/state
autocomplete entirely client-side.

## Directory structure

- `index.html` — homepage + "Search Yourself" launcher (static, client-side).
- `wizard.html` — guided removal walkthrough (freeze → search → email).
- `browse.html` — the full broker directory, sorted by `leak_severity`.
- `guide.html`, `freeze.html`, `request.html`, `leak.html`, `archive.html` — free toolkit.
- `catalog/brokers.json` — the master broker registry.
- `catalog/us_cities.json` — local US "City, ST" list for the autocomplete (zero network).
- `scripts/classify_severity.py` — (re)assigns `leak_severity` by keyword inference.
- `engine/` — FastAPI recon API + Playwright scrapers (dormant; backend for
  the future paid automation layer, not required to use the site).
- `web/` — client-side AES-256 vault (dormant; a future paid-layer primitive).
- `docs/` — specs, including `docs/automation-playbook.md` (how to automate the
  scans + removals) and `docs/dev-setup.md` (run it locally).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`ONBOARDING.md`](ONBOARDING.md).
The highest-value contribution right now is adding verified `search_url_template`
entries, filling in the ~67 active brokers still missing an `opt_out_url`, and
curating the `opt_out_email` field for email-method brokers. Want to automate
the scans or opt-outs? Start at [`docs/automation-playbook.md`](docs/automation-playbook.md).

## License

MIT License. Free to inspect, verify, and run.
