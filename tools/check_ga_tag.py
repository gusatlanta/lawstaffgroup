"""List HTML pages missing the GA4 tag.

Walks every .html file under the site root and prints any page whose <head>
does not contain the standard gtag.js snippet for G-8016NR4VR1. Generated
city, practice-area and metro pages get that snippet from tools/build_seo_pages.py.

    python tools/check_ga_tag.py

Exits 0 when every page has the tag, 1 when one or more do not.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GA_ID = "G-8016NR4VR1"
SRC = f"https://www.googletagmanager.com/gtag/js?id={GA_ID}"
CONFIG = f"gtag('config', '{GA_ID}')"


def head_html(text: str) -> str | None:
    lower = text.lower()
    start = lower.find("<head")
    if start < 0:
        return None
    open_end = text.find(">", start)
    if open_end < 0:
        return None
    close = lower.find("</head>", open_end)
    if close < 0:
        return None
    return text[open_end + 1 : close]


def missing_tag(text: str) -> bool:
    head = head_html(text)
    if head is None:
        return True
    return SRC not in head or CONFIG not in head


def main() -> int:
    pages = sorted(p for p in ROOT.rglob("*.html") if p.is_file())
    missing = [p.relative_to(ROOT).as_posix() for p in pages if missing_tag(p.read_text(encoding="utf-8"))]
    print(f"Checked {len(pages)} HTML page(s) for GA4 tag {GA_ID}.")
    if not missing:
        print("Every page has the tag.")
        return 0
    print(f"{len(missing)} page(s) missing the tag:")
    for rel in missing:
        print(rel)
    return 1


if __name__ == "__main__":
    sys.exit(main())
