#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import re
import sys
from pathlib import Path
from collections import OrderedDict

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

def parse_blocks_any(lines):
    """تحليل كتل عامة تعتمد على رؤوس '#...' أو '@@@...'"""
    result = {}
    current = None
    buf = []
    def flush():
        nonlocal buf, current
        if current and buf:
            text='\n'.join(buf).strip()
            if text:
                result[current]=text
        buf=[]
    for raw in lines:
        line=(raw or '').strip()
        if not line:
            continue
        m = re.match(r'^\s*(?:#+|@@@)\s*(.+?)\s*$', line)
        if m:
            flush()
            current = normalize_text(m.group(1))
            continue
        buf.append(line)
    flush()
    return result

def build_maps(known_titles):
    known_map = build_known_map(known_titles)

    hudud_lines = read_docx_lines(HUDUD_PATH)
    nobtha_lines = read_docx_lines(NOBTHA_PATH)
    mithal_lines = read_docx_lines(MITHAL_PATH)

    hudud_map = parse_blocks(hudud_lines, known_map)
    # خرائط عامة بدون اشتراط العناوين المعروفة
    nobtha_all = parse_blocks_any(nobtha_lines)
    def parse_pairs_map(lines):
        res = {}
        for raw in lines:
            s = (raw or '').strip()
            if not s:
                continue
            m = re.search(r'["“”«](.+?)["”»]\s*[:：]\s*["“”«](.+?)["”»]', s)
            if m:
                k = normalize_text(m.group(1))
                v = m.group(2).strip()
                res[k] = v
        return res

    mithal_all = parse_pairs_map(mithal_lines)
    # للأدوات الموجودة فقط
    nobtha_map = {t: extract_desc_from_buffer(nobtha_all.get(normalize_text(t), ''), 'نبذة') for t in known_titles}
    mithal_map = {t: extract_desc_from_buffer(mithal_all.get(normalize_text(t), ''), 'مثال') for t in known_titles}

    return hudud_map, nobtha_map, mithal_map, nobtha_all, mithal_all

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

# ------------- إضافة الأدوات الجديدة وتصنيفها -------------

def is_package_line(line: str) -> bool:
    s = re.sub(r'^[#*@\-\s]+', '', line or '')
    return bool(re.match(r'^(باقة|حزمة)\b', s))

def is_category_line(line: str) -> bool:
    s = re.sub(r'^[#*@\-\s]+', '', line or '')
    return bool(re.match(r'^(تصنيف|فئة|مجموعة|قسم|باب)\b', s))

def is_bot_header_line(line: str) -> bool:
    # Bots غالباً تسبقها # كعنوان
    return bool(re.match(r'^\s*#+\s*', line or ''))

def parse_hudud_structure(lines):
    """إرجاع هيكل: OrderedDict{ package -> OrderedDict{ category -> OrderedDict{ botTitle -> hudud_text } } }"""
    pkgs = OrderedDict()
    current_package = None
    current_category = None
    current_bot = None
    buffer = []

    def flush_bot():
        nonlocal buffer, current_package, current_category, current_bot
        if current_package and current_category and current_bot:
            text = '\n'.join(buffer).strip()
            pkgs.setdefault(current_package, OrderedDict())
            cats = pkgs[current_package]
            cats.setdefault(current_category, OrderedDict())
            bots = cats[current_category]
            bots[current_bot] = text
        buffer = []

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        # دعم صيغ: "العنوان الرئيسي: ..." و"العنوان الفرعي: ..."
        m = re.match(r'^\s*(العنوان\s*الرئيسي|العنوان\s*الفرعي)\s*[:：]\s*(.+)$', line)
        if m:
            label = m.group(1)
            value = normalize_text(m.group(2))
            if 'الرئيسي' in label:
                flush_bot()
                current_package = value
                current_category = None
                current_bot = None
            else:
                flush_bot()
                current_category = value or 'غير مصنف'
                current_bot = None
            continue
        if is_package_line(line):
            flush_bot()
            current_package = normalize_text(re.sub(r'^[#*@\-\s]+', '', line))
            current_category = None
            current_bot = None
            continue
        if is_category_line(line):
            flush_bot()
            current_category = normalize_text(re.sub(r'^[#*@\-\s]+', '', line))
            current_bot = None
            continue
        if is_bot_header_line(line):
            flush_bot()
            current_bot = normalize_text(re.sub(r'^\s*#+\s*', '', line))
            # Default category if missing
            if not current_category:
                current_category = 'غير مصنف'
            continue
        # otherwise, bot body
        if current_bot:
            buffer.append(line)

    flush_bot()
    return pkgs

def add_missing_tools(data, hudud_pkgs, nobtha_map, mithal_map):
    """يضيف البوتات غير الموجودة في JSON مع تصنيفها حسب هيكل حدود.docx"""
    # خرائط بحث سريعة للاسماء المعيارية
    def norm(s):
        return normalize_text(s or '')

    pkg_norm_to_obj = {}
    cat_norm_to_obj = {}
    bot_norms = set()

    max_pkg_id = 0
    for p in data.get('packages', []):
        max_pkg_id = max(max_pkg_id, int(p.get('packageId', 0) or 0))
        pkg_norm_to_obj[norm(p.get('package',''))] = p
        for c in p.get('categories', []):
            key = (norm(p.get('package','')), norm(c.get('category','')))
            cat_norm_to_obj[key] = c
            for b in c.get('bots', []):
                bot_norms.add(norm(b.get('botTitle','')))

    created = 0
    for pkg_name, cats in hudud_pkgs.items():
        pkg_key = norm(pkg_name)
        pkg_obj = pkg_norm_to_obj.get(pkg_key)
        if not pkg_obj:
            max_pkg_id += 1
            pkg_obj = {
                'package': pkg_name,
                'packageId': max_pkg_id,
                'categories': []
            }
            data.setdefault('packages', []).append(pkg_obj)
            pkg_norm_to_obj[pkg_key] = pkg_obj

        for cat_name, bots_map in cats.items():
            cat_key = (pkg_key, norm(cat_name))
            cat_obj = cat_norm_to_obj.get(cat_key)
            if not cat_obj:
                cat_obj = {
                    'category': cat_name,
                    'bots': []
                }
                pkg_obj['categories'].append(cat_obj)
                cat_norm_to_obj[cat_key] = cat_obj

            for bot_title, hudud_text in bots_map.items():
                bkey = norm(bot_title)
                if bkey in bot_norms:
                    # سيُحدّث لاحقاً عبر update_public_json
                    continue
                # إنشاء بوت جديد
                new_bot = {
                    'botTitle': bot_title,
                    'نبذة': nobtha_map.get(bot_title, ''),
                    'حدود': hudud_text or '',
                    'مثال': mithal_map.get(bot_title, '')
                }
                cat_obj['bots'].append(new_bot)
                bot_norms.add(bkey)
                created += 1

    return created

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

    # ابني الخرائط والنصوص
    hudud_map, nobtha_map, mithal_map, nobtha_all, mithal_all = build_maps(titles)

    # هيكل الحدود لتحديد الحِزم/الفئات/العناوين الجديدة
    hudud_lines = read_docx_lines(HUDUD_PATH)
    hudud_pkgs = parse_hudud_structure(hudud_lines)

    # أضف البوتات غير الموجودة
    created = add_missing_tools(data, hudud_pkgs, nobtha_all, mithal_all)

    # حدّث الموجود
    updated = update_public_json(data, hudud_map, nobtha_map, mithal_map)
    write_json(PUBLIC_JSON, data)
    print(f'Created: {created}, Updated: {updated}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
