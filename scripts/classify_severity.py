#!/usr/bin/env python3
"""Classify each broker in catalog/brokers.json with a `leak_severity` field.

Buckets (severity order, highest first):
  address    — publishes home address / property / deed / residence
  phone      — phone-number / caller / reverse-lookup only
  relatives  — genealogy / family-tree / known-associates
  employment — B2B / professional / job / employment-screening / skip-trace
  social     — social-graph / dating / identity-aggregator / catfish

Generalist people-search sites (FastPeopleSearch, Whitepages, BeenVerified,
etc.) expose address + phone + relatives all at once; they default to
`address` because a home address is the most sensitive field they publish.

This is keyword inference from name + URLs, NOT ground truth. The head of the
list (top ~50 by traffic) should get a manual eyeball before it ships.
"""

import json
import re

PATH = "catalog/brokers.json"


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


# A keyword shorter than this is too generic to match as a substring: "tree"
# appears inside "street", "home" inside "homepage", "job" inside "jobsboard".
# Short keywords are matched against whole tokens instead.
SHORT_KEYWORD_MAX = 4


def tokens(*parts: str) -> set:
    """Every alphanumeric token, plus each part joined, so multi-word keywords
    like "familytreenow" can still match a two-word name."""
    out = set()
    for part in parts:
        for tok in re.split(r"[^a-z0-9]+", (part or "").lower()):
            if tok:
                out.add(tok)
        joined = re.sub(r"[^a-z0-9]+", "", (part or "").lower())
        if joined:
            out.add(joined)
    return out


def matches(keyword: str, haystack: str, toks: set) -> bool:
    if len(keyword) > SHORT_KEYWORD_MAX:
        return keyword in haystack
    return keyword in toks


def classify(name: str, opt: str, search: str) -> str:
    hay = norm(name) + " " + norm(opt or "") + " " + norm(search or "")
    toks = tokens(name, opt, search)

    # Specialized buckets (most specific first).
    relatives = [
        "ancestry", "familysearch", "familytreenow", "familytree", "genealogy",
        "relatives", "archives", "myheritage", "findagrave", "obituary", "tree",
    ]
    employment = [
        "checkr", "fama", "contactout", "rocketreach", "apollo", "dataaxle",
        "data-axle", "batchskiptracing", "batchleads", "batchdialer", "skiptrace",
        "corporationwiki", "buzzfile", "councilon", "zoominfo", "linkedin",
        "career", "resume", "hiring", "employer", "job", "professional",
        "epsilon", "melissa", "directmail", "dmachoice", "catalogchoice", "plaid",
    ]
    phone = [
        "phonebook", "phone", "caller", "dialer", "areacode", "cellrevealer",
        "calltruth", "numlookup", "spydialer", "validnumber", "truecaller",
        "411", "confidential", "reverse", "dma", "donotcall", "carrier",
    ]
    social = [
        "socialcatfish", "catfish", "sync", "dating", "idcrawl", "spokeo",
        "peoplewhiz", "cocofinder", "veripages", "social", "instagram",
        "facebook", "twitter", "tinder", "snapchat",
    ]
    address = [
        "address", "property", "deed", "residence", "home", "house", "realty",
        "realtor", "parcel", "assessor", "shopper", "citydata", "city-data",
        "neighborhood", "zoning", "blockshopper", "carsowners", "vin", "vehicle",
        "lafitness",
    ]

    for kw in relatives:
        if matches(kw, hay, toks):
            return "relatives"
    for kw in employment:
        if matches(kw, hay, toks):
            return "employment"
    for kw in phone:
        if matches(kw, hay, toks):
            return "phone"
    for kw in social:
        if matches(kw, hay, toks):
            return "social"
    for kw in address:
        if matches(kw, hay, toks):
            return "address"

    # Default: generalist people-search.
    return "address"


def main() -> None:
    with open(PATH) as f:
        data = json.load(f)

    from collections import Counter
    dist = Counter()
    for b in data["brokers"]:
        b["leak_severity"] = classify(
            b.get("name", ""), b.get("opt_out_url", ""), b.get("search_url_template", "")
        )
        dist[b["leak_severity"]] += 1

    with open(PATH, "w") as f:
        # Trailing newline keeps the file byte-identical to what the rest of
        # the repo writes, so a rerun does not show up as a spurious diff.
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("leak_severity distribution:")
    order = ["address", "phone", "relatives", "employment", "social"]
    for k in order:
        print(f"  {k:12s} {dist[k]}")


if __name__ == "__main__":
    main()
