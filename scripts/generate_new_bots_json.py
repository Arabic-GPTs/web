#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate public/new_bots.json from the Arabic metadata DOCX."""

from __future__ import annotations

import json
import re
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse

try:
    from docx import Document
except ImportError as exc:  # pragma: no cover
    print("python-docx is required to parse the metadata document:", exc, file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_CANDIDATES = [
    REPO_ROOT / 'pytoncode' / 'نبذة - حدود - مثال - روابط.docx',
    REPO_ROOT / 'pytoncode' / 'metadata_doc.docx',
]
DOC_PATH = next((candidate for candidate in DOC_CANDIDATES if candidate.exists()), DOC_CANDIDATES[0])
OUTPUT_PATH = REPO_ROOT / 'public' / 'new_bots.json'

PACKAGE_FALLBACK = 'أدوات متنوعة'
CATEGORY_FALLBACK = 'أدوات دون تصنيف'
FIELD_NORMALIZATION = {
    'نبذة': 'نبذة',
    'النبذة': 'نبذة',
    'حدود': 'حدود',
    'الحدود': 'حدود',
    'مثال': 'مثال',
    'أمثلة': 'مثال',
}
LINK_FIELD = 'روابط'

URL_TOKEN_PATTERN = re.compile(r"https?://[^\s]+", re.IGNORECASE)


def iter_chunks(doc: Document):
    """Yield trimmed pieces, splitting internal newlines as standalone chunks."""
    for para in doc.paragraphs:
        text = (para.text or '').replace('\r', '\n')
        for chunk in text.split('\n'):
            piece = chunk.strip()
            if piece:
                yield piece


def to_safe_url(value: str) -> str:
    value = (value or '').strip().strip('：:؛،')
    if not value:
        return ''
    parsed = urlparse(value)
    if parsed.scheme in {'http', 'https'}:
        return value
    return ''


def normalize_model_key(raw: str) -> str:
    token = (raw or '').strip().lower()
    token = token.replace('٠', '0').replace('٥', '5')
    token = token.replace('gpt-', '').replace('gpt', '')
    token = token.replace('نموذج', '').replace('نمو', '').replace('-', '').replace(' ', '')
    if token in {'4o', '4'}:
        return '4o'
    if token in {'4omini', '4omin', '4mini'}:
        return '4o-mini'
    if token in {'5'}:
        return '5'
    return token or '4o'


def normalize_field(label: str) -> str | None:
    base = label.strip()
    return FIELD_NORMALIZATION.get(base, FIELD_NORMALIZATION.get(base.capitalize(), None))


def collapse_lines(lines: List[str]) -> str:
    compact = '\n'.join(line.strip() for line in lines if line.strip())
    return compact.strip()


def build_payload() -> Dict[str, List[Dict[str, object]]]:
    if not DOC_PATH.exists():
        raise FileNotFoundError(f"Metadata document not found: {DOC_PATH}")

    doc = Document(str(DOC_PATH))
    packages: List[Dict[str, object]] = []
    package_map: Dict[str, Dict[str, object]] = OrderedDict()
    category_map: Dict[tuple[str, str], Dict[str, object]] = {}

    current_package: Dict[str, object] | None = None
    current_category: Dict[str, object] | None = None
    current_bot: Dict[str, object] | None = None
    current_field: str | None = None
    pending_model: str | None = None
    collecting_links = False

    def get_package(name: str) -> Dict[str, object]:
        key = name.strip() or PACKAGE_FALLBACK
        pkg = package_map.get(key)
        if not pkg:
            pkg = OrderedDict([('package', key), ('categories', [])])
            package_map[key] = pkg
            packages.append(pkg)
        return pkg

    def get_category(pkg: Dict[str, object], name: str) -> Dict[str, object]:
        key = (pkg['package'], name.strip() or CATEGORY_FALLBACK)
        cat = category_map.get(key)
        if not cat:
            cat = OrderedDict([('category', key[1]), ('bots', [])])
            pkg['categories'].append(cat)
            category_map[key] = cat
        return cat

    def flush_bot():
        nonlocal current_bot, current_field, pending_model, collecting_links
        if not current_bot or not current_category:
            current_bot = None
            current_field = None
            pending_model = None
            collecting_links = False
            return

        fields = current_bot.setdefault('fields', {})
        models_raw: Dict[str, str] = current_bot.setdefault('models', {})
        extra_links: List[str] = current_bot.get('links_extra', [])

        models: Dict[str, str] = {}
        for k, v in models_raw.items():
            safe_url = to_safe_url(v)
            if safe_url:
                models[k] = safe_url

        for idx, link in enumerate(extra_links, start=1):
            safe = to_safe_url(link)
            if not safe:
                continue
            key = f'link-{idx}'
            if key not in models:
                models[key] = safe

        about = collapse_lines(fields.get('نبذة', []))
        limits = collapse_lines(fields.get('حدود', []))
        example = collapse_lines(fields.get('مثال', []))

        primary_link = models.get('4o') or models.get('5') or next(iter(models.values()), '')

        bot_entry = OrderedDict([
            ('botTitle', current_bot['title']),
            ('النموذج', models.copy()),
            ('نبذة', about),
            ('حدود', limits),
            ('مثال', example),
        ])

        if primary_link:
            bot_entry['url'] = primary_link

        for alias in ('model', 'models', 'links'):
            bot_entry[alias] = models.copy()
        for alias in ('about', 'description'):
            bot_entry[alias] = about
        for alias in ('limits', 'constraints'):
            bot_entry[alias] = limits
        for alias in ('example', 'examples'):
            bot_entry[alias] = example
        if extra_links:
            bot_entry['linksList'] = [to_safe_url(link) for link in extra_links if to_safe_url(link)]

        bot_entry['hasLink'] = bool(primary_link)

        current_category['bots'].append(bot_entry)

        current_bot = None
        current_field = None
        pending_model = None
        collecting_links = False

    for chunk in iter_chunks(doc):
        if chunk.startswith('العنوان الرئيسي:'):
            flush_bot()
            title = chunk.split(':', 1)[1].strip()
            current_package = get_package(title)
            current_category = None
            continue
        if chunk.startswith('العنوان الفرعي:'):
            flush_bot()
            if current_package is None:
                current_package = get_package(PACKAGE_FALLBACK)
            cat_name = chunk.split(':', 1)[1].strip()
            current_category = get_category(current_package, cat_name)
            continue
        if chunk.startswith('#'):
            flush_bot()
            if current_package is None:
                current_package = get_package(PACKAGE_FALLBACK)
            if current_category is None:
                current_category = get_category(current_package, CATEGORY_FALLBACK)
            title = chunk.lstrip('#').strip()
            current_bot = {
                'title': title,
                'fields': {field: [] for field in FIELD_NORMALIZATION.values()},
                'models': {},
                'links_extra': [],
            }
            current_field = None
            pending_model = None
            collecting_links = False
            continue
        if chunk.startswith('@'):
            if current_bot is None:
                continue
            label = chunk[1:].strip()
            pending_model = None
            current_field = None
            collecting_links = False
            if label.lower().startswith('نموذج'):
                parts = label.split(maxsplit=1)
                model_label = parts[1] if len(parts) > 1 else ''
                pending_model = normalize_model_key(model_label)
            elif label == LINK_FIELD:
                collecting_links = True
            else:
                field_name = normalize_field(label)
                if field_name:
                    current_field = field_name
                    current_bot['fields'].setdefault(field_name, [])
            continue

        if current_bot is None:
            continue

        if pending_model:
            current_bot['models'][pending_model] = chunk
            pending_model = None
            continue

        if collecting_links:
            matches = URL_TOKEN_PATTERN.findall(chunk)
            for match in matches:
                safe = to_safe_url(match)
                if safe:
                    current_bot.setdefault('links_extra', []).append(safe)
            continue

        if current_field:
            current_bot['fields'].setdefault(current_field, []).append(chunk)

    flush_bot()

    for idx, pkg in enumerate(packages, start=1):
        pkg['packageId'] = idx

    return {'packages': packages}


def main() -> int:
    data = build_payload()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open('w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {OUTPUT_PATH}")
    total = sum(len(cat['bots']) for pkg in data['packages'] for cat in pkg['categories'])
    print(f"Bots exported: {total}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
