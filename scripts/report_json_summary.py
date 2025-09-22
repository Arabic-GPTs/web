#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / 'public' / 'new_bots.json'

MODEL_KEYS = ["النموذج", "النماذج", "model", "models", "�?�?�?�?", "�?�?�?�?�?���?"]
ABOUT_KEYS = ["نبذة", "الوصف", "about", "description", "�?�?�?�?"]
LIMIT_KEYS = ["حدود", "الحدود", "القيود", "limits", "constraints", "�?�?�?�?"]
EXAMPLE_KEYS = ["مثال", "أمثلة", "الأمثلة", "example", "examples", "�?�?�?�?"]
URL_KEYS = ["الرابط", "رابط", "الرابط المباشر", "url", "link", "links", "primaryUrl", "primaryurl", "directurl"]


def load():
    with JSON_PATH.open('r', encoding='utf-8') as f:
        return json.load(f)


def truncate(s, n=120):
    s = (s or '').strip().replace('\n', ' ')
    return s if len(s) <= n else s[:n] + '...' 


def pick_value(obj, keys):
    for key in keys:
        if key in obj:
            val = obj[key]
            if isinstance(val, str):
                val = val.strip()
                if val:
                    return val
            elif isinstance(val, dict) and val:
                return val
    return None


def pick_models(bot):
    raw = pick_value(bot, MODEL_KEYS)
    if isinstance(raw, dict):
        cleaned = {}
        for k, v in raw.items():
            if isinstance(v, str):
                v = v.strip()
                if v:
                    cleaned[k] = v
        if cleaned:
            return cleaned
    elif isinstance(raw, str) and raw.strip():
        return {'4O': raw.strip()}

    for value in bot.values():
        if isinstance(value, dict) and any(isinstance(v, str) and v.strip().startswith('http') for v in value.values()):
            cleaned = {}
            for k, v in value.items():
                if isinstance(v, str):
                    v = v.strip()
                    if v:
                        cleaned[k] = v
            if cleaned:
                return cleaned
    return {}


def pick_text(bot, keys):
    val = pick_value(bot, keys)
    return val if isinstance(val, str) else ''


def pick_link(bot, models):
    direct = pick_text(bot, URL_KEYS)
    if direct:
        return direct
    for key in ('url', 'link', 'primaryUrl', 'primaryurl', 'directurl'):
        if key in bot and isinstance(bot[key], str):
            candidate = bot[key].strip()
            if candidate:
                return candidate
    for key in ('4O', '4o', '4o-mini', 'gpt-4o', 'gpt4o', '5', 'gpt-5', 'gpt5'):
        candidate = models.get(key, '').strip()
        if candidate:
            return candidate
    return ''


def main():
    data = load()
    total_bots = 0
    c_about = c_limits = c_example = 0
    c_links = 0
    missing_links = []
    samples = []

    for pkg in data.get('packages', []):
        for cat in pkg.get('categories', []):
            for bot in cat.get('bots', []):
                total_bots += 1
                about = pick_text(bot, ABOUT_KEYS)
                limits = pick_text(bot, LIMIT_KEYS)
                example = pick_text(bot, EXAMPLE_KEYS)
                models = pick_models(bot)
                link = pick_link(bot, models)

                if about:
                    c_about += 1
                if limits:
                    c_limits += 1
                if example:
                    c_example += 1
                if link:
                    c_links += 1
                elif len(missing_links) < 10:
                    missing_links.append(bot.get('botTitle', ''))

                if len(samples) < 5 and (about or limits or example):
                    samples.append({
                        'botTitle': bot.get('botTitle', ''),
                        'about': truncate(about),
                        'limits': truncate(limits),
                        'example': truncate(example),
                        'link': link or '(missing)'
                    })

    print('JSON:', JSON_PATH)
    print('Bots total:', total_bots)
    print('About (non-empty):', c_about)
    print('Limits (non-empty):', c_limits)
    print('Example (non-empty):', c_example)
    print('Bots with at least one link:', c_links)
    print('Bots missing links:', total_bots - c_links)
    if missing_links:
        print('\nMissing link samples:')
        for title in missing_links:
            print(' -', title)

    print('\nSamples:')
    for sample in samples:
        print('-', sample['botTitle'])
        if sample['about']:
            print('  About:', sample['about'])
        if sample['limits']:
            print('  Limits:', sample['limits'])
        if sample['example']:
            print('  Example:', sample['example'])
        if sample['link']:
            print('  Link:', sample['link'])


if __name__ == '__main__':
    main()
