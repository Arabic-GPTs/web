#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / 'public' / 'new_bots.json'

def load():
    with JSON_PATH.open('r', encoding='utf-8') as f:
        return json.load(f)

def truncate(s, n=120):
    s = (s or '').strip().replace('\n', ' ')
    return s if len(s) <= n else s[:n] + '…'

def main():
    data = load()
    total_bots = 0
    c_nobtha = c_hudud = c_mithal = 0
    samples = []

    for pkg in data.get('packages', []):
        for cat in pkg.get('categories', []):
            for bot in cat.get('bots', []):
                total_bots += 1
                nb = bool(bot.get('نبذة'))
                hd = bool(bot.get('حدود'))
                mt = bool(bot.get('مثال'))
                c_nobtha += 1 if nb else 0
                c_hudud += 1 if hd else 0
                c_mithal += 1 if mt else 0
                if len(samples) < 5 and (nb or hd or mt):
                    samples.append({
                        'botTitle': bot.get('botTitle',''),
                        'نبذة': truncate(bot.get('نبذة','')),
                        'حدود': truncate(bot.get('حدود','')),
                        'مثال': truncate(bot.get('مثال','')),
                    })

    print('JSON:', JSON_PATH)
    print('Bots total:', total_bots)
    print('نبذة (non-empty):', c_nobtha)
    print('حدود (non-empty):', c_hudud)
    print('مثال (non-empty):', c_mithal)
    print('\nSamples:')
    for s in samples:
        print('- ', s['botTitle'])
        if s['نبذة']:
            print('  نبذة:', s['نبذة'])
        if s['حدود']:
            print('  حدود:', s['حدود'])
        if s['مثال']:
            print('  مثال:', s['مثال'])

if __name__ == '__main__':
    main()

