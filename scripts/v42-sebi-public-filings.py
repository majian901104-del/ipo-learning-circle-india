#!/usr/bin/env python3
"""Fetch official SEBI public issue filing *index* (not IPO quote/subscription data).

No credentials, unofficial JSON endpoints or anti-bot workarounds. Fail closed on
HTTP/HTML changes. Only ordinary GET to a public HTTPS URL; never publish an
invented filing, price, allocation or estimated subscription level.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urljoin, urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

SOURCE = "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&smid=11&ssid=15"
ALLOWED_HOSTS = {"www.sebi.gov.in", "sebi.gov.in"}
DATE_RE = re.compile(r"\b(?:[A-Z][a-z]{2}\s+\d{1,2},?\s+20\d\d|\d{1,2}\s+[A-Z][a-z]{2}\s+20\d\d)\b")
MAX_HTML_BYTES = 2_000_000
MAX_RECORDS = 60

def clean(text: str) -> str:
    return " ".join(text.split())

def valid_filing_url(url: str) -> bool:
    p = urlparse(url)
    return p.scheme == "https" and p.hostname in ALLOWED_HOSTS and p.path.startswith("/filings/public-issues/") and p.path.endswith(".html")

class PublicIssues(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row_depth = 0
        self.current = None
        self.active_link = None
        self.in_cell = 0
        self.seen_cell = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr":
            self.row_depth += 1
            if self.row_depth == 1:
                self.current = {"cells": [], "links": []}
        if self.current is None:
            return
        if tag in ("td", "th"):
            self.in_cell += 1
            if self.in_cell == 1:
                self.seen_cell = []
        if tag == "a":
            self.active_link = {"href": attrs.get("href", ""), "label": []}
    def handle_data(self, data):
        if self.current is not None:
            if self.in_cell:
                self.seen_cell.append(data)
            if self.active_link is not None:
                self.active_link["label"].append(data)
    def handle_endtag(self, tag):
        if self.current is None:
            if tag == "tr" and self.row_depth > 0:
                self.row_depth -= 1
            return
        if tag == "a" and self.active_link is not None:
            label = clean("".join(self.active_link["label"]))
            href = self.active_link["href"]
            if label and href:
                self.current["links"].append({"label": label, "href": href})
            self.active_link = None
        if tag in ("td", "th") and self.in_cell:
            self.in_cell -= 1
            if self.in_cell == 0:
                self.current["cells"].append(clean("".join(self.seen_cell)))
        if tag == "tr" and self.row_depth:
            self.row_depth -= 1
            if self.row_depth == 0:
                self.rows.append(self.current)
                self.current = None

def normalize_date(raw: str) -> str | None:
    raw = clean(raw).replace(",", "")
    for fmt in ("%b %d %Y", "%d %b %Y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return None

def parse(html: str):
    parser = PublicIssues()
    parser.feed(html)
    records = {}
    for row in parser.rows:
        matched_date = DATE_RE.search(" ".join(row["cells"]))
        if not matched_date:
            continue
        filing_date = normalize_date(matched_date.group(0))
        if not filing_date:
            continue
        for link in row["links"]:
            url = urljoin(SOURCE, link["href"])
            if not valid_filing_url(url):
                continue
            title = clean(link["label"])
            if len(title) < 8 or len(title) > 240:
                continue
            lower = title.casefold()
            if "abridged" in lower:
                document_type = "abridged-prospectus"
            elif "rhp" in lower or "red herring" in lower:
                document_type = "rhp"
            elif "drhp" in lower or "draft" in lower:
                document_type = "drhp"
            elif "prospectus" in lower:
                document_type = "prospectus"
            else:
                document_type = "other-public-issue-filing"
            records[url] = {
                "filingDate": filing_date,
                "title": title,
                "documentType": document_type,
                "sebiPageUrl": url,
                "publisher": "SEBI",
                "evidenceType": "official-filing-index",
                "dataVerified": False,
                "meaning": "SEBI listing existence; IPO issue terms not extracted or independently authenticated"
            }
    result = sorted(records.values(), key=lambda x: (x["filingDate"], x["title"]), reverse=True)
    return result[:MAX_RECORDS], len(parser.rows)

class StrictRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        p = urlparse(newurl)
        if p.scheme != "https" or p.hostname not in ALLOWED_HOSTS:
            raise ValueError("Unexpected SEBI redirect destination")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def get_html() -> str:
    opener = build_opener(StrictRedirects())
    req = Request(SOURCE, headers={
        "User-Agent": "AngelResearchPublicFilingWatch/1.0 (public document index; low-frequency educational audit)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.8"
    })
    with opener.open(req, timeout=22) as response:
        if response.status != 200:
            raise RuntimeError(f"SEBI HTTP {response.status}")
        if response.url and (urlparse(response.url).hostname not in ALLOWED_HOSTS):
            raise RuntimeError("Source URL changed")
        content_type = response.headers.get("Content-Type", "")
        if "html" not in content_type.lower():
            raise RuntimeError(f"Unexpected SEBI content type: {content_type}")
        raw = response.read(MAX_HTML_BYTES + 1)
        if len(raw) > MAX_HTML_BYTES:
            raise RuntimeError("Unexpectedly large official listing response")
        return raw.decode("utf-8", errors="replace")

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--input-html", type=Path, help="parse a test HTML fixture offline")
    a.add_argument("--output", type=Path, default=Path("data/sebi-public-issue-filings.json"))
    a.add_argument("--dry-run", action="store_true", help="validate fetch but do not overwrite published file")
    a.add_argument("--diagnose", action="store_true", help="print truncated public table structure on parser failure")
    args = a.parse_args()
    raw = args.input_html.read_text(encoding="utf-8") if args.input_html else get_html()
    records, rows = parse(raw)
    if args.diagnose:
        obj = PublicIssues()
        obj.feed(raw)
        print(json.dumps({'debug': [{'cells': r['cells'][:3], 'links': r['links'][:4]} for r in obj.rows[:5]]}, indent=2)[:3000], file=sys.stderr)
        for needle in ('Jio Platforms', 'Zetwerk Manufacturing'):
            at = raw.find(needle)
            if at >= 0:
                print('HTML context near '+needle+': '+raw[max(0,at-650):at+500].replace('\\n',' ')[:1150], file=sys.stderr)
    # When the SEBI index changes markup or becomes a block/challenge page,
    # fail: NEVER replace a working snapshot with fabricated/empty data.
    if not records:
        raise RuntimeError(f"No SEBI public-issue filing URLs detected (parsed {rows} rows). Keep existing snapshot.")
    if not any(x["documentType"] == "rhp" for x in records):
        raise RuntimeError("No RHP rows detected. Source may have changed. Hold existing publication.")
    payload = {
        "schemaVersion": "4.2",
        "feedType": "official-public-document-index",
        "publisher": "Securities and Exchange Board of India (SEBI)",
        "sourceUrl": SOURCE,
        "fetchedAtUtc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "hasLivePriceOrSubscriptionData": False,
        "officialIndexRetrieved": True,
        "recordCount": len(records),
        "records": records
    }
    if args.dry_run:
        print(json.dumps({"ok": True, "parsedRows": rows, "recordCount": len(records),
            "sample": records[:4], "source": SOURCE}, indent=2))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"SEBI index parsed: {len(records)} filing records from {rows} rows. File {args.output}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("SEBI official listing acquisition failed closed:", str(e), file=sys.stderr)
        raise SystemExit(1)
