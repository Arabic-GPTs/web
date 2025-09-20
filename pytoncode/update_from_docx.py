#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import re
import sys
from pathlib import Path

try:
    from docx import Document
except Exception as e:
    print("python-docx not installed:", e)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_JSON = REPO_ROOT / 'public' / 'new_bots.json'

BASE = Path(__file__).resolve().parent
HUDUD_PATH = BASE / 'حدود.docx'
NOBTHA_PATH = BASE / 'نبذة.docx'
MITHAL_PATH = BASE / 'مثال.docx'

def read_json(path: Path):
    if not path.exists():
        return None
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)

def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def read_docx_lines(path: Path):
    if not path.exists():
        return []
    doc = Document(str(path))
    lines = []
    for p in doc.paragraphs:
        t = (p.text or '').strip()
        if t:
            lines.append(t)
    return lines

AR_QUOTE_CHARS = '"\'\'«»“”‟❝❞＂'

def normalize_text(s: str) -> str:
    if not s:
        return ''
    # Remove directional marks and zero-width
    s = re.sub(r'[\u200f\u200e\u202a-\u202e\ufeff]', '', s)
    # Unify quotes
    s = s.replace('«', '"').replace('»', '"').replace('“', '"').replace('”', '"')
    # Strip punctuation-like decorations around
    s = s.strip()
    s = re.sub(r'^\s*[#@]+\s*', '', s)  # remove leading ### or @@@ markers
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def build_known_map(titles):
    m = {}
    for t in titles:
        m[normalize_text(t)] = t
    return m

def parse_blocks(lines, known_map):
    result = {}
    current_key = None
    buffer = []

    def flush():
        nonlocal buffer, current_key
        if current_key and buffer:
            text = '\n'.join(buffer).strip()
            if text:
                result[current_key] = text
        buffer = []

    for raw in lines:
        line = raw.strip()
        line_no_mark = re.sub(r'^\s*[#@]+\s*', '', line)
        norm_line = normalize_text(line)
        norm_no_mark = normalize_text(line_no_mark)

        key = None
        if norm_line in known_map:
            key = known_map[norm_line]
        elif norm_no_mark in known_map:
            key = known_map[norm_no_mark]

        if key:
            flush()
            current_key = key
            continue

        if current_key:
            buffer.append(line)

    flush()
    return result

def extract_desc_from_buffer(text: str, label: str):
    # Try to extract after "الوصف (label):" if present
    # Accept both Arabic and ASCII colon
    pattern = rf"الوصف\s*\(\s*{re.escape(label)}\s*\)\s*[:：]\s*(.+)"
    m = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if m:
        return m.group(1).strip()
    return text.strip()

def build_maps(known_titles):
    known_map = build_known_map(known_titles)

    hudud_lines = read_docx_lines(HUDUD_PATH)
    nobtha_lines = read_docx_lines(NOBTHA_PATH)
    mithal_lines = read_docx_lines(MITHAL_PATH)

    hudud_map = parse_blocks(hudud_lines, known_map)
    nobtha_map = parse_blocks(nobtha_lines, known_map)
    mithal_map = parse_blocks(mithal_lines, known_map)

    # Post-process to extract labeled descriptions if present
    nobtha_map = {k: extract_desc_from_buffer(v, 'نبذة') for k, v in nobtha_map.items()}
    mithal_map = {k: extract_desc_from_buffer(v, 'مثال') for k, v in mithal_map.items()}

    return hudud_map, nobtha_map, mithal_map

def update_public_json(data, hudud_map, nobtha_map, mithal_map):
    updated = 0
    for pkg in data.get('packages', []):
        for cat in pkg.get('categories', []):
            for bot in cat.get('bots', []):
                title = bot.get('botTitle', '')
                if title in nobtha_map and nobtha_map[title]:
                    bot['نبذة'] = nobtha_map[title]
                    updated += 1
                if title in hudud_map and hudud_map[title]:
                    bot['حدود'] = hudud_map[title]
                    updated += 1
                if title in mithal_map and mithal_map[title]:
                    bot['مثال'] = mithal_map[title]
                    updated += 1
    return updated

def main():
    data = read_json(PUBLIC_JSON)
    if not data or 'packages' not in data:
        print('No public/new_bots.json found or invalid.')
        return 1

    # Collect known titles from existing JSON
    titles = []
    for pkg in data.get('packages', []):
        for cat in pkg.get('categories', []):
            for bot in cat.get('bots', []):
                t = bot.get('botTitle', '').strip()
                if t:
                    titles.append(t)

    hudud_map, nobtha_map, mithal_map = build_maps(titles)
    updated = update_public_json(data, hudud_map, nobtha_map, mithal_map)
    write_json(PUBLIC_JSON, data)
    print(f'Updated entries: {updated}')
    return 0

if __name__ == '__main__':
    sys.exit(main())

