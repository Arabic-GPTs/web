#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import annotations

import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path

try:
    from docx import Document
except ImportError as exc:  # pragma: no cover
    raise SystemExit("python-docx is required. Install it via 'pip install python-docx'.") from exc

MAIN_TITLE = "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0631\u0626\u064a\u0633\u064a"
SUB_TITLE = "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0631\u0639\u064a"
TAG_ABOUT = "\u0646\u0628\u0630\u0629"
TAG_LIMITS = "\u062d\u062f\u0648\u062f"
TAG_EXAMPLE = "\u0645\u062b\u0627\u0644"
TAG_LINKS = "\u0631\u0648\u0627\u0628\u0637"
TAG_MODEL = "\u0646\u0645\u0648\u0630\u062c"


def iter_doc_lines(doc_path: Path):
    doc = Document(str(doc_path))
    for para in doc.paragraphs:
        text = (para.text or "").strip()
        if not text:
            continue
        for part in text.splitlines():
            line = part.strip()
            if line:
                yield line


def normalize_line(line: str) -> str:
    return line.replace("\u200f", "").replace("\u200e", "").strip()


def parse_combined_doc(doc_path: Path):
    packages: "OrderedDict[str, OrderedDict[str, list]]" = OrderedDict()
    current_pkg_name = None
    current_cat_name = None
    current_bot = None
    current_field = None
    current_model = None

    for raw_line in iter_doc_lines(doc_path):
        line = normalize_line(raw_line)
        if not line:
            continue

        if line.startswith(MAIN_TITLE):
            value = line.split(":", 1)[1].strip() if ":" in line else ""
            current_pkg_name = value
            packages.setdefault(current_pkg_name, OrderedDict())
            current_cat_name = None
            current_bot = None
            current_field = None
            current_model = None
            continue

        if line.startswith(SUB_TITLE):
            if current_pkg_name is None:
                raise ValueError("Encountered sub-title before a main title")
            value = line.split(":", 1)[1].strip() if ":" in line else ""
            current_cat_name = value or "\u063a\u064a\u0631 \u0645\u0635\u0646\u0641"
            packages[current_pkg_name].setdefault(current_cat_name, [])
            current_bot = None
            current_field = None
            current_model = None
            continue

        if line.startswith("#"):
            if current_pkg_name is None:
                raise ValueError("Encountered bot title before a main title")
            if current_cat_name is None:
                packages[current_pkg_name].setdefault("\u063a\u064a\u0631 \u0645\u0635\u0646\u0641", [])
                current_cat_name = "\u063a\u064a\u0631 \u0645\u0635\u0646\u0641"
            title = line.lstrip("#").strip()
            current_bot = {
                "botTitle": title,
                "\u0627\u0644\u0646\u0645\u0648\u0630\u062c": OrderedDict(),
                "\u0646\u0628\u0630\u0629": "",
                "\u062d\u062f\u0648\u062f": "",
                "\u0645\u062b\u0627\u0644": "",
            }
            packages[current_pkg_name][current_cat_name].append(current_bot)
            current_field = None
            current_model = None
            continue

        if line.startswith("@"):
            if current_bot is None:
                continue
            tag_body = line[1:].strip()
            tag, _, suffix = tag_body.partition(" ")
            if tag == TAG_ABOUT:
                current_field = "\u0646\u0628\u0630\u0629"
                current_model = None
            elif tag == TAG_LIMITS:
                current_field = "\u062d\u062f\u0648\u062f"
                current_model = None
            elif tag == TAG_EXAMPLE:
                current_field = "\u0645\u062b\u0627\u0644"
                current_model = None
            elif tag == TAG_LINKS:
                current_field = None
                current_model = None
            elif tag == TAG_MODEL:
                current_field = "link"
                current_model = suffix.strip() or "link"
            else:
                current_field = None
                current_model = None
            continue

        if current_bot is None:
            continue

        if current_field in ("\u0646\u0628\u0630\u0629", "\u062d\u062f\u0648\u062f", "\u0645\u062b\u0627\u0644"):
            key = current_field
            text = current_bot[key]
            current_bot[key] = f"{text}\n{line}".strip() if text else line
        elif current_field == "link" and current_model:
            lower = line.lower()
            if lower.startswith("http://") or lower.startswith("https://"):
                current_bot["\u0627\u0644\u0646\u0645\u0648\u0630\u062c"][current_model] = line.strip()

    return packages


def load_existing_package_ids(json_path: Path):
    if not json_path.exists():
        return {}
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    mapping = {}
    for pkg in data.get("packages", []):
        name = (pkg.get("package") or "").strip()
        if name:
            mapping[name] = pkg.get("packageId")
    return mapping


def enrich_bot_entry(bot):
    links = OrderedDict((key, value) for key, value in bot["\u0627\u0644\u0646\u0645\u0648\u0630\u062c"].items() if value)
    about = bot["\u0646\u0628\u0630\u0629"].strip()
    limits = bot["\u062d\u062f\u0648\u062f"].strip()
    example = bot["\u0645\u062b\u0627\u0644"].strip()

    entry = {
        "botTitle": bot["botTitle"],
        "\u0627\u0644\u0646\u0645\u0648\u0630\u062c": links,
        "\u0646\u0628\u0630\u0629": about,
        "\u062d\u062f\u0648\u062f": limits,
        "\u0645\u062b\u0627\u0644": example,
    }

    if links:
        entry["model"] = links
        entry["models"] = links
        entry["links"] = links
    if about:
        entry["about"] = about
        entry["description"] = about
    if limits:
        entry["limits"] = limits
        entry["constraints"] = limits
    if example:
        entry["example"] = example
        entry["examples"] = example

    return entry


def build_payload(packages, existing_ids):
    payload = {"packages": []}
    for index, (pkg_name, categories) in enumerate(packages.items(), start=1):
        pkg_id = existing_ids.get(pkg_name, index)
        pkg_entry = {
            "package": pkg_name,
            "packageId": pkg_id,
            "categories": [],
        }
        for cat_name, bots in categories.items():
            cat_entry = {"category": cat_name, "bots": []}
            for bot in bots:
                cat_entry["bots"].append(enrich_bot_entry(bot))
            pkg_entry["categories"].append(cat_entry)
        payload["packages"].append(pkg_entry)
    return payload


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sync combined DOCX content into public/new_bots.json")
    parser.add_argument("--doc", type=Path, default=Path(__file__).with_name("\u0646\u0628\u0630\u0629 - \u062d\u062f\u0648\u062f - \u0645\u062b\u0627\u0644 - \u0631\u0648\u0627\u0628\u0637.docx"), help="Path to the combined DOCX file")
    parser.add_argument("--json", type=Path, default=Path(__file__).resolve().parents[1] / "public" / "new_bots.json", help="Output JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Print a short summary without writing JSON")
    args = parser.parse_args(argv)

    if not args.doc.exists():
        raise SystemExit(f"Docx file not found: {args.doc}")

    packages = parse_combined_doc(args.doc)
    if not packages:
        raise SystemExit("No packages found in the DOCX file")

    existing_ids = load_existing_package_ids(args.json)
    payload = build_payload(packages, existing_ids)

    if args.dry_run:
        print(f"Packages: {len(payload['packages'])}")
        total_bots = sum(len(cat['bots']) for pkg in payload['packages'] for cat in pkg['categories'])
        print(f"Bots: {total_bots}")
        return 0

    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.json}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
