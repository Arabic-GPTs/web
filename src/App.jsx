import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import bgVideoUrl from "../1080-60fps-ai.mp4";
// Use a base-aware public logo URL (SVG for crisp scaling on all DPIs)
const logoUrl = ((import.meta && import.meta.env && import.meta.env.BASE_URL) || "/") + "logo.svg";
import { BOOKS as STATIC_BOOKS, SERIES as STATIC_SERIES } from "./data/books.js";

// طھط±طھظٹط¨ ظ…ط®طµطµ ظ„ظ„ط¨ط§ظ‚ط§طھ ط¹ظ„ظ‰ ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
const PACKAGE_ORDER = [
    "ط¨ط§ظ‚ط© ط§ظ„ط¨ط§ط­ط«",
    "ط¨ط§ظ‚ط© طھظ†ظ…ظٹط© ط§ظ„ظ…ظ‡ط§ط±ط§طھ",
    "ط¨ط§ظ‚ط© ط§ظ„ط´ط±ظٹط¹ط© ظˆط§ظ„ظ‚ط§ظ†ظˆظ†",
    "ط¨ط§ظ‚ط© ط§ظ„ط¥ط¨ط¯ط§ط¹ ط§ظ„ط¥ط¹ظ„ط§ظ†ظٹ",
    "ط¨ط§ظ‚ط© ط§ظ„ط¥ط¨ط¯ط§ط¹ ط§ظ„ط¥ط¹ظ„ط§ظ…ظٹ",
    "ط¨ط§ظ‚ط© ط§ظ„ظ…ط¬ط³ظ‘ظ…ط§طھ",
    "ط¨ط§ظ‚ط© ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚",
    "ط¨ط§ظ‚ط© ط§ظ„طµط­ط©",
    "ط¨ط§ظ‚ط© طھظƒظˆظٹظ† ط§ظ„ظ†ظ…ط§ط°ط¬",
];
const PACKAGE_ORDER_INDEX = new Map(PACKAGE_ORDER.map((name, i) => [name, i]));
const PACKAGE_KEYWORDS = [
    "ط§ظ„ط¨ط§ط­ط«",
    "طھظ†ظ…ظٹط© ط§ظ„ظ…ظ‡ط§ط±ط§طھ",
    "ط§ظ„ط´ط±ظٹط¹ط© ظˆط§ظ„ظ‚ط§ظ†ظˆظ†",
    "ط§ظ„ط¥ط¨ط¯ط§ط¹ ط§ظ„ط¥ط¹ظ„ط§ظ†ظٹ",
    "ط§ظ„ط¥ط¨ط¯ط§ط¹ ط§ظ„ط¥ط¹ظ„ط§ظ…ظٹ",
    "ط§ظ„ظ…ط¬ط³ظ‘ظ…ط§طھ",
    "ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚",
    "ط§ظ„طµط­ط©",
    "طھظƒظˆظٹظ† ط§ظ„ظ†ظ…ط§ط°ط¬",
];
const norm = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
const stripTashkeel = (s) => s.replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, "");
// Sanitize user-provided text inputs (keeps Arabic; strips control chars; clamps length)
const sanitizeText = (s, max = 200) => {
    try {
        const t = (s ?? "").toString();
        return t.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
    } catch { return ""; }
};
// Basic allowlist URL check (http/https only)
const isSafeUrl = (url) => {
    try {
        const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'about:blank');
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
};
const toSafeUrl = (value) => {
    try {
        const trimmed = (value ?? '').toString().trim();
        if (!trimmed) return '';
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : '';
    } catch { return ''; }
};

const formatModelLabel = (name) => {
    try {
        const raw = (name ?? '').toString();
        const lower = raw.toLowerCase();
        if (!lower) return raw;
        if (['4o', 'gpt-4o', 'gpt4o'].includes(lower)) return '4o';
        if (['4o-mini', 'gpt-4o-mini', 'gpt4o-mini'].includes(lower)) return '4o-mini';
        if (['5', 'gpt-5', 'gpt5'].includes(lower)) return 'GPT-5';
        if (lower.startsWith('link')) {
            const match = lower.match(/link[-_]?(\d+)/);
            return match && match[1] ? `رابط ${match[1]}` : 'رابط';
        }
        return raw;
    } catch {
        return name;
    }
};

// Arabic-insensitive normalization for search
const normalizeAr = (s) => stripTashkeel((s || "").toString()).toLowerCase();
const tokenize = (s) => normalizeAr(s).trim().split(/\s+/).filter(Boolean);
const getPkgOrder = (name) => {
    const n = stripTashkeel(norm(name));
    if (PACKAGE_ORDER_INDEX.has(n)) return PACKAGE_ORDER_INDEX.get(n);
    for (let i = 0; i < PACKAGE_KEYWORDS.length; i++) {
        const kw = PACKAGE_KEYWORDS[i];
        if (n.includes(kw) || n.includes(kw.replace("ط§ظ„ظ…ط¬ط³ظ‘ظ…ط§طھ", "ط§ظ„ظ…ط¬ط³ظ…ط§طھ"))) return i;
    }
    return Number.POSITIVE_INFINITY;
};

const normalizeKeyName = (key) =>
    stripTashkeel((key || '').toString())
        .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '')
        .toLowerCase();

const buildAlias = (values) => {
    const raw = new Set();
    const normalized = new Set();
    for (const value of values) {
        if (!value) continue;
        raw.add(value);
        const norm = normalizeKeyName(value);
        if (!norm) continue;
        normalized.add(norm);
        const stripped = norm.replace(/[0-9a-z]+$/g, '');
        if (stripped && stripped !== norm) normalized.add(stripped);
    }
    return { raw, normalized };
};

const KEY_ALIAS = {
    models: buildAlias([
        '???????',
        '???????',
        '?????',
        '?????',
        '???????4o',
        '???????5',
        '??????????????',
        '??????????????',
        'model',
        'models',
    ]),
    about: buildAlias([
        '????',
        '?????',
        '????? ???????',
        '??????',
        '????????',
        'about',
        'description',
    ]),
    limits: buildAlias([
        '????',
        '??????',
        '??????',
        '????',
        '????????',
        '????????????',
        'limits',
        'constraints',
    ]),
    example: buildAlias([
        '????',
        '?????',
        '???????',
        '?????',
        '????????',
        '???????',
        'example',
        'examples',
    ]),
    url: buildAlias([
        '??????',
        '????',
        '?????? ???????',
        '?????? ???????',
        '?????? ???????',
        '?????? ???????',
        '????????????',
        '????????',
        '??????????????????????????',
        '???????????? ??????????????',
        'href',
        'url',
        'link',
        'links',
        'primaryurl',
        'primaryUrl',
        'directurl',
    ]),
};
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const pickVariantValue = (source, alias, fallback) => {
    if (!source || typeof source !== 'object') return undefined;
    const keys = Object.keys(source);
    for (const key of keys) {
        if (!hasOwn(source, key)) continue;
        const value = source[key];
        if (value === undefined || value === null) continue;
        const normalizedKey = normalizeKeyName(key);
        if ((alias?.raw && alias.raw.has(key)) || (alias?.normalized && alias.normalized.has(normalizedKey))) {
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) return trimmed;
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    if (value.length) return value;
                } else if (Object.keys(value).length) {
                    return value;
                }
            } else {
                return value;
            }
        }
    }
    if (fallback === 'object-with-url') {
        for (const key of keys) {
            if (!hasOwn(source, key)) continue;
            const value = source[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const cleaned = {};
                for (const [k, v] of Object.entries(value)) {
                    const safe = toSafeUrl(v);
                    if (safe) cleaned[k] = safe;
                }
                if (Object.keys(cleaned).length) return cleaned;
            }
        }
    } else if (fallback === 'string-with-http') {
        for (const key of keys) {
            if (!hasOwn(source, key)) continue;
            const value = source[key];
            const safe = toSafeUrl(value);
            if (safe) return safe;
        }
    }
    return undefined;
};

const normalizeModels = (bot) => {
    const raw = pickVariantValue(bot, KEY_ALIAS.models, 'object-with-url');
    if (typeof raw === 'string') {
        const safe = toSafeUrl(raw);
        return safe ? { '4O': safe } : {};
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const cleaned = {};
        for (const [key, val] of Object.entries(raw)) {
            const safe = toSafeUrl(val);
            if (safe) cleaned[key] = safe;
        }
        return cleaned;
    }
    return {};
};

const normalizeTextField = (bot, alias, minLength = 0) => {
    const raw = pickVariantValue(bot, alias);
    if (typeof raw === 'string') return raw;
    if (minLength > 0 && bot && typeof bot === 'object') {
        for (const [key, value] of Object.entries(bot)) {
            if (key === 'botTitle') continue;
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.length >= minLength) return trimmed;
            }
        }
    }
    return '';
};

const normalizeLinkField = (bot) => {
    const raw = pickVariantValue(bot, KEY_ALIAS.url, 'string-with-http');
    return toSafeUrl(raw);
};

const firstNonEmptyString = (...values) => {
    for (const value of values) {
        const safe = toSafeUrl(value);
        if (safe) return safe;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        }
    }
    return '';
};

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
//  Bots Hub â€” 2025 Reactive Concept (RTL)
//  â€¢ TailwindCSS for styling
//  â€¢ Framer Motion for micro-animations
//  â€¢ Command Palette (Ctrl/Cmd + K)
//  â€¢ Responsive: Desktop / iPad / Mobile
// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

// ظپط¦ط§طھ ط§ظپطھط±ط§ط¶ظٹط© (ظ„ظ† طھظڈط³طھط®ط¯ظ… ط¥ط°ط§ طھظ… طھظˆظ„ظٹط¯ظ‡ط§ ظ…ظ† JSON)
const CATEGORIES = [
    "ط§ظ„ظƒظ„",
    "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ",
    "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©",
    "ط§ظ„طھطµظ…ظٹظ… ظˆط§ظ„ط¥ط¨ط¯ط§ط¹",
    "ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚",
];

const SORTS = [
    { id: "popular", label: "ط§ظ„ط£ظƒط«ط± ط§ط³طھط®ط¯ط§ظ…ظ‹ط§" },
    { id: "new", label: "ط§ظ„ط£ط­ط¯ط«" },
    { id: "az", label: "ط£ط¨ط¬ط¯ظٹظ‹ط§" },
];

// ط±ظˆط§ط¨ط· ط£ظˆظ„ظٹط© طھط¬ط±ظٹط¨ظٹط© â€” طھظڈط³طھط®ط¯ظ… ظƒط§ط­طھظٹط§ط·ظٹ ظ…ط¤ظ‚طھ
const BOTS = [
    {
        id: "gpts-portal",
        title: "GPTs â€” ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط°ظƒظٹط©",
        category: "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©",
        tags: ["ط¹ط§ظ…", "طھط¬ظ…ظٹط¹ط©"],
        url:
            "https://chatgpt.com/g/g-681f47498138819197d357982c29544c-nmdhj-jy-by-ty-ldhky-custom-gpts?model=gpt-4o",
        badge: "ظ…ط¬ط§ظ†ظٹ",
        accent: "from-lime-400 to-emerald-500",
        score: 96,
        date: 20240710,
    },
    {
        id: "research-title",
        title: "ط§ظ‚طھط±ط§ط­ ط¹ظ†ظˆط§ظ† ظˆظپظƒط±ط© ط¨ط­ط«",
        category: "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ",
        tags: ["ط¹ظ†ط§ظˆظٹظ†", "ط§ط¨طھظƒط§ط±"],
        url:
            "https://chatgpt.com/g/g-686b8ac963248191b35f6c4d8629e688-qtrh-nwyn-bhthy-suggesting-research-titles",
        badge: "ظ…ظ…ظٹط²",
        accent: "from-violet-500 to-fuchsia-500",
        score: 91,
        date: 20240716,
    },
    {
        id: "research-plan",
        title: "طµظ†ط§ط¹ط© ط§ظ„ط®ط·ط© ط§ظ„ط¨ط­ط«ظٹط©",
        category: "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ",
        tags: ["ظ…ظ†ظ‡ط¬ظٹط©", "طھظˆط«ظٹظ‚"],
        url:
            "https://chatgpt.com/g/g-683d09bea51c8191b7688edadeef821d-bwt-sn-lkht-lbhthy",
        badge: "ظ…ط¯ظپظˆط¹",
        accent: "from-amber-400 to-orange-500",
        score: 88,
        date: 20240712,
    },
    {
        id: "copy-guru",
        title: "ظ…ط­ط±ظ‘ط± ظ†طµظˆطµ ط¹ط±ط¨ظٹ ظپط§ط¦ظ‚",
        category: "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©",
        tags: ["طھط­ط±ظٹط±", "طµظٹط§ط؛ط©"],
        url: "#",
        badge: "ظ‚ط±ظٹط¨ظ‹ط§",
        accent: "from-sky-400 to-cyan-500",
        score: 82,
        date: 20240802,
    },
    {
        id: "design-muse",
        title: "ظ…ط³ط§ط¹ط¯ ط§ظ„طھطµظ…ظٹظ… ط§ظ„ط¥ط¨ط¯ط§ط¹ظٹ",
        category: "ط§ظ„طھطµظ…ظٹظ… ظˆط§ظ„ط¥ط¨ط¯ط§ط¹",
        tags: ["ط£ظپظƒط§ط±", "ظˆط§ط¬ظ‡ط§طھ"],
        url: "#",
        badge: "طھط¬ط±ظٹط¨ظٹ",
        accent: "from-rose-500 to-pink-500",
        score: 85,
        date: 20240812,
    },
    {
        id: "market-brain",
        title: "ظ…ط³ط§ط¹ط¯ ط§ظ„طھط³ظˆظٹظ‚ ط§ظ„ط°ظƒظٹ",
        category: "ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚",
        tags: ["طھط­ظ„ظٹظ„", "ط±ط³ط§ط¦ظ„"],
        url: "#",
        badge: "ظ…ظ…ظٹط²",
        accent: "from-teal-400 to-emerald-500",
        score: 89,
        date: 20240901,
    },
];

// طھط¯ط±ظ‘ط¬ط§طھ ط£ظ„ظˆط§ظ† ط§ظپطھط±ط§ط¶ظٹط© ظ…طھظ†ظˆط¹ط© ظ„طھظ…ظٹظٹط² ط§ظ„ط¨ط·ط§ظ‚ط§طھ
const ACCENTS = [
    "from-lime-400 to-emerald-500",
    "from-violet-500 to-fuchsia-500",
    "from-amber-400 to-orange-500",
    "from-sky-400 to-cyan-500",
    "from-rose-500 to-pink-500",
    "from-teal-400 to-emerald-500",
    "from-indigo-400 to-blue-500",
    "from-zinc-400 to-gray-600",
];

// طھط¹ظٹظٹظ†ط§طھ ط£ظ„ظˆط§ظ† ظ…ط®طµظ‘طµط© ظ„ط¨ط¹ط¶ ط§ظ„ظپط¦ط§طھ ط§ظ„ط´ط§ط¦ط¹ط©
const CATEGORY_ACCENTS = {
    "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ": "from-violet-500 to-fuchsia-500",
    "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©": "from-lime-400 to-emerald-500",
    "ط§ظ„طھطµظ…ظٹظ… ظˆط§ظ„ط¥ط¨ط¯ط§ط¹": "from-rose-500 to-pink-500",
    "ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚": "from-amber-400 to-orange-500",
    "ط¨ط§ظ‚ط© ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚": "from-teal-400 to-emerald-500",
    "ط¨ط§ظ‚ط© ط§ظ„ط£ظ†ط¸ظ…ط© ظˆط§ظ„ظ‚ظˆط§ظ†ظٹظ†": "from-zinc-400 to-gray-600",
    "ط؛ظٹط± ظ…طµظ†ظ‘ظپ": "from-zinc-400 to-gray-600",
};

// ط§ط®طھظٹط§ط± ط«ط§ط¨طھ ظ„ظ„طھط¯ط±ظ‘ط¬ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ظپط¦ط© (ظ…ط¹ طھط¬ط²ط¦ط© ظ…ط³طھظ‚ط±ط© ظ„ظ„ظپط¦ط§طھ ط؛ظٹط± ط§ظ„ظ…ط¹ط±ظ‘ظپط©)
const pickAccentByCategory = (category) => {
    const c = (category || "").toString().trim();
    if (CATEGORY_ACCENTS[c]) return "from-nvidia-600 via-emerald-500 to-nvidia-600";
    // طھط¬ط²ط¦ط© ط¨ط³ظٹط·ط© ظˆط«ط§ط¨طھط© ظ„ط¥ط³ظ†ط§ط¯ ظ„ظˆظ† ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط©
    let hash = 0;
    for (let i = 0; i < c.length; i++) {
        hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
    }
    return "from-nvidia-600 via-emerald-500 to-nvidia-600";
};

// ظ…ط³ط§ط¹ط¯ ظ„ط¥ط±ط¬ط§ط¹ ظ„ظˆظ† ط§ظ„ط¨ط·ط§ظ‚ط© ط¯ط§ط¦ظ…ظ‹ط§ ط­ط³ط¨ ط§ظ„ظپط¦ط©
const getAccent = (b) => pickAccentByCategory(b?.category);

const fmt = (n) => new Intl.NumberFormat("ar-SA").format(n);

const CATEGORY_ICONS = {
    "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2a7 7 0 00-7 7v2H4a2 2 0 00-2 2v7h20v-7a2 2 0 00-2-2h-1V9a7 7 0 00-7-7zm-5 9V9a5 5 0 0110 0v2H7zm-3 2h16v5H4v-5z" /></svg>
    ),
    "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" /></svg>
    ),
    "ط§ظ„طھطµظ…ظٹظ… ظˆط§ظ„ط¥ط¨ط¯ط§ط¹": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2l9 4-9 4-9-4 9-4zm9 7l-9 4-9-4v7l9 4 9-4V9z" /></svg>
    ),
    "ط§ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„طھط³ظˆظٹظ‚": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M3 13h18v2H3v-2zm0 4h12v2H3v-2zM3 5h18v6H3V5z" /></svg>
    ),
    "ط¨ط§ظ‚ط© ط§ظ„ط£ظ†ط¸ظ…ط© ظˆط§ظ„ظ‚ظˆط§ظ†ظٹظ†": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M6 2h12v2H6V2zM4 6h16v14H4V6zm2 2v10h12V8H6z" /></svg>
    ),
    default: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
    ),
};

export default function App() {
    // ط§ظ„ط­ط§ظ„ط© ط§ظ„ط¹ط§ظ…ط©
    const [route, setRoute] = useState((typeof window !== "undefined" && window.location.hash.replace("#", "")) || "/");
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("ط§ظ„ظƒظ„");
    const [sort, setSort] = useState(SORTS[0].id);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [bots, setBots] = useState(BOTS);
    const [botModal, setBotModal] = useState(null); // { type, bot }

    // طھظ… ط¥ط²ط§ظ„ط© ظ…ظƒظˆظ†ط§طھ ط§ظ„ظ…ظپط¶ظ„ط© ظˆط§ظ„ظˆط³ظˆظ… ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©
    // ط·ظٹ/ظپطھط­ ط§ظ„ظ‚ظˆط§ط¦ظ… ط§ظ„ظ…ظ…طھط¯ط© (ظ…ط­ظپظˆط¸ط©)
    const [catsExpanded, setCatsExpanded] = useState(() => {
        try {
            const v = localStorage.getItem('bots:catsExpanded');
            if (v != null) return v === '1';
            // ط§ظپطھط±ط§ط¶ظٹظ‹ط§: ظ…ظپطھظˆط­ ط¹ظ„ظ‰ ط³ط·ط­ ط§ظ„ظ…ظƒطھط¨طŒ ظ…ط·ظˆظٹ ط¹ظ„ظ‰ ط§ظ„ط¬ظˆط§ظ„
            if (typeof window !== 'undefined' && window.matchMedia) {
                return window.matchMedia('(min-width: 768px)').matches;
            }
            return true;
        } catch { return true; }
    });
    // ظ„ط§ طھظˆط¬ط¯ ظˆط³ظˆظ…طŒ ظ„ط°ط§ ظ„ط§ ط­ط§ط¬ط© ظ„ظ‚ظٹط§ط³ط§طھ ط®ط§طµط© ط¨ظ‡ط§

    // Toast ط±ط³ط§ظ„ط© ط¹ط§ط¨ط±ط© (ظ…ط«ظ„ط§ظ‹: طھظ… ظ†ط³ط® ط§ظ„ط±ط§ط¨ط·)
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    // Safe external opener with simple feedback
    const openExternal = (url) => {
        try { clearTimeout(toastTimerRef.current); } catch {}
        const safe = toSafeUrl(url);
        if (!safe) {
            setToast('???????? ?????? ????????');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            return;
        }
        try { window.open(safe, '_blank', 'noopener,noreferrer'); } catch { }
    };

    // Accordion state for packages (collapsed by default)
    const [expandedPkgs, setExpandedPkgs] = useState(() => {
        try {
            const raw = localStorage.getItem('bots:expandedPkgs');
            const arr = raw ? JSON.parse(raw) : [];
            return new Set(Array.isArray(arr) ? arr : []);
        } catch {
            return new Set();
        }
    });
    const togglePkg = (key) => {
        setExpandedPkgs((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };
    useEffect(() => {
        try {
            localStorage.setItem('bots:expandedPkgs', JSON.stringify(Array.from(expandedPkgs)));
        } catch {}
    }, [expandedPkgs]);

    // (ط§ظ„ظ…ظپط¶ظ„ط© ط£ط²ظٹظ„طھ)

    // طھط­ظ…ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ظ† public/new_bots.json (ظ‡ظٹظƒظ„ ط­ظگط²ظژظ… â†’ ظپط¦ط§طھ â†’ ط¨ظˆطھط§طھ)
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/";
                const res = await fetch(`${base}new_bots.json`, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                // طھط·ط¨ظٹط¹ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¥ظ„ظ‰ ظ…طµظپظˆظپط© ظ…ط³ط·ط­ط© ظ…ط¹ ط§ظ„ط§ط­طھظپط§ط¸ ط¨ط§ظ„ط­ط²ظ…ط© ظˆط§ظ„ظپط¦ط© ظˆظ†ظ…ط§ط°ط¬ ط§ظ„ط±ظˆط§ط¨ط·
                const flat = [];
                const pkgs = Array.isArray(data?.packages) ? data.packages : [];
                for (const pkg of pkgs) {
                    const packageName = (pkg?.package || "").toString().trim() || "ط­ط²ظ…ط©";
                    const packageTitle = (pkg?.packageTitle || pkg?.title || packageName).toString().trim();
                    const packageId = pkg?.packageId ?? undefined;
                    const cats = Array.isArray(pkg?.categories) ? pkg.categories : [];
                    for (const catObj of cats) {
                        const category = (catObj?.category || "").toString().trim() || "ط؛ظٹط± ظ…طµظ†ظ‘ظپ";
                        const botsArr = Array.isArray(catObj?.bots) ? catObj.bots : [];
                        for (let i = 0; i < botsArr.length; i++) {
                            const b = botsArr[i] || {};
                            const title = (b?.botTitle || b?.title || "").toString().trim() || `ط¨ظˆطھ ${i + 1}`;
                            const models = normalizeModels(b);
                            const about = normalizeTextField(b, KEY_ALIAS.about, 24);
                            const limits = normalizeTextField(b, KEY_ALIAS.limits, 8);
                            const example = normalizeTextField(b, KEY_ALIAS.example, 8);
                            const fallbackLinks = Array.isArray(b?.linksList) ? b.linksList : [];
                            const canonicalModels = { ...models };
                            fallbackLinks.forEach((link, linkIndex) => {
                                const key = `link-${linkIndex + 1}`;
                                if (!canonicalModels[key]) {
                                    canonicalModels[key] = link;
                                }
                            });
                            for (const key in canonicalModels) {
                                if (!hasOwn(canonicalModels, key)) continue;
                                const safe = toSafeUrl(canonicalModels[key]);
                                if (safe) {
                                    canonicalModels[key] = safe;
                                } else {
                                    delete canonicalModels[key];
                                }
                            }
                            const normalizedModelEntries = Object.entries(canonicalModels)
                                .map(([model, url]) => [model, toSafeUrl(url)])
                                .filter(([, url]) => !!url);
                            const chatModelNames = new Set(['4o', 'gpt-4o', 'gpt4o', '4o-mini', '5', 'gpt-5', 'gpt5']);
                            const hasMultipleModels = normalizedModelEntries.length > 1;
                            const primaryLink = toSafeUrl(b?.url);
                            const fallbackModelLink = normalizedModelEntries[0]?.[1] || '';
                            const launchLink = primaryLink || fallbackModelLink;
                            const hasChatModels = normalizedModelEntries.some(([model]) => chatModelNames.has((model || '').toLowerCase()));
                            const launchHost = (() => {
                                try {
                                    return launchLink ? new URL(launchLink).hostname || '' : '';
                                } catch { return ''; }
                            })();
                            const isChatGPTLaunch = launchHost.endsWith('chatgpt.com');
                            const buttonLabel = (() => {
                                if (hasMultipleModels) {
                                    return hasChatModels ? 'اختيار النموذج' : 'عرض الروابط';
                                }
                                if (launchLink) {
                                    return isChatGPTLaunch ? 'تشغيل في ChatGPT' : 'فتح الرابط';
                                }
                                return 'غير متاح';
                            })();
                            const canLaunch = hasMultipleModels || Boolean(launchLink);
                            const copyDisabled = !launchLink;
                            const hasLink = Boolean(launchLink);
                            const accent = pickAccentByCategory(category);
                            const id = `${(packageName || 'pkg').replace(/\s+/g, '-')}-${(category || 'cat').replace(/\s+/g, '-')}-${i}`;
                            flat.push({
                                id,
                                title,
                                package: packageName,
                                packageTitle,
                                packageId,
                                category,
                                accent,
                                url: safeUrl,
                                hasLink,
                                models: canonicalModels,
                                about,
                                limits,
                                example,
                                tags: [],
                                badge: '',
                                score: 0,
                                date: 0,
                            });
                        }
                    }
                }

                const normalized = flat.length ? flat : BOTS;
                if (isMounted) setBots(normalized);
            } catch (err) {
                console.error("Failed to load new_bots.json:", err);
                // ظ†ط¨ظ‚ظٹ ط¹ظ„ظ‰ ط§ظ„ط§ط­طھظٹط§ط·ظٹ BOTS ط¥ط°ط§ ظپط´ظ„ ط§ظ„طھط­ظ…ظٹظ„
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    // ظ…ط­ط§ظˆظ„ط© طھظپط¹ظٹظ„ ط§ظ„طھط®ط²ظٹظ† ط§ظ„ط¯ط§ط¦ظ… ظ„ظ„ظ…طھطµظپط­ ظ„طھظ‚ظ„ظٹظ„ ظ…ط³ط­ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط­ظ„ظٹط©
    useEffect(() => {
        try {
            if (navigator?.storage?.persist) navigator.storage.persist();
        } catch { }
    }, []);

    // ط­ظپط¸ ظˆط§ط³طھط¹ط§ط¯ط© ط­ط§ظ„ط© ط§ظ„ظˆط§ط¬ظ‡ط© (ط¨ط­ط«/ظپط¦ط©/طھط±طھظٹط¨)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("bots:ui");
            if (!raw) return;
            const s = JSON.parse(raw);
            if (typeof s.q === "string") setQ(s.q);
            if (typeof s.cat === "string") setCat(s.cat);
            if (typeof s.sort === "string") {
                const ok = (Array.isArray(SORTS) ? SORTS : []).some((x) => x.id === s.sort);
                setSort(ok ? s.sort : SORTS[0].id);
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem("bots:ui", JSON.stringify({ q, cat, sort }));
        } catch { }
    }, [q, cat, sort]);

    // ط­ظپط¸ ط­ط§ظ„ط© ط§ظ„ط·ظٹظ‘ ظ„ظ„ظپط¦ط§طھ
    useEffect(() => {
        try {
            localStorage.setItem('bots:catsExpanded', catsExpanded ? '1' : '0');
        } catch { }
    }, [catsExpanded]);

    // طھظˆظ„ظٹط¯ ط´ط±ط§ط¦ط­ ط§ظ„ظپط¦ط§طھ ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط­ظ…ظ‘ظ„ط©
    const categories = useMemo(() => {
        const set = new Set();
        for (const b of bots) {
            const c = (b?.category || "").toString().trim();
            if (c) set.add(c);
        }
        const arr = Array.from(set);
        arr.sort((a, b) => a.localeCompare(b));
        return ["ط§ظ„ظƒظ„", ...arr];
    }, [bots]);

    // ط¹ط¯ظ‘ط§ط¯ط§طھ ظ„ظ„ظپط¦ط§طھ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط¨ط­ط« + ط§ظ„ظ…ظپط¶ظ„ط©
    const categoryCounts = useMemo(() => {
        const counts = new Map();
        const tokens = tokenize(q);
        let base = bots;
        if (tokens.length) {
            base = base.filter((b) => {
                const title = normalizeAr(b.title);
                const catL = normalizeAr(b.category || "");
                return tokens.every((tok) => title.includes(tok) || catL.includes(tok));
            });
        }
        for (const b of base) {
            const c = (b?.category || "").toString().trim() || "ط؛ظٹط± ظ…طµظ†ظ‘ظپ";
            counts.set(c, (counts.get(c) || 0) + 1);
        }
        return counts;
    }, [bots, q]);


    // طھط£ظƒظٹط¯ طµظ„ط§ط­ظٹط© ط§ظ„ظپظ„طھط± ط§ظ„ط­ط§ظ„ظٹ ط¹ظ†ط¯ طھط؛ظٹظ‘ط± ط§ظ„ط´ط±ط§ط¦ط­
    useEffect(() => {
        if (!categories.includes(cat)) setCat("ط§ظ„ظƒظ„");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories]);

    // ط´ط±ظٹط· طھظ‚ط¯ظ‘ظ… ط§ظ„طھظ…ط±ظٹط±
    useEffect(() => {
        const onScroll = () => {
            const h = document.documentElement;
            const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
            setProgress(p);
        };
        document.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => document.removeEventListener("scroll", onScroll);
    }, []);

    // طھظ…طھ ط¥ط²ط§ظ„ط© ط§ظ„ظˆط³ظˆظ…ط› ظ„ط§ ط­ط§ط¬ط© ظ„ظ„ظ‚ظٹط§ط³ط§طھ ط§ظ„ط®ط§طµط© ط¨ظ‡ط§

    // ظ„ظˆط­ط© ط§ظ„ط£ظˆط§ظ…ط± (ط§ط®طھطµط§ط±ط§طھ)
    useEffect(() => {
        const onKey = (e) => {
            const isK = e.key === "k" || e.key === "K";
            const meta = e.ctrlKey || e.metaKey;
            if (meta && isK) {
                e.preventDefault();
                setPaletteOpen((v) => !v);
            }
            if (paletteOpen) {
                if (e.key === "Escape") setPaletteOpen(false);
                if (e.key === "ArrowDown")
                    setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
                if (e.key === "ArrowUp")
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                if (e.key === "Enter") {
                    const item = filtered[selectedIndex];
                    if (item) openExternal(item.url);
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [paletteOpen]); // eslint-disable-line

    // ظ…ط¨ط¯ظ‘ظ„ ظ…ط³ط§ط±ط§طھ ط¨ط³ظٹط· ط¹ط¨ط± hash
    useEffect(() => {
        const sync = () => {
            const h = window.location.hash.replace("#", "") || "/";
            setRoute(h);
        };
        window.addEventListener("hashchange", sync);
        sync();
        return () => window.removeEventListener("hashchange", sync);
    }, []);

    // طھطµظپظٹط©/طھط±طھظٹط¨
    const filtered = useMemo(() => {
        const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let rows = bots.filter((b) => (cat === "ط§ظ„ظƒظ„" ? true : b.category === cat));
        if (tokens.length) {
            rows = rows.filter((b) => {
                const title = b.title.toLowerCase();
                const catL = (b.category || "").toLowerCase();
                return tokens.every((tok) => title.includes(tok) || catL.includes(tok));
            });
        }
        if (sort === "popular") rows.sort((a, b) => b.score - a.score);
        if (sort === "new") rows.sort((a, b) => b.date - a.date);
        if (sort === "az") rows.sort((a, b) => a.title.localeCompare(b.title));
        return rows;
    }, [q, cat, sort, bots]);

    // Titles list for datalist suggestions
    const botTitles = useMemo(() => {
        try {
            const set = new Set(bots.map((b) => (b.title || '').toString().trim()).filter(Boolean));
            return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
        } catch { return []; }
    }, [bots]);

    // ط£ط¯ظˆط§طھ ظ…ط³ط§ط¹ط¯ط©: طھظ‡ظٹط¦ط© ط§ظ„ط§طھطµط§ظ„ ظˆظ†ط³ط® ط§ظ„ط±ط§ط¨ط·
    const warmUp = (url) => {
        try {
            const safe = toSafeUrl(url);
            if (!safe) return;
            const u = new URL(safe);
            const origin = `${u.protocol}//${u.host}`;
            const pre = document.createElement("link");
            pre.rel = "preconnect";
            pre.href = origin;
            pre.crossOrigin = "anonymous";
            document.head.appendChild(pre);
            const pf = document.createElement("link");
            pf.rel = "prefetch";
            pf.href = safe;
            pf.as = "document";
            document.head.appendChild(pf);
        } catch { }
    };

    const copyLink = async (url) => {
        const safe = toSafeUrl(url);
        if (!safe) {
            try { clearTimeout(toastTimerRef.current); } catch {}
            setToast('???? ???????? ?????? ???????? ?????? ????????');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            return;
        }
        try {
            await navigator.clipboard.writeText(safe);
            try { clearTimeout(toastTimerRef.current); } catch {}
            setToast('???? ?????? ????????????');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
        } catch {
            try {
                const ta = document.createElement("textarea");
                ta.value = safe;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                try { clearTimeout(toastTimerRef.current); } catch {}
                setToast('???? ?????? ????????????');
                toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            } catch { }
        }
    };

    // طھط¬ظ…ظٹط¹ ظ‡ط±ظ…ظٹ: ط­ط²ظ…ط© â†گ ظپط¦ط© â†گ ط¨ظˆطھط§طھ
    const groupedPackages = useMemo(() => {
        // pkgMap: key -> { displayName, catMap }
        const pkgMap = new Map();
        for (const b of filtered) {
            const pkgKey = b.package || "ط­ط²ظ…ط©";
            const displayName = (b.packageTitle || pkgKey);
            const catName = b.category || "ط؛ظٹط± ظ…طµظ†ظ‘ظپ";
            if (!pkgMap.has(pkgKey)) pkgMap.set(pkgKey, { displayName, catMap: new Map() });
            const entry = pkgMap.get(pkgKey);
            if (!entry.displayName) entry.displayName = displayName;
            if (!entry.catMap.has(catName)) entry.catMap.set(catName, []);
            entry.catMap.get(catName).push(b);
        }
        // ط¥ظ„ظ‰ ظ…طµظپظˆظپط§طھ ظ…ط±طھط¨ط©
        const out = [];
        for (const [pkgKey, entry] of pkgMap.entries()) {
            const cats = [];
            for (const [catName, rows] of entry.catMap.entries()) {
                cats.push({ name: catName, accent: pickAccentByCategory(catName), rows });
            }
            cats.sort((a, b) => a.name.localeCompare(b.name));
            const pkgAccent = cats[0]?.accent || pickAccentByCategory(entry.displayName || pkgKey);
            out.push({ key: pkgKey, name: entry.displayName || pkgKey, accent: pkgAccent, cats });
        }
        // Sort packages by the custom Arabic order first, then alphabetically
        out.sort((a, b) => {
            const oa = getPkgOrder(a.name);
            const ob = getPkgOrder(b.name);
            if (oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name, 'ar');
        });
        return out;
    }, [filtered]);




    // ط®ظ„ظپظٹط© ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© (طھطھط¨ط¹ ط§ظ„ظ…ط¤ط´ط±)
    const bgRef = useRef(null);
    const [showTop, setShowTop] = useState(false);
    useEffect(() => {
        const el = bgRef.current;
        if (!el) return;
        const onMove = (e) => {
            const { innerWidth: w, innerHeight: h } = window;
            const x = e.clientX / w;
            const y = e.clientY / h;
            el.style.setProperty("--x", x);
            el.style.setProperty("--y", y);
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, []);
    useEffect(() => {
        const onWinScroll = () => setShowTop(window.scrollY > 300);
        window.addEventListener('scroll', onWinScroll, { passive: true });
        onWinScroll();
        return () => window.removeEventListener('scroll', onWinScroll);
    }, []);

    const isBooks = route === "/books";

    return (
        <div
            dir="rtl"
            lang="ar"
            className="relative min-h-screen bg-neutral-950 text-neutral-100 selection:bg-lime-300/30 selection:text-white theme-nvidia font-arabic"
            id="top"
        >
            {/* ط®ظ„ظپظٹط© ط³ط§ط¦ظ„ط© */}
            <div ref={bgRef} aria-hidden className="liquid-ether">
                <span className="blob b1" />
                <span className="blob b2" />
                <span className="blob b3" />
            </div>

            {/* ط´ط±ظٹط· طھظ‚ط¯ظ… ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط© */}
            <div
                className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-lime-300 via-emerald-400 to-lime-300 origin-left"
                style={{ transform: `scaleX(${progress})` }}
            />

            {/* ط±ط£ط³ ط²ط¬ط§ط¬ظٹ */}
            <header className="sticky top-0 z-40 backdrop-blur bg-neutral-900/40 border-b border-white/5">
                <div className="mx-auto max-w-7xl px-4 md:px-6">
                    <div className="flex items-center justify-between gap-3 py-4">
                        <div className="flex items-center gap-3">
                            <a href="#/" aria-label="ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©" className="inline-grid">
                            <motion.div
                                initial={{ opacity: 0.9, scale: 0.98 }}
                                animate={{ opacity: [0.9, 1, 0.9], scale: 1 }}
                                transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                                className="relative inline-grid w-12 h-12 md:w-14 md:h-14 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
                                aria-hidden
                            >
                                <img src={logoUrl} alt="ط§ظ„ط´ط¹ط§ط±" className="h-full w-full object-contain" />
                                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgba(163,230,53,0.15),transparent)]" />
                            </motion.div>
                            </a>
                            <a
                                href="mailto:zraieee@gmail.com"
                                target="_blank"
                                rel="noopener"
                                aria-label="Gmail"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="Gmail"
                            >
                                <i className="fa-solid fa-envelope fa-lg text-white"></i>
                            </a>
                            <a href="#/" className="focus:outline-none">
                            <strong className="text-lg md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text drop-shadow-[0_2px_6px_rgba(16,185,129,0.25)] animate-gradient-slow">
                                ط¨ظˆط§ط¨ط© ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط°ظƒظٹط©
                            </strong>
                            </a>
                            {/* ط¥ط¶ط§ظپط§طھ: ط¥ظ†ط³طھط؛ط±ط§ظ…طŒ ظپظٹط³ط¨ظˆظƒطŒ طھظٹظƒ طھظˆظƒطŒ ط¨ط±ظٹط¯طŒ PayPalطŒ ظ„ظٹظ†ظƒط¯ط¥ظ† */}
                            <a href="https://www.instagram.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="ط¥ظ†ط³طھط؛ط±ط§ظ…" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="ط¥ظ†ط³طھط؛ط±ط§ظ…">
                                <i className="fa-brands fa-instagram fa-lg text-white"></i>
                            </a>
                            <a href="https://www.facebook.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="ظپظٹط³ط¨ظˆظƒ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="ظپظٹط³ط¨ظˆظƒ">
                                <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                            </a>
                            <a href="https://www.tiktok.com/@alzarraei" target="_blank" rel="noopener" aria-label="طھظٹظƒ طھظˆظƒ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="طھظٹظƒ طھظˆظƒ">
                                <i className="fa-brands fa-tiktok fa-lg text-white"></i>
                            </a>
                            <a href="mailto:zraieee@gmail.com" target="_blank" rel="noopener" aria-label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ">
                                <i className="fa-solid fa-envelope fa-lg text-white"></i>
                            </a>
                            <a href="https://www.paypal.com/paypalme/zraiee" target="_blank" rel="noopener" aria-label="PayPal" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="PayPal">
                                <i className="fa-brands fa-paypal fa-lg text-white"></i>
                            </a>
                            <a href="https://www.linkedin.com/in/abdulrahman-alzarraei/" target="_blank" rel="noopener" aria-label="ظ„ظٹظ†ظƒط¯ط¥ظ†" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="ظ„ظٹظ†ظƒط¯ط¥ظ†">
                                <i className="fa-brands fa-linkedin-in fa-lg text-white"></i>
                            </a>
                            {/* طھط³ظ…ظٹط§طھ ظ†طµظٹط© طھط¸ظ‡ط± ط¹ظ„ظ‰ ط§ظ„ط´ط§ط´ط§طھ ط§ظ„ظƒط¨ظٹط±ط© ظپظ‚ط· */}
                            <div className="hidden xl:flex items-center gap-1 ml-2 text-[11px] text-white/60">
                                <span>ظˆط§طھط³ط§ط¨</span>
                                <span>آ· طھظٹظ„ظٹط؛ط±ط§ظ…</span>
                                <span>آ· ط¥ظ†ط³طھط؛ط±ط§ظ…</span>
                                <span>آ· ظپظٹط³ط¨ظˆظƒ</span>
                                <span>آ· X</span>
                                <span>آ· ظٹظˆطھظٹظˆط¨</span>
                                <span>آ· طھظٹظƒ طھظˆظƒ</span>
                                <span>آ· ط¨ط±ظٹط¯</span>
                                <span>آ· PayPal</span>
                                <span>آ· ظ„ظٹظ†ظƒط¯ط¥ظ†</span>
                            </div>
                        </div>
                        {/* ط£ط²ط±ط§ط± ط§ظ„ط´ط¨ظƒط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط© */}
                        <div className="flex items-center gap-0">
                            <span className="hidden md:inline text-xs text-white/70 mr-1">ظ‚ظ†ظˆط§طھظ†ط§ ط§ظ„ط±ط³ظ…ظٹط©</span>
                            <a
                                href="https://www.facebook.com/alzarraei.gpts/"
                                target="_blank"
                                rel="noopener"
                                aria-label="ظˆط§طھط³ط§ط¨"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="ط§ظ†ط¶ظ… ط¹ط¨ط± ظˆط§طھط³ط§ط¨"
                            >
                                <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                            </a>
                            <a
                                href="https://t.me/zraiee"
                                target="_blank"
                                rel="noopener"
                                aria-label="طھظٹظ„ظٹط؛ط±ط§ظ…"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="ظ‚ظ†ط§ط© طھظٹظ„ظٹط؛ط±ط§ظ…"
                            >
                                <i className="fa-brands fa-telegram fa-lg text-white"></i>
                            </a>
                            <a
                                href="https://x.com/Arab_Ai_"
                                target="_blank"
                                rel="noopener"
                                aria-label="ظ…ظ†طµط© ط¥ظƒط³"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="X (Twitter)"
                            >
                                <i className="fa-brands fa-x-twitter fa-lg text-white"></i>
                            </a>
                            <a
                                href="mailto:zraieee@gmail.com"
                                target="_blank"
                                rel="noopener"
                                aria-label="Gmail"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="Gmail"
                            >
                                <i className="fa-solid fa-envelope fa-lg text-white"></i>
                            </a>
                            <a
                                href="https://www.paypal.com/paypalme/zraiee"
                                target="_blank"
                                rel="noopener"
                                aria-label="ظٹظˆطھظٹظˆط¨"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                                title="ظٹظˆطھظٹظˆط¨"
                            >
                                <i className="fa-brands fa-paypal fa-lg text-white"></i>
                            </a>
                        </div>
                        {/* separator removed for a cleaner layout */}
                    </div>
                </div>
            </header>

            {/* ط´ط±ظٹط· طھظ†ظ‚ظ„ ظپط±ط¹ظٹ ط¨ظ†ظ…ط· Gooey */}
            <GooeyNav route={route} />

            {/* ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط±ط¦ظٹط³ظٹ ط­ط³ط¨ ط§ظ„ظ…ط³ط§ط± */}
            {route === "/" && (
                <>
                    {/* ط§ظ„ط¨ط·ظ„ */}
                    <section className="relative mx-auto max-w-7xl px-4 md:px-6 pt-12 md:pt-18">
                        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
                            <div className="md:col-span-7">
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: [0.96, 1, 0.96], y: 0 }}
                                    transition={{ duration: 0.6, ease: "easeOut", opacity: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }}
                                    className="text-3xl/tight md:text-5xl/tight font-bold tracking-[-0.02em] bg-gradient-to-r from-neutral-50 via-lime-200 to-neutral-200 bg-clip-text text-transparent drop-shadow animate-gradient-slow"
                                >
                                    ظ…ظ†طµظ‘ط© ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط°ظƒظٹط© â€” ط·ظˆظ‘ط± ط£ط¯ط§ط،ظƒ ط¨ط¥طھظ‚ط§ظ†
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: [0.92, 1, 0.92], y: 0 }}
                                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }}
                                    className="mt-3 md:mt-4 max-w-2xl text-sm md:text-base bg-gradient-to-r from-neutral-300 via-white to-neutral-300 bg-clip-text text-transparent animate-gradient-slow"
                                >
                                    ظˆط§ط¬ظ‡ط§طھ ط£ظ†ظٹظ‚ط© ظˆطھظپط§ط¹ظ„ط§طھ ط³ظ„ط³ط© طھط³ط§ط¹ط¯ظƒ ط¹ظ„ظ‰ ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ظ†ظ…ظˆط°ط¬ ط§ظ„ظ…ظ†ط§ط³ط¨ ط¨ط³ط±ط¹ط© â€” ط¨ط­ط« ظ„ط­ط¸ظٹطŒ طھطµظپظٹط© ظ…طھظ‚ط¯ظ‘ظ…ط©طŒ ظˆظ„ظˆط­ط© ط£ظˆط§ظ…ط± طھظپطھط­ ط£ظٹ ط¨ظˆطھ ط¨ط¶ط؛ط·ط©.
                                </motion.p>
                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <a
                                        href="#"
                                        className="nv-btn text-sm"
                                    >
                                        ط§ط³طھظƒط´ط§ظپ ط§ظ„ط¨ظˆطھط§طھ
                                    </a>
                                    <button
                                        onClick={() => setPaletteOpen(true)}
                                        className="nv-btn-ghost text-sm"
                                    >
                                        ظپطھط­ ط§ظ„ط¨ط­ط« ط§ظ„ط³ط±ظٹط¹
                                    </button>
                                </div>
                            </div>

                            {/* ظ…ط´ظ‡ط¯ ط¨طµط±ظٹ â€” طھط¶ظ…ظٹظ† ظپظٹط¯ظٹظˆ 60fps */}
                            <div className="md:col-span-5">
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                                    className="relative aspect-[5/3] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl"
                                >
                                    {/* ط§ظ„ظپظٹط¯ظٹظˆ */}
                                    <video
                                        className="absolute inset-0 h-full w-full object-cover"
                                        src={bgVideoUrl}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        preload="auto"
                                    >
                                        <source src={bgVideoUrl} type="video/mp4" />
                                    </video>
                                    {/* ظ„ظ…ط³ط§طھ ظپظˆظ‚ ط§ظ„ظپظٹط¯ظٹظˆ */}
                                    <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgba(163,230,53,0.15),transparent)]" />
                                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* ط£ط¯ظˆط§طھ ط§ظ„طھط­ظƒظ… */}
                    <section className="mx-auto max-w-7xl px-4 md:px-6 mt-8" id="">
                        <div className="flex flex-wrap items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
                            {/* ظپظ„ط§طھط± ط§ظ„ظپط¦ط§طھ */}
                            <div
                                className={`relative basis-full grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${catsExpanded ? 'max-h-none overflow-visible' : 'max-h-10 overflow-hidden'}`}
                            >
                                {categories.map((c) => {
                                    const Icon = CATEGORY_ICONS[c] || CATEGORY_ICONS.default;
                                    return (
                                        <button
                                            key={c}
                                            onClick={() => setCat(c)}
                                            data-active={cat === c}
                                            className="nv-chip w-full"
                                        >
                                            <span className="opacity-90">{Icon}</span>
                                            <span>{c}</span>
                                            {c !== "ط§ظ„ظƒظ„" && (
                                                <span className="mx-1 rounded-full border border-white/15 bg-black/20 px-1.5 py-0.5 text-[10px] opacity-90">{categoryCounts.get(c) || 0}</span>
                                            )}
                                        </button>
                                    );
                                })}
                                {!catsExpanded && (
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-900/70 to-transparent" />
                                )}
                            </div>
                            <div className="basis-full flex justify-center">
                                <button
                                    onClick={() => setCatsExpanded((v) => !v)}
                                    className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                                    title={catsExpanded ? "ط¥ط¸ظ‡ط§ط± ط³ط·ط± ظˆط§ط­ط¯" : "ط¹ط±ط¶ ظƒظ„ ط§ظ„ظپط¦ط§طھ"}
                                    aria-expanded={catsExpanded}
                                    aria-label="طھط¨ط¯ظٹظ„ ط¹ط±ط¶ ط§ظ„ظپط¦ط§طھ"
                                >
                                    <span className="mx-1">{catsExpanded ? 'ط¥ط®ظپط§ط،' : 'ط¥ط¸ظ‡ط§ط± ط§ظ„ظ…ط²ظٹط¯'}</span>
                                    <span className="text-lg leading-none">{catsExpanded ? 'â–²' : 'â–¼'}</span>
                                </button>
                            </div>

                            {/* ط¨ط­ط« ظˆطھط±طھظٹط¨ */}
                            <div className="ml-auto flex items-center gap-2">
                                {/* طµظ†ط¯ظˆظ‚ ط¨ط­ط« ظ…ط¨ط³ظ‘ط· ط¨ط¯ظˆظ† ط­ط¯ظˆط¯ ط¯ط§ط®ظ„ظٹط© */}
                                <div className="flex w-[220px] md:w-[360px] items-center gap-1 nv-input">
                                    <input
                                        type="search"
                                        inputMode="search"
                                        autoComplete="off"
                                        maxLength={200}
                                        aria-label="ط¨ط­ط«"
                                        value={q}
                                        onChange={(e) => setQ(sanitizeText(e.target.value))}
                                        placeholder={'ط§ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ط¨ظˆطھâ€¦'}
                                        list="bot-names"
                                        className="flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-white/50"
                                    />
                                    {/* Native autocomplete dropdown with available bot names */}
                                    <datalist id="bot-names">
                                        {botTitles.map((t) => (
                                            <option key={t} value={t} />
                                        ))}
                                    </datalist>
                                    {!!q && (
                                        <button
                                            onClick={() => { setQ(''); }}
                                            className="ml-auto nv-btn-ghost px-2 py-0.5 text-[11px]"
                                            title="ظ…ط³ط­ ط§ظ„ط¨ط­ط«"
                                        >
                                            ظ…ط³ط­
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={sort}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setSort((SORTS || []).some((s) => s.id === v) ? v : (SORTS?.[0]?.id || 'popular'));
                                    }}
                                    className="nv-select text-sm"
                                    style={{ position: 'relative', zIndex: 50, isolation: 'isolate' }}
                                >
                                    {SORTS.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* طھظ… ط¥ط²ط§ظ„ط© ط§ظ„ظˆط³ظˆظ… ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط© */}

                        {/* ط¹ط¯ظ‘ط§ط¯ */}
                        <p className="mt-3 text-xs md:text-sm text-white/70">
                            ظ†طھط§ط¦ط¬: {fmt(filtered.length)} ط¨ظˆطھ
                        </p>

                        {/* ط§ظ„ط­ظگط²ظژظ… â†گ ط§ظ„ظپط¦ط§طھ â†گ ط§ظ„ط¨ظˆطھط§طھ */}
                        <div className="mt-4 space-y-8">
                            {groupedPackages.map((pkg) => (
                                <section key={pkg.key || pkg.name} aria-label={pkg.name} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-3 md:p-5 shadow">
                                    {/* ط¹ظ†ظˆط§ظ† ط§ظ„ط­ط²ظ…ط© */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-10%" }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className={`${expandedPkgs.has(pkg.key || pkg.name) ? 'sticky top-16 md:top-20 z-10 -mx-3 md:-mx-5 px-3 md:px-5 py-2 rounded-2xl bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/55' : ''} flex items-center gap-2`}
                                    >
                                        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const k = pkg.key || pkg.name;
                                                setExpandedPkgs((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(k)) next.delete(k); else next.add(k);
                                                    return next;
                                                });
                                            }}
                                            aria-expanded={expandedPkgs.has(pkg.key || pkg.name)}
                                            aria-controls={`pkg-panel-${(pkg.key || pkg.name || '').toString().replace(/\s+/g, '-').replace(/[^\w\-]/g, '')}`}
                                            className={`inline-flex items-center gap-2 text-xl md:text-2xl font-extrabold text-white rounded-full border border-white/10 px-4 py-1.5 bg-neutral-800 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:bg-emerald-500`}
                                        >
                                            <span className="opacity-90">
                                                {(CATEGORY_ICONS[pkg.name] || CATEGORY_ICONS.default)}
                                            </span>
                                            {pkg.name}
                                            <span className="mx-1 text-xs font-semibold text-white/80 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">{pkg.cats.length}</span>
                                            <span className={`ms-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/80 transition-transform ${expandedPkgs.has(pkg.key || pkg.name) ? 'rotate-180' : 'rotate-0'}`}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5H7z"/></svg>
                                            </span>
                                        </button>
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                    </motion.div>
                                    <p className="-mt-1 text-center text-[11px] text-white/60">ط­ظڈط²ظ…ط© â€¢ {pkg.cats.length} ظپط¦ط§طھ</p>

                                    {/* ظپط¦ط§طھ ط§ظ„ط­ط²ظ…ط© */}
                                    <AnimatePresence initial={false}>
                                        {expandedPkgs.has(pkg.key || pkg.name) && (
                                            <motion.div
                                                key={`pkg-panel-${(pkg.key || pkg.name || '').toString().replace(/\s+/g, '-').replace(/[^\w\-]/g, '')}`}
                                                id={`pkg-panel-${(pkg.key || pkg.name || '').toString().replace(/\s+/g, '-').replace(/[^\w\-]/g, '')}`}
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.35, ease: 'easeInOut' }}
                                                className="overflow-hidden mt-3 space-y-5"
                                            >
                                                {pkg.cats.map((cat, idx) => (
                                        <div key={`${pkg.name}-${cat.name}`} className="space-y-2">
                                            <div className="flex items-center gap-2 mb-1 justify-center">
                                                <div className="hidden md:block h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                                                <span className={`inline-flex items-center gap-1 text-sm md:text-base text-white/90 rounded-full border border-white/10 px-2 py-0.5 bg-gradient-to-br ${cat.accent} shadow-[0_0_18px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm animate-gradient-slow`}>
                                                    {cat.name}
                                                </span>
                                                <span className="hidden md:inline text-xs text-white/60">{cat.rows.length} ط¨ظˆطھ</span>
                                                <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                <AnimatePresence mode="popLayout">
                                                    {cat.rows.map((b) => {
                                                                                                        const rawModelEntries = Object.entries(b?.models || {});
                                                    const validModelEntries = rawModelEntries
                                                        .map(([model, url]) => [model, toSafeUrl(url)])
                                                        .filter(([, url]) => !!url);
                                                    const hasMultipleModels = validModelEntries.length > 1;
                                                    const primaryLink = toSafeUrl(b?.url);
                                                    const launchLink = primaryLink || (validModelEntries[0]?.[1] || '');
                                                    const canLaunch = hasMultipleModels || Boolean(launchLink);
                                                    const copyDisabled = !launchLink;

                                                    return (
                                                        <motion.div
                                                            key={b.id}
                                                            initial={{ opacity: 0, y: 18 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                                            className="pixel-card group relative overflow-hidden rounded-2xl bg-neutral-900/60 p-3 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition will-change-transform"
                                                        >
                                                            <div className={`absolute inset-0 opacity-60 bg-gradient-to-br ${getAccent(b)}`} />
                                                            <div className="relative z-10 flex h-full flex-col">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <div className="ml-auto" />
                                                                </div>
                                                                <h3 className="mt-2 line-clamp-2 text-base md:text-lg leading-snug font-bold tracking-tight drop-shadow-sm min-h-[2.75rem] md:min-h-[3.125rem]">
                                                                    {b.title}
                                                                </h3>
                                                                <div className="mt-2 grid grid-cols-3 gap-3 text-xs pb-2">
                                                                    <button onClick={() => setBotModal({ type: "about", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-emerald-500 hover:text-black transition">
                                                                        حول البوت
                                                                    </button>
                                                                    <button onClick={() => setBotModal({ type: "limits", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-emerald-500 hover:text-black transition">
                                                                        قيود الاستخدام
                                                                    </button>
                                                                    <button onClick={() => setBotModal({ type: "example", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-emerald-500 hover:text-black transition">
                                                                        أمثلة
                                                                    </button>
                                                                </div>
                                                                {/* إجراءات إضافية */}
                                                                <div className="mt-auto flex items-center gap-2 text-xs">
                                                                    <button
                                                                        type="button"
                                                                        onMouseEnter={() => {
                                                                            if (launchLink) warmUp(launchLink);
                                                                        }}
                                                                        onClick={() => {
                                                                            if (hasMultipleModels) {
                                                                                setBotModal({ type: 'choose-model', bot: b });
                                                                                return;
                                                                            }
                                                                            if (launchLink) {
                                                                                openExternal(launchLink);
                                                                                return;
                                                                            }
                                                                            openExternal('');
                                                                        }}
                                                                        disabled={!canLaunch}
                                                                        className="flex-1 grid place-items-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-lime-400 px-3 py-2 font-bold text-white shadow hover:shadow-lg animate-gradient-slow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
                                                                    >
                                                                        {buttonLabel}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyLink(launchLink)}
                                                                        disabled={copyDisabled}
                                                                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10"
                                                                        title="نسخ الرابط"
                                                                    >
                                                                        انسخ الرابط
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.12)_20%,transparent_35%)] opacity-0 group-hover:opacity-100 transition duration-700" />
                                                        </motion.div>
                                                    );
                                                })}

                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>
                            ))}
                        </div>
                    </section>

                    {/* ظ†ط§ظپط°ط© ظ…ظ†ط¨ط«ظ‚ط© ظ„ط¨ط·ط§ظ‚ط§طھ ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط© */}
                    <AnimatePresence>
                        {botModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
                                onClick={() => setBotModal(null)}
                            >
                                <motion.div
                                    initial={{ y: 18, opacity: 0, scale: 0.98 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                                    className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center rounded-lg bg-black/40 px-2 py-1 text-[10px] font-bold tracking-wide text-white/80 border border-white/10">
                                                {botModal.bot.category}
                                            </span>
                                            <strong className="text-sm">{botModal.bot.title}</strong>
                                        </div>
                                        <button
                                            onClick={() => setBotModal(null)}
                                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                                        >
                                            ط¥ط؛ظ„ط§ظ‚
                                        </button>
                                    </div>
                                    <div className="p-4 md:p-6 text-sm leading-7 text-white/90">
                                        {botModal.type === "about" && (
                                            <p>{botModal.bot.about || DEFAULT_BOT_ABOUT}</p>
                                        )}
                                        {botModal.type === "limits" && (
                                            <p>{botModal.bot.limits || DEFAULT_BOT_LIMITS}</p>
                                        )}
                                        {botModal.type === "example" && (
                                            <div>
                                                <p className="mb-2">ظ…ط«ط§ظ„ ط§ظ„ط§ط³طھط®ط¯ط§ظ…:</p>
                                                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-white/85">
                                                    {botModal.bot.example || DEFAULT_BOT_EXAMPLE}
                                                </div>
                                            </div>
                                        )}
                                        {botModal.type === "choose-model" && (
                                            <div>
                                                <p className="mb-3 font-bold text-white/95">ط§ط®طھط± ط§ظ„ظ†ظ…ظˆط°ط¬:</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {Object.entries(botModal.bot?.models || {})
                                                        .map(([name, url]) => {
                                                            const safe = toSafeUrl(url);
                                                            if (!safe) return null;
                                                            const label = formatModelLabel(name);
                                                            const accentClass = typeof name === 'string' && name.toLowerCase().includes('4')
                                                                ? ''
                                                                : 'bg-gradient-to-br from-violet-400 via-fuchsia-500 to-violet-400 animate-gradient-slow';
                                                            return (
                                                                <a
                                                                    key={`${name}-${safe}`}
                                                                    href={safe}
                                                                    target="_blank"
                                                                    rel="noopener"
                                                                    className={`nv-btn px-3 py-2 text-center text-sm ${accentClass}`}
                                                                >
                                                                    {(label || name || 'رابط')} ↗
                                                                </a>
                                                            );
                                                        })
                                                        .filter(Boolean)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {route === "/books" && <BooksPage />}
            {route === "/about" && <AboutPage botsCount={bots.length} catsCount={categories.length} booksCount={STATIC_BOOKS.length} />}

            {/* طھط°ظٹظٹظ„ */}
            <footer className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-white/70">
                                ظ†طµظ†ط¹ طھط¬ط§ط±ط¨ ط¹ط±ط¨ظٹط© ظ…طھظ‚ظ†ط© ظپظٹ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ. ط´ط§ط±ظƒظ†ط§ ط§ظ‚طھط±ط§ط­ط§طھظƒ ظˆط±ظˆط§ط¨ط· ط§ظ„ط¨ظˆطھط§طھ ط§ظ„طھظٹ طھظˆط¯ ط¥ط¶ط§ظپطھظ‡ط§ â€” ظˆظ†ط¹ظ…ظ„ ط¹ظ„ظ‰ ط¯ظ…ط¬ظ‡ط§ ط¶ظ…ظ† ط£ظ‚ط³ط§ظ… ظ…ط®طµظ‘طµط© ظˆط¨ط£ط³ظ„ظˆط¨ ط§ط­طھط±ط§ظپظٹ.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <a
                                    href="https://wa.me/966552191598"
                                    target="_blank"
                                    rel="noopener"
                                    aria-label="ظˆط§طھط³ط§ط¨"
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                                >
                                    <i className="fa-brands fa-whatsapp fa-lg text-white"></i>
                                </a>
                                <a href="https://t.me/zraiee" target="_blank" rel="noopener" aria-label="طھظٹظ„ظٹط؛ط±ط§ظ…" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-telegram fa-lg text-white"></i>
                                </a>
                                <a href="https://x.com/Arab_Ai_" target="_blank" rel="noopener" aria-label="ظ…ظ†طµط© ط¥ظƒط³" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-x-twitter fa-lg text-white"></i>
                                </a>
                                <a href="https://www.youtube.com/@alzarraei-gpts" target="_blank" rel="noopener" aria-label="ظٹظˆطھظٹظˆط¨" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-youtube fa-lg text-white"></i>
                                </a>
                                {/* Instagram */}
                                <a href="https://www.instagram.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="ط¥ظ†ط³طھط؛ط±ط§ظ…" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-instagram fa-lg text-white"></i>
                                </a>
                                {/* Facebook */}
                                <a href="https://www.facebook.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="ظپظٹط³ط¨ظˆظƒ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                                </a>
                                {/* TikTok */}
                                <a href="https://www.tiktok.com/@alzarraei" target="_blank" rel="noopener" aria-label="طھظٹظƒ طھظˆظƒ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-tiktok fa-lg text-white"></i>
                                </a>
                                {/* Email */}
                                <a href="mailto:zraieee@gmail.com" target="_blank" rel="noopener" aria-label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-solid fa-envelope fa-lg text-white"></i>
                                </a>
                                {/* PayPal */}
                                <a href="https://www.paypal.com/paypalme/zraiee" target="_blank" rel="noopener" aria-label="ط¨ط§ظٹ ط¨ط§ظ„" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-paypal fa-lg text-white"></i>
                                </a>
                                {/* LinkedIn */}
                                <a href="https://www.linkedin.com/in/abdulrahman-alzarraei/" target="_blank" rel="noopener" aria-label="ظ„ظٹظ†ظƒط¯ط¥ظ†" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-linkedin-in fa-lg text-white"></i>
                                </a>
                            </div>
                        </div>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="nv-btn text-sm"
                            aria-label="ط§ظ„ط¹ظˆط¯ط© ط¥ظ„ظ‰ ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط©"
                        >
                            ط¥ظ„ظ‰ ط§ظ„ط£ط¹ظ„ظ‰
                        </button>
                    </div>
                </div>
            </footer>

            {/* Toast: طھظ… ظ†ط³ط® ط§ظ„ط±ط§ط¨ط· */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 8, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4"
                    >
                        <div className="rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs md:text-sm text-white shadow-xl backdrop-blur">
                            {toast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ط²ط± ط·ط§ظپظٹ ظ„ظ„ط±ط¬ظˆط¹ ظ„ظ„ط£ط¹ظ„ظ‰ */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-16 right-4 z-50 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-lg transition ${showTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-label="ط§ظ„ط¹ظˆط¯ط© ط¥ظ„ظ‰ ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط©"
            >
                â†‘ ط¥ظ„ظ‰ ط§ظ„ط£ط¹ظ„ظ‰
            </button>

            {/* ظ„ظˆط­ط© ط§ظ„ط£ظˆط§ظ…ط± / ط§ظ„ط¨ط­ط« ط§ظ„ط³ط±ظٹط¹ */}
            <AnimatePresence>
                {paletteOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 grid place-items-start bg-black/50 p-4 pt-24"
                        onClick={() => setPaletteOpen(false)}
                    >
                        <motion.div
                            initial={{ y: 18, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
                                <input
                                    autoFocus
                                    type="search"
                                    inputMode="search"
                                    autoComplete="off"
                                    maxLength={200}
                                    aria-label="ط¨ط­ط«"
                                    placeholder="ط§ظƒطھط¨ ظ„ظ„ط¨ط­ط« ط¹ظ† ط£ظٹ ط¨ظˆطھâ€¦"
                                    value={q}
                                    onChange={(e) => {
                                        setQ(sanitizeText(e.target.value));
                                        setSelectedIndex(0);
                                    }}
                                    list="bot-names"
                                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/50"
                                />
                                <kbd className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/70">
                                    Esc
                                </kbd>
                            </div>
                            <ul className="max-h-[50vh] overflow-auto p-2">
                                {filtered.length === 0 && (
                                    <li className="px-3 py-6 text-center text-sm text-white/60">
                                        ظ„ط§ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط©â€¦
                                    </li>
                                )}
                                {filtered.map((b, i) => (
                                    <li key={b.id}>
                                        <button
                                            onClick={() => openExternal(b.url)}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm transition ${selectedIndex === i ? "bg-white/10" : "hover:bg-white/5"
                                                }`}
                                        >
                                            <span className="line-clamp-1">{b.title}</span>
                                            <span className="text-[10px] text-white/60">
                                                {b.category}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/60">
                                <span>ط§ط®طھطµط§ط±: Ctrl/Cmd + K</span>
                                <span>ط§ظ„ط£ط³ظ‡ظ… â†‘ â†“ ط«ظ… Enter</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ط´ط±ظٹط· ط¥ط¬ط±ط§ط،ط§طھ ط³ظپظ„ظٹ ظ„ظ„ظ‡ط§طھظپ */}
            <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/5 bg-neutral-950/80 p-2 backdrop-blur md:hidden">
                <button
                    onClick={() => setPaletteOpen(true)}
                    className="rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold hover:bg-white/10"
                >
                    ط¨ط­ط« ط³ط±ظٹط¹
                </button>
                <a
                    href="#"
                    className="grid place-items-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-lime-400 py-2 text-sm font-bold text-white animate-gradient-slow"
                >
                    ط§ط³طھط¹ط±ط§ط¶ ط§ظ„ط¨ظˆطھط§طھ
                </a>
            </div>
        </div>
    );
}

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
// طµظپط­ط© ط§ظ„ظƒطھط¨: ط¨ط·ط§ظ‚ط§طھ + ظ†ظˆط§ظپط° ظ…ظ†ط¨ط«ظ‚ط© ظ…طھط­ط±ظƒط©
function BooksPage() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const handleDownload = async (url, name = "file") => {
        try {
            if (!isSafeUrl(url)) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => {
                try { if (isSafeUrl(url)) window.open(url, '_blank', 'noopener,noreferrer'); } catch { }
            }, 350);
        } catch { }
    };

    useEffect(() => {
        let mounted = true;
        try {
            if (mounted) {
                setBooks(Array.isArray(STATIC_BOOKS) ? STATIC_BOOKS : SAMPLE_BOOKS);
            }
        } catch (e) {
            if (mounted) setBooks(SAMPLE_BOOKS);
        } finally {
            if (mounted) setLoading(false);
        }
        return () => (mounted = false);
    }, []);

    // طھط¬ظ…ظٹط¹ ط§ظ„ظƒطھط¨ ط­ط³ط¨ ط§ظ„ط³ظ„ط³ظ„ط©/ط§ظ„ظپط¦ط©
    const seriesById = useMemo(() => {
        const map = new Map();
        (STATIC_SERIES || []).forEach((s) => map.set(s.id, s));
        return map;
    }, []);
    const groupedBooks = useMemo(() => {
        const m = new Map();
        for (const b of books) {
            const sid = b.seriesId || 'default';
            if (!m.has(sid)) m.set(sid, []);
            m.get(sid).push(b);
        }
        return m;
    }, [books]);

    return (
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900/70 to-neutral-950 p-6 md:p-10 shadow-xl">
                <div className="relative z-10">
                    <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0.95, 1, 0.95], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', opacity: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }} className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
                        ظ…ظ† ط§ظ„ظ…ط¤ظ„ظپ ط¥ظ„ظ‰ ط§ظ„ظ‚ط§ط±ط¦ â€” ظ…ظ†ط´ظˆط±ط§طھ ظ…ط®طھط§ط±ط©
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0.9, 1, 0.9], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }} className="mt-2 text-white/70 text-sm md:text-base max-w-2xl">
                        ط§ط³طھظƒط´ظپ ط£ط¹ظ…ط§ظ„ط§ظ‹ طµظڈظ†ط¹طھ ط¨ط¹ظ†ط§ظٹط© ظ„طھط¶ظٹظپ ظ‚ظٹظ…ط© ط­ظ‚ظٹظ‚ظٹط© ط¥ظ„ظ‰ طھط¬ط±ط¨طھظƒ. ظ„ظƒظ„ ط¥طµط¯ط§ط± ظ‚طµط© ظˆظ…ظ†ظ‡ط¬ ظˆط£ط«ط± â€” ط§ط¨ط¯ط£ ط§ظ„ظ‚ط±ط§ط،ط© ط£ظˆ ط­ظ…ظ‘ظ„ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ…ظ†ط§ط³ط¨ط© ظ„ظƒ.
                    </motion.p>
                </div>
                <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
            </div>

            {/* ظ…ط¬ظ…ظˆط¹ط§طھ ط­ط³ط¨ ط§ظ„ط³ظ„ط³ظ„ط© */}
            {loading && (
                <div className="mt-6 text-center py-12 text-white/60">ط¬ط§ط±ظچ ط§ظ„طھط­ظ…ظٹظ„â€¦</div>
            )}
            {!loading && (
                (STATIC_SERIES || []).map((s) => {
                    const rows = groupedBooks.get(s.id) || [];
                    if (!rows.length) return null;
                    return (
                        <section key={s.id} className="mt-6">
                            <h2 className="text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">{s.title}</h2>
                            <p className="mt-1 text-white/70 text-sm">ط³ظ„ط³ظ„ط© ظ…ط®طھط§ط±ط© طھط¶ظ… ط¥طµط¯ط§ط±ط§طھ ظ…طھط®طµطµط© ط¨ط¹ظ†ط§ظٹط©.</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {rows.map((b) => (
                                    <article
                                        key={b.id}
                                        className="group relative overflow-hidden rounded-2xl bg-neutral-900/60 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition"
                                    >
                                        <div className={`absolute inset-0 opacity-50 bg-gradient-to-br ${pickAccentByCategory(b.category)}`} />
                                        <div className="relative z-10">
                                            <div className="relative overflow-hidden rounded-xl bg-black/40">
                                                <div className="relative aspect-[4/5]">
                                                    <PdfCover pdfUrl={b.pdfUrl} coverUrl={b.coverUrl} title={b.title} />
                                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 to-transparent" />
                                                    <div className="absolute inset-x-0 bottom-3 z-10 mx-3 grid grid-cols-2 gap-2">
                                                        <a
                                                            href={b.viewUrl || '#'}
                                                            target="_blank"
                                                            rel="noopener"
                                                            className={`rounded-xl px-3 py-2 text-center text-xs font-bold text-white ${b.viewUrl ? 'bg-white/10 hover:bg-white/15 border border-white/10' : 'bg-white/5 opacity-60 cursor-not-allowed'}`}
                                                        >
                                                            ظ…ط´ط§ظ‡ط¯ط©
                                                        </a>
                                                        <button
                                                            onClick={() => b.downloadUrl && handleDownload(b.downloadUrl, `${b.slug || b.id}.pdf`)}
                                                            className={`px-3 py-2 text-center text-xs font-bold text-white rounded-xl ${b.downloadUrl ? 'nv-btn' : 'bg-white/5 opacity-60 cursor-not-allowed'}`}
                                                            disabled={!b.downloadUrl}
                                                        >
                                                            طھط­ظ…ظٹظ„
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    );
                })
            )}
        </main>
    );
}

// ط´ط±ظٹط· طھظ†ظ‚ظ„ Gooey ط¨ط³ظٹط· ظ„ط±ظˆط§ط¨ط· ط§ظ„طµظپط­ط§طھ
function GooeyNav({ route }) {
    const items = [
        { href: "#/", label: "ط§ظ„ط±ط¦ظٹط³ظٹط©" },
        { href: "#/books", label: "ط§ظ„ظƒطھط¨" },
        { href: "#/about", label: "ظ…ظ† ظ†ط­ظ†" },
        { href: "https://wa.me/966552191598", label: "ط§ط´طھط±ط§ظƒ", external: true },
    ];
    return (
        <div className="mx-auto mt-3 max-w-7xl px-4 md:px-6">
            {/* Removed gooey filter and transitions/hover effects from nav buttons */}
            <div className="relative mx-auto flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                {items.map((it) => (
                    <a
                        key={it.href}
                        href={it.href}
                        target={it.external ? "_blank" : undefined}
                        rel={it.external ? "noopener" : undefined}
                        className={`relative grid flex-1 place-items-center rounded-xl px-3 py-2 text-sm ${
                            (route === "/" && it.href === "#/") || (route !== "/" && `#${route}` === it.href)
                                ? "bg-white/20 text-white"
                                : "bg-transparent text-white/80"
                        }`}
                    >
                        {it.label}
                    </a>
                ))}
                <div className="pointer-events-none absolute inset-0 -z-10" />
            </div>
        </div>
    );
}

// طµظپط­ط© ظ…ظ† ظ†ط­ظ† ط¨طھط®ط·ظٹط· Bento ظ…طھط­ط±ظƒ
function AboutPage({ botsCount = 0, catsCount = 0, booksCount = 0 }) {
    const [bc, setBc] = useState(0);
    const [cc, setCc] = useState(0);
    const [bk, setBk] = useState(0);
    useEffect(() => {
        let i1, i2, i3;
        const easeIn = (to, setter) => {
            let n = 0;
            const step = Math.max(1, Math.ceil(to / 60));
            const tick = () => {
                n = Math.min(to, n + step);
                setter(n);
                if (n < to) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        easeIn(botsCount, setBc);
        easeIn(catsCount, setCc);
        easeIn(booksCount, setBk);
        return () => { cancelAnimationFrame(i1); cancelAnimationFrame(i2); cancelAnimationFrame(i3); };
    }, [botsCount, catsCount, booksCount]);
    return (
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/70 to-neutral-950 p-6 md:p-10">
                <div className="relative z-10">
                    <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0.95, 1, 0.95], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', opacity: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }} className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
                        ظ…ظ† ظ†ط­ظ†
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0.9, 1, 0.9], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }} className="mt-3 text-white/80 text-sm md:text-base leading-relaxed">
                        ط£ط³ظ‘ط³ ظ‡ط°ظ‡ ط§ظ„ظ…ظ†طµط© ط¯. ط¹ط¨ط¯ط§ظ„ط±ط­ظ…ظ† ط§ظ„ط²ط±ط§ط¹ظٹطŒ ظ…ط´ط±ظپ ط£ظƒط§ط¯ظٹظ…ظٹ ظˆط¨ط§ط­ط« ظ…طھط®طµطµ ظپظٹ ظ…ط¬ط§ظ„ط§طھ ط§ظ„ط¨ط­ظˆط« ط§ظ„ط¹ظ„ظ…ظٹط©طŒ ظ…ظ‡طھظ… ط¨ط§ظ„ظپظ†ظˆظ† ط§ظ„ط¨طµط±ظٹط© ظˆظ†ظ…ط§ط°ط¬ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹطŒ ط¹ظ…ظ„ ظ…ظ† ظˆظ‚طھ ط·ظˆظٹظ„ ط¹ظ„ظ‰ طھط·ظˆظٹط± طھط¹ظ„ظٹظ…ط§طھ ط¯ظ‚ظٹظ‚ط© ظˆظ…ط®طµطµط© ظ„ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط°ظƒظٹط© GPTطŒ ظˆظ‡ط°ظ‡ ط§ظ„طھط¹ظ„ظٹظ…ط§طھ طھظ‡ط¯ظپ ط¥ظ„ظ‰ ط¥ظ†ط´ط§ط، ظ†ظ…ط§ط°ط¬ ط°ظƒظٹط© طھط¹ظ…ظ„ ط¹ظ„ظ‰ طھط­ظ‚ظٹظ‚ ط£ط¯ط§ط، ظ…طھط³ظ‚ ظˆط¹ط§ظ„ظٹ ط§ظ„ط¬ظˆط¯ط© ظپظٹ ظ…ط®طھظ„ظپ ط§ظ„طھط®طµطµط§طھطŒ ظپط¶ظ„ط§ظ‹ ط¹ظ† ط§ط³طھط¶ط§ظپط© ظپط±ظٹظ‚ ظ…ظ† ط§ظ„ط¨ط§ط­ط«ظٹظ† ظˆط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹظٹظ† ظˆط§ظ„ظ…ظ‡طھظ…ظٹظ† ظپظٹ ط§ظ„ط¹ظ…ظ„ ظ„ط¨ظ†ط§ط، ط±ط¤ظٹط© طھط­ظ„ظٹظ„ظٹط© ط¹ظ…ظٹظ‚ط© ظˆظ…ظ†ظ‡ط¬ظٹط© ظˆطµط§ط±ظ…ط© ظپظٹ طھطµظ…ظٹظ… ظƒظ„ ظ†ظ…ظˆط°ط¬طŒ ظˆظ‡ط°ط§ ظٹط¶ظ…ظ† طھظˆط§ظپظ‚ طھظ„ظƒ ط§ظ„ظ†ظ…ط§ط°ط¬ ظ…ط¹ ط§ظ„ظ…ط¹ط§ظٹظٹط± ط§ظ„ط¹ظ„ظ…ظٹط© ظˆط§ظ„ظ„ط؛ظˆظٹط©طŒ ظˆطھظ‚ظٹظٹظ… ط£ط¯ط§ط¦ظ‡ط§ ط¹ظ„ظ‰ ظ†ط­ظˆ ظ…ظ†ظ‡ط¬ظٹ ط¨ظ‡ط¯ظپ طھط­ط³ظٹظ†ظ‡ط§ ظˆطھط·ظˆظٹط±ظ‡ط§طŒ ظƒظ…ط§ ظٹط³ط¹ظ‰ ط§ظ„ظپط±ظٹظ‚ ط¥ظ„ظ‰ طھظ…ظƒظٹظ† ط§ظ„ظ…ط¬طھظ…ط¹ ط§ظ„ط¹ط±ط¨ظٹ ظ…ظ† ط§ظ„ط¥ظپط§ط¯ط© ط§ظ„ظƒط§ظ…ظ„ط© ظ…ظ† ظ‚ط¯ط±ط§طھ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ط¨ظ„ط؛طھظ‡ ظˆط«ظ‚ط§ظپطھظ‡طŒ ط¥ظٹظ…ط§ظ†ظ‹ط§ ظ…ظ†ظ‡ ط¨ط£ظ† ط§ظ„طھظ‚ظ†ظٹط© ط§ظ„ظ…طµظ…ظ…ط© ط¨ط¹ظ†ط§ظٹط© ظ‚ط§ط¯ط±ط© ط¹ظ„ظ‰ ط£ظ† طھظƒظˆظ† ط£ط¯ط§ط© ظپط¹ط§ظ„ط©طŒ ظˆط£ظ† طھط³ظ‡ظ… ط¨ظ‚ظˆط© ظپظٹ طھط¹ط²ظٹط² ط§ظ„ظƒظپط§ط،ط© ظˆط§ظ„ط¥ظ†طھط§ط¬ظٹط©.
                    </motion.p>
                    {/* Counters */}
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-lime-400/20 to-emerald-500/20 text-lime-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a5 5 0 015 5v2h1a3 3 0 013 3v8H3V12a3 3 0 013-3h1V7a5 5 0 015-5zm-3 7h6V7a3 3 0 10-6 0v2zm11 5H4v5h16v-5z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(bc)}</div>
                            <div className="text-white/60">ط¨ظˆطھ</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400/20 to-cyan-500/20 text-sky-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(cc)}</div>
                            <div className="text-white/60">ظپط¦ط©</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 2h14a1 1 0 011 1v18l-8-4-8 4V3a1 1 0 011-1z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(bk)}</div>
                            <div className="text-white/60">ظƒطھط§ط¨</div>
                        </div>
                    </div>
                    {/* ط£ط²ظ„ظ†ط§ ط§ظ„ط´ط±ط§ط¦ط­/ط§ظ„ظˆط³ظˆظ… ظ…ظ† ظ‚ط³ظ… ظ…ظ† ظ†ط­ظ† ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط·ظ„ط¨ */}
                </div>
                <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-lime-400/15 to-emerald-500/0 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/15 to-lime-500/0 blur-3xl" />
            </div>

            {/* Sections */}
            <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ظˆطµظپ */}
                <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.4 }}
                    className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                    <div className="relative z-10">
                        <h2 className="flex items-center gap-2 text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-lime-300"><path d="M12 2l9 4-9 4-9-4 9-4zm9 7l-9 4-9-4v7l9 4 9-4V9z" /></svg>
                            ظˆطµظپ ط§ظ„ظ…ظ†طµط©
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            طھط¶ظ… ط¨ظˆط§ط¨ط© آ«ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط°ظƒظٹط©آ» ط­ط²ظ…ط© ظ…طھظƒط§ظ…ظ„ط© ظ…ظ† ط§ظ„ط¨ط§ظ‚ط§طھ ظˆط§ظ„ط¨ظˆطھط§طھ ط§ظ„ظ…طµظ…ظ…ط© ط®طµظٹطµظ‹ط§ ظ„ط¯ط¹ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط¹ط±ط¨ظٹ ظپظٹ ظ…ط¬ط§ظ„ط§طھ ط¹ط¯ط©طŒ طھط´ظ…ظ„: ط§ظ„ط¨ط­ط« ط§ظ„ط¹ظ„ظ…ظٹطŒ ظˆط§ظ„طھط¹ظ„ظٹظ…طŒ ظˆط§ظ„طھطµظ…ظٹظ…طŒ ظˆط§ظ„ط¥ط¯ط§ط±ط©طŒ ظˆط§ظ„طھط³ظˆظٹظ‚طŒ ظˆط§ظ„ظ‚ط§ظ†ظˆظ†طŒ ظˆط§ظ„ط¨ط±ظ…ط¬ط©طŒ ظˆط؛ظٹط±ظ‡ط§. طھط­طھظˆظٹ ظƒظ„ ط¨ط§ظ‚ط© ط¹ظ„ظ‰ ظ…ط¬ظ…ظˆط¹ط© ظ…ظ† ط§ظ„ط¨ظˆطھط§طھ ط§ظ„طھظٹ طھط¤ط¯ظٹ ظ…ظ‡ط§ظ…ظ‹ط§ ط°ظƒظٹط© ظ…ط­ط¯ط¯ط© ط¨ط¯ظ‚ط© ظˆط³ط±ط¹ط©طŒ ظ…ط«ظ„: ط¥ط¹ط¯ط§ط¯ ط§ظ„ط¹ظ†ظˆط§ظ† ظˆط§ظ„ظپظƒط±ط©طŒ ظˆطµظ†ط§ط¹ط© ط§ظ„ط®ط·ط©طŒ ظˆط¥ط¹ط¯ط§ط¯ ط§ظ„ط¨ط­ط« ط§ظ„ط¹ظ„ظ…ظٹطŒ ظˆطھظˆط«ظٹظ‚ ط§ظ„ظ†طµظˆطµطŒ ظˆطھظ†ط³ظٹظ‚ ط§ظ„ظ…ط±ط§ط¬ط¹طŒ ظˆط¥ط¹ط§ط¯ط© ط§ظ„طµظٹط§ط؛ط©طŒ ظˆط§ظ„طھط±ط¬ظ…ط© ط§ظ„ط§طµط·ظ„ط§ط­ظٹط©طŒ ظˆطھط­ظ„ظٹظ„ ط§ظ„ظ†طµظˆطµطŒ ظˆط؛ظٹط±ظ‡ط§.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* ط¯ظˆط±ط§طھظ†ط§ */}
                <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                    <div className="relative z-10">
                        <h2 className="flex items-center gap-2 text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-sky-300"><path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" /></svg>
                            ط¯ظˆط±ط§طھظ†ط§
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            ظ†ظ‚ط¯ظ… ظ…ط¬ظ…ظˆط¹ط© ظ…ظ† ط§ظ„ط¯ظˆط±ط§طھ ط§ظ„طھط¯ط±ظٹط¨ظٹط© ط§ظ„ظ…طµظ…ظ…ط© ط¨ط¹ظ†ط§ظٹط© ظ„طھط¹ط±ظٹظپ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ط¨ظˆط§ط¬ظ‡ط© ChatGPT ظˆط·ط±ظ‚ ط§ظ„طھط¹ط§ظ…ظ„ ظ…ط¹ظ‡ط§ ط¨ط§ط­طھط±ط§ظپطŒ ظˆطھط´ظ…ظ„ ط§ظ„ط¯ظˆط±ط§طھ ظ…ط­ط§ظˆط± ط£ط³ط§ط³ظٹط© ظ…ط«ظ„: ظƒظٹظپظٹط© ط·ط±ط­ ط§ظ„ط£ط³ط¦ظ„ط©طŒ ظˆط¥ط¯ط§ط±ط© ط§ظ„ط­ظˆط§ط±طŒ ظˆظ‡ظ†ط¯ط³ط© ط§ظ„طھط¹ظ„ظٹظ…ط§طھ ظˆطھظˆط¬ظٹظ‡ظ‡ط§ ط¨ط·ط±ظٹظ‚ط© طµط­ظٹط­ط©طŒ ظƒظ…ط§ ظ†ظ‚ط¯ظ… ط¯ظˆط±ط§طھ ظپظٹ ط§ظ„ط¨ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ طھطھظ†ط§ظˆظ„ ظƒظٹظپظٹط© ط¥ظ†ط´ط§ط، ظ†ظ…ط§ط°ط¬ ظ…ط®طµطµط© ظ„ظ„ط¹ظ…ظ„ ط§ظ„ط¨ط­ط«ظٹطŒ ظˆطھطھظ†ط§ظˆظ„ ط£ظٹط¶ط§ظ‹ ظ…ظپط§ظ‡ظٹظ… ظ…ط«ظ„ ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„طھظˆظ„ظٹط¯ظٹط©طŒ ظˆطھط¹ظ„ظٹظ…ط§طھ ط§ظ„طھظƒظˆظٹظ†طŒ ظˆطھط¯ط±ظٹط¨ ط§ظ„ظ†ظ…ط§ط°ط¬طŒ ظˆظپظ‡ظ… ط¢ظ„ظٹط§طھ ط§ظ„طھظپظƒظٹط± ط§ظ„ط¢ظ„ظٹ. طھظڈط¹ظ‚ط¯ ط§ظ„ط¯ظˆط±ط§طھ ط¨ط£ط³ظ„ظˆط¨ طھط·ط¨ظٹظ‚ظٹ ظ…ط¹ ظ…ظˆط§ط¯ طھط¹ظ„ظٹظ…ظٹط© طھط³ط§ط¹ط¯ ط¹ظ„ظ‰ ط§ظ„طھط·ط¨ظٹظ‚ ط§ظ„ظپظˆط±ظٹطŒ ظˆظٹظ…ظƒظ† ط·ظ„ط¨ ط§ظ„ط¯ظˆط±ط§طھ ط¨ط´ظƒظ„ ظپط±ط¯ظٹ ط£ظˆ ط¬ظ…ط§ط¹ظٹ ط­ط³ط¨ ط§ظ„ط­ط§ط¬ط©.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* ط¬ط¯ظٹط¯ظ†ط§ */}
                <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.4 }}
                    className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
                >
                    <div className="relative z-10">
                        <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-rose-300"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v6h5v2h-7V7h2z" /></svg>
                            ط¬ط¯ظٹط¯ظ†ط§
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            ظ†ط¹ظ…ظ„ ط¨ط§ط³طھظ…ط±ط§ط± ط¹ظ„ظ‰ طھط·ظˆظٹط± ظ†ظ…ط§ط°ط¬ ط°ظƒظٹط© ط¬ط¯ظٹط¯ط© طھظˆط§ظƒط¨ ط§ظ„ط§ط­طھظٹط§ط¬ط§طھ ط§ظ„ظ…طھط؛ظٹط±ط© ظ„ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†. ظ…ظ† ط£ط­ط¯ط« ظ…ط§ ط£ظڈط¶ظٹظپ: آ«ط§ظ‚طھط±ط§ط­ ط¹ظ†ظˆط§ظ† ظˆظپظƒط±ط© ط¨ط­ط«آ»طŒ آ«ط¯ظ„ظٹظ„ ظپظ‡ط§ط±ط³ ط§ظ„ظ…ط®ط·ظˆط·ط§طھآ»طŒ آ«طھط¹ظ„ظٹظ…ط§طھ طھظƒظˆظٹظ† ط§ظ„ظ†ظ…ظˆط°ط¬آ»طŒ آ«ط¹ظ„ظ… ط§ظ„ط¹ط±ظˆط¶ ظˆط§ظ„ط£ظˆط²ط§ظ† ط§ظ„ط´ط¹ط±ظٹط©آ»طŒ آ«ط§ظ„ظ…ط³ط§ط¹ط¯ ظپظٹ طھط£ظ„ظٹظپ ط§ظ„ظƒطھط¨آ»طŒ آ«ظ†ط¸ط§ظ… ط§ظ„ط²ظƒط§ط©آ»طŒ ظˆآ«ط§ظ„ط±ط¯ ط§ظ„ظپظˆط±ظٹ ط¹ظ„ظ‰ ط§ظ„ظپطھظˆظ‰ ط§ظ„ط´ط±ط¹ظٹط©آ». طھط£طھظٹ ظ‡ط°ظ‡ ط§ظ„ظ†ظ…ط§ط°ط¬ ط¶ظ…ظ† ط¨ط§ظ‚ط§طھ ط¬ط§ظ‡ط²ط© ظ„ظ„ط§ط³طھط®ط¯ط§ظ…طŒ ظ…ط¹ ظپظٹط¯ظٹظˆظ‡ط§طھ ط´ط±ط­ ظˆطھظˆط¬ظٹظ‡ط§طھ ظ…ط®طµطµط©.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* ط±ظˆط§ط¨ط· */}
                <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
                >
                    <div className="relative z-10">
                        <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-amber-300"><path d="M3.9 12a5 5 0 017.07 0l1.06 1.06-2.12 2.12L8.85 14.1a2 2 0 10-2.83 2.83l1.06 1.06-2.12 2.12L4 19.9A5 5 0 013.9 12zm16.2 0a5 5 0 00-7.07 0l-1.06 1.06 2.12 2.12 1.06-1.06a2 2 0 012.83 2.83l-1.06 1.06 2.12 2.12L20 19.9A5 5 0 0020.1 12z" /></svg>
                            ط±ظˆط§ط¨ط· ظˆظ…ط±ط§ط¬ط¹
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            ظ†ظˆظپط± ظ…ط¬ظ…ظˆط¹ط© ظ…ظ† ط§ظ„ط±ظˆط§ط¨ط· ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ظ„ظ…ط³ط§ط¹ط¯ط© ط§ظ„ظ…ط³طھط®ط¯ظ… ط¹ظ„ظ‰ ظپظ‡ظ… ط¢ظ„ظٹط© ط¹ظ…ظ„ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظˆط·ط±ظٹظ‚ط© ط§ظ„طھط¹ط§ظ…ظ„ ظ…ط¹ ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ظ…ط®طµطµط©. ظ…ظ† ط£ط¨ط±ط² ط§ظ„ظ…ط­طھظˆظٹط§طھ: ظƒطھط§ط¨ آ«ط§ظ„ط¢ظ„ط© ط§ظ„طھظٹ طھظپظƒط±آ» ظˆظƒطھط§ط¨ آ«ط§ظ„ط¢ظ„ط© ط§ظ„طھظٹ طھط±ط¯آ»طŒ ط¥ط¶ط§ظپط© ط¥ظ„ظ‰ ظ…ط¤ظ„ظپط§طھ ظ…ط®طھطµط±ط© ظˆظ…ظ„ظپط§طھ ط¥ط±ط´ط§ط¯ظٹط© ظ‚ط§ط¨ظ„ط© ظ„ظ„طھط­ظ…ظٹظ„ طھط­طھظˆظٹ ط¹ظ„ظ‰ ط£ظ…ط«ظ„ط© ط¹ظ…ظ„ظٹط© ظˆطھط¹ظ„ظٹظ…ط§طھ ط¬ط§ظ‡ط²ط© ظ„ظ„ط§ط³طھط®ط¯ط§ظ…. ظٹطھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظˆط§ط¯ ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ط¨ط§ط³طھظ…ط±ط§ط± ظˆط¨ط£ط³ظ„ظˆط¨ ظٹظ†ط§ط³ط¨ ط¬ظ…ظٹط¹ ط§ظ„ظ…ط³طھظˆظٹط§طھ.
                        </p>
                        <div className="mt-3">
                            <a
                                href="https://alzarraei-gpts.github.io/Arabic-GPT-Hub-books/"
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:shadow-lg"
                            >
                                ط±ظˆط§ط¨ط· ط§ظ„ظƒطھط¨ â†—
                            </a>
                        </div>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>
            </section>

            {/* Timeline */}
            <section className="mt-6">
                <div className="mx-auto max-w-6xl">
                    <h3 className="mb-3 text-base md:text-lg font-extrabold bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">ط±ط­ظ„طھظ†ط§</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-rose-400 to-pink-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">ط§ظ„ظپظƒط±ط©</span>
                                <p className="mt-2 text-sm text-white/85">طھطµظ…ظٹظ… طھط¬ط±ط¨ط© ط¹ط±ط¨ظٹط© ظپط§ط®ط±ط© ظ„ظ„ط¨ظˆطھط§طھ.</p>
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-sky-400 to-cyan-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">ط§ظ„طھط·ظˆظٹط±</span>
                                <p className="mt-2 text-sm text-white/85">ظ‡ظ†ط¯ط³ط© ط§ظ„طھط¹ظ„ظٹظ…ط§طھ ظˆظ†ظ…ط§ط°ط¬ ظ…ط®طµظ‘طµط© ط¹ط§ظ„ظٹط© ط§ظ„ط¬ظˆط¯ط©.</p>
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-amber-400 to-orange-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">ط§ظ„ط¥ط·ظ„ط§ظ‚</span>
                                <p className="mt-2 text-sm text-white/85">ط¨ظˆط§ط¨ط© ط§ظ„ظ†ظ…ط§ط°ط¬ ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ط°ظƒظٹط©.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
// ط؛ظ„ط§ظپ PDF: ظٹط­ط§ظˆظ„ ط§ط³طھط®ط±ط§ط¬ ط§ظ„طµظپط­ط© ط§ظ„ط£ظˆظ„ظ‰طŒ ظˆط¥ظ„ط§ ظٹط³طھط®ط¯ظ… طµظˆط±ط© ط§ط­طھظٹط§ط·ظٹط©
function PdfCover({ pdfUrl, coverUrl, title }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [dataUrl, setDataUrl] = useState(null);
    const [coverOk, setCoverOk] = useState(true);
    const triedRef = useRef(false);
    const [inView, setInView] = useState(false);

    // Observe the container entering viewport
    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    setInView(true);
                    io.disconnect();
                    break;
                }
            }
        }, { rootMargin: '120px' });
        io.observe(node);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        let cancelled = false;
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        (async () => {
            if (!inView) return;
            if (!pdfUrl || typeof window === 'undefined' || !window.pdfjsLib || triedRef.current) return;
            if (prefersReduced) return; // avoid heavy work
            triedRef.current = true;
            try {
                const pdf = await window.pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
                const page = await pdf.getPage(1);
                const scale = isMobile ? 1.2 : 1.6;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;
                if (!cancelled) setDataUrl(canvas.toDataURL('image/png'));
            } catch (e) { }
        })();
        return () => { cancelled = true; };
    }, [pdfUrl, inView]);

    return (
        <div ref={containerRef} className="relative h-full w-full">
            {dataUrl ? (
                <motion.img
                    src={dataUrl}
                    alt={title}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    initial={{ scale: 1.01, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                />
            ) : (coverUrl && coverOk) ? (
                <motion.img
                    src={coverUrl}
                    alt={title}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    initial={{ scale: 1.01, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    onError={() => setCoverOk(false)}
                />
            ) : null}
            {/* Hidden canvas used to render first page snapshot */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

const SAMPLE_BOOKS = [
    {
        id: "bk-01",
        title: "ط§ظ‚طھط±ط§ط­ ط§ظ„ط¹ظ†ط§ظˆظٹظ† ط§ظ„ط¨ط­ط«ظٹط© â€” ط¯ظ„ظٹظ„ ط¹ظ…ظ„ظٹ",
        author: "ط¯. ط§ظ„ط²ط±ظ‘ط§ط¹ظٹ",
        category: "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ",
        tags: ["ظ…ط§ط¬ط³طھظٹط±", "ط¯ظƒطھظˆط±ط§ظ‡"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
    {
        id: "bk-02",
        title: "ط£ط³ط§ط³ظٹط§طھ ط§ظ„ظ…ظ†ظ‡ط¬ظٹط© ط§ظ„ط¹ظ„ظ…ظٹط©",
        author: "ط¯. ط§ظ„ط²ط±ظ‘ط§ط¹ظٹ",
        category: "ط§ظ„ط¨ط§ط­ط« ط§ظ„ط¹ظ„ظ…ظٹ",
        tags: ["ظ…ظ†ظ‡ط¬ظٹط©", "طھظˆط«ظٹظ‚"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
    {
        id: "bk-03",
        title: "ط¯ظ„ظٹظ„ ظƒطھط§ط¨ط© ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¹ط±ط¨ظٹ",
        author: "ط¯. ط§ظ„ط²ط±ظ‘ط§ط¹ظٹ",
        category: "ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ„ط؛ط©",
        tags: ["طھط­ط±ظٹط±", "طµظٹط§ط؛ط©"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
];

// ط§ظپطھط±ط§ط¶ظٹط§طھ ظ„ظ†ظˆط§ظپط° ط§ظ„ط¨ط·ط§ظ‚ط§طھ ظپظٹ ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
const DEFAULT_BOT_ABOUT =
    "ظٹظڈط¹ط¯ظ‘ظڈ ظ‡ط°ط§ ط§ظ„ط¨ظˆطھ ط£ط¯ط§ط©ظ‹ ط°ظƒظٹط© ظ…طھط®طµطµط© ظپظٹ ط¯ط¹ظ… ط§ظ„ط¨ط§ط­ط«ظٹظ† ظˆط·ظ„ط§ط¨ ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط¹ظ„ظٹط§ ظپظٹ ط§ط®طھظٹط§ط± ط¹ظ†ط§ظˆظٹظ† ط£طµظٹظ„ط© ظˆظ…طھظ…ظٹط²ط© ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ظ…ط§ط¬ط³طھظٹط± ظˆط§ظ„ط¯ظƒطھظˆط±ط§ظ‡طŒ ظ…ظ† ط®ظ„ط§ظ„ طھط­ظ„ظٹظ„ ط§ظ„طھط®طµطµط§طھ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط© ظˆط§ط³طھظ†ط¨ط§ط· ط§ظ„ظپط±طµ ط§ظ„ط¨ط­ط«ظٹط© ط؛ظٹط± ط§ظ„ظ…ط³طھظƒط´ظپط©.";
const DEFAULT_BOT_LIMITS =
    "طھط¹ظ…ظ„ ط¶ظ…ظ† ظ†ط·ط§ظ‚ ط£ظƒط§ط¯ظٹظ…ظٹ طµط§ط±ظ…طŒ ظˆطھظ„طھط²ظ… ط¨ط§ظ„ط£طµط§ظ„ط© ط§ظ„ط¨ط­ط«ظٹط© ظˆط§ظ„ط­ظٹط§ط¯ ظˆط§ظ„ط¯ظ‚ط© ظˆط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ظپطµظٹط­ط© ظˆط§ظ„طھظˆط«ظٹظ‚ ط§ظ„ط¹ظ„ظ…ظٹ ط§ظ„ط³ظ„ظٹظ…. ظ„ط§ طھظ‚ط¯ظ‘ظ… ط§ظ‚طھط±ط§ط­ط§طھ ط¹ط§ظ…ط© ظ…طھط¯ط§ظˆظ„ط©.";
const DEFAULT_BOT_EXAMPLE =
    "ط£ط¯ط®ظ„ طھط®طµطµظƒ (ظ…ط«ظ„: ط§ظ„طھط±ط¨ظٹط© ط§ظ„ط®ط§طµط©)طŒ ظˆط³ظٹظ‚طھط±ط­ ط§ظ„ط¨ظˆطھ 3 ط¹ظ†ط§ظˆظٹظ† ط£طµظٹظ„ط© ظ„ط±ط³ط§ط¦ظ„ ظ…ط§ط¬ط³طھظٹط± ط¶ظ…ظ† ظ‡ط°ط§ ط§ظ„ظ…ط¬ط§ظ„.";
