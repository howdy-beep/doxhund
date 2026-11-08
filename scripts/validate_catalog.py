#!/usr/bin/env python3
"""Validate catalog/brokers.json before it ships.

Cheap, deterministic, no dependencies, no network. Intended to run on every
PR that touches the catalog and on every regeneration, so that mechanical
data damage (see the 14 truncated hostnames fixed in the same PR) cannot
reach the site unnoticed.

Usage:
    python3 scripts/validate_catalog.py
    python3 scripts/validate_catalog.py --catalog path/to/brokers.json

Exit code 0 = clean, 1 = violations found.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from urllib.parse import urlparse

REQUIRED_KEYS = ("id", "name", "category", "active")
URL_FIELDS = ("opt_out_url", "website_url", "search_url_template")
PLACEHOLDER_ALLOWED_FIELDS = {"search_url_template"}
ALLOWED_SCHEMES = {"http", "https"}


def bare_host(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url if "//" in url else "//" + url)
    host = (parsed.hostname or "").lower().rstrip(".")
    return host[4:] if host.startswith("www.") else host


def looks_truncated(host: str, name: str) -> bool:
    """Flag a host that is the broker's own name with its first letter dropped.

    A dropped leading character leaves a host that matches neither the domain
    nor the name, but equals the name minus its first character
    (awaiiarrests.org for Hawaii Arrests). Catches the class, not the instance.
    """
    slug = "".join(ch for ch in name.lower() if ch.isalnum())
    if len(slug) < 6 or not host:
        return False
    stem = host.split(".")[0]
    if len(stem) < 5 or stem == slug:
        return False
    # Only the exact one-character-drop case. Broader prefix matching produces
    # false positives on legitimate abbreviations (homes.com for Homes.com).
    return stem == slug[1:]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default="catalog/brokers.json")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    with open(args.catalog, encoding="utf-8") as fh:
        data = json.load(fh)

    violations: list[str] = []
    brokers = data.get("brokers")
    if not isinstance(brokers, list) or not brokers:
        print("FATAL: catalog has no brokers array")
        return 1

    for key in ("version", "name", "sources"):
        if key not in data:
            violations.append(f"top-level: missing key {key!r}")

    ids: Counter = Counter()
    for index, row in enumerate(brokers):
        label = row.get("id") or f"index {index}"
        for key in REQUIRED_KEYS:
            value = row.get(key)
            if value is None or (value == "" and key != "active"):
                violations.append(f"{label}: missing required key {key!r}")
        ids[row.get("id")] += 1

        for field in URL_FIELDS:
            value = (row.get(field) or "").strip()
            if not value:
                continue
            if "{" in value and field not in PLACEHOLDER_ALLOWED_FIELDS:
                violations.append(f"{label}: {field} contains an unresolved template placeholder")
            if field == "search_url_template":
                continue
            parsed = urlparse(value)
            scheme = parsed.scheme.lower()
            if scheme not in ALLOWED_SCHEMES:
                violations.append(f"{label}: {field} uses scheme {scheme or '(none)'!r}")
            if parsed.hostname is None:
                violations.append(f"{label}: {field} has no hostname")

        domain = bare_host(row.get("domain") or "")
        website = bare_host(row.get("website_url") or "")
        if domain and website and domain != website:
            violations.append(
                f"{label}: website_url host {website!r} does not match domain {domain!r}"
            )
        if website and looks_truncated(website, row.get("name", "")):
            violations.append(
                f"{label}: website_url host {website!r} looks like a truncated {row.get('name')!r}"
            )

    for id_value, count in ids.items():
        if count > 1:
            violations.append(f"duplicate id {id_value!r} appears {count} times")

    active = sum(1 for row in brokers if row.get("active") is not False)
    if not args.quiet:
        print(f"catalog: {len(brokers)} rows, {active} active, {len(ids)} unique ids")

    if violations:
        print(f"\n{len(violations)} violation(s):")
        for item in violations:
            print(f"  - {item}")
        return 1

    print("catalog OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
