import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const BASE_URL =
  (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/";

const resolvePublicPath = (path) => {
  const normalizedBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  const normalizedPath = (path || "").toString().replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
};

const logoUrl = resolvePublicPath("og-image.png");
const bgVideoUrl = resolvePublicPath("1080-60fps-ai.mp4");
const PACKAGE_PDFS_URL = resolvePublicPath("data/packagePdfs.json");
const PACKAGE_PDFS_MANIFEST_URL = resolvePublicPath(
  "data/packagePdfsManifest.json",
);
const NEW_BOTS_URL = resolvePublicPath("new_bots.json");

const PACKAGE_PDF_FALLBACKS = {
  "باقة الباحث": {
    full: "categorysPdf/with-info/01 Searcher info.pdf",
    summary: "categorysPdf/manifest/01 Searcher.pdf",
  },
  "باقة التعليم والشريعة": {
    full: "categorysPdf/with-info/02 Education & Sharia info.pdf",
    summary: "categorysPdf/manifest/02 Education & Sharia.pdf",
  },
  "باقة المصمم الذكي": {
    full: "categorysPdf/with-info/03 Design info.pdf",
    summary: "categorysPdf/manifest/03 Design.pdf",
  },
  "باقة صناعة الأفلام": {
    full: "categorysPdf/with-info/04 Film info.pdf",
    summary: "categorysPdf/manifest/04 Film.pdf",
  },
  "باقة الإدارة والتسويق": {
    full: "categorysPdf/with-info/05 Marketing info.pdf",
    summary: "categorysPdf/manifest/05 Marketing.pdf",
  },
  "باقة تعليمات النماذج": {
    full: "categorysPdf/with-info/06 instructions info.pdf",
    summary: "categorysPdf/manifest/06 instructions.pdf",
  },
};
const PAYHIP_URL = "https://payhip.com/zraiee";
const PAYHIP_BOOKS_COUNT = 11;

const PACKAGE_ORDER = [
  "باقة الباحث",
  "باقة التعليم والشريعة",
  "باقة المصمم الذكي",
  "باقة صناعة الأفلام",
  "باقة الإدارة والتسويق",
  "باقة تعليمات النماذج",
];

const PACKAGE_ORDER_INDEX = new Map(PACKAGE_ORDER.map((name, i) => [name, i]));
const PACKAGE_KEYWORDS = [...PACKAGE_ORDER];

const norm = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
const stripTashkeel = (s) =>
  (s || "").toString().replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, "");

const sanitizeText = (s, max = 200) => {
  try {
    const t = (s ?? "").toString();
    return t.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
  } catch {
    return "";
  }
};

const toSafeUrl = (value) => {
  try {
    const trimmed = (value ?? "").toString().trim();
    if (!trimmed) return "";
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
};

const normalizeAr = (s) => stripTashkeel((s || "").toString()).toLowerCase();
const tokenize = (s) => normalizeAr(s).trim().split(/\s+/).filter(Boolean);

const getPkgOrder = (name) => {
  const n = stripTashkeel(norm(name));
  if (PACKAGE_ORDER_INDEX.has(n)) return PACKAGE_ORDER_INDEX.get(n);
  for (let i = 0; i < PACKAGE_KEYWORDS.length; i += 1) {
    const kw = PACKAGE_KEYWORDS[i];
    if (n.includes(kw)) return i;
  }
  return Number.POSITIVE_INFINITY;
};

const normalizeKeyName = (key) =>
  stripTashkeel((key || "").toString())
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "")
    .toLowerCase();

const formatModelLabel = (name) => {
  try {
    const raw = (name ?? "").toString();
    const lower = raw.toLowerCase();
    if (!lower) return raw;
    if (["4o", "gpt-4o", "gpt4o"].includes(lower)) return "4o";
    if (["4o-mini", "gpt-4o-mini", "gpt4o-mini"].includes(lower)) {
      return "4o-mini";
    }
    if (["5", "gpt-5", "gpt5"].includes(lower)) return "GPT-5";
    if (lower.startsWith("link")) {
      const match = lower.match(/link[-_]?(\d+)/);
      return match && match[1] ? `رابط ${match[1]}` : "رابط";
    }
    return raw;
  } catch {
    return name;
  }
};

const CHATGPT_MODEL_NAMES = new Set([
  "4o",
  "gpt4o",
  "gpt-4o",
  "4omini",
  "gpt4omini",
  "gpt-4o-mini",
  "gpt5",
  "gpt-5",
  "5",
  "chatgpt",
]);

const GEMINI_MODEL_NAMES = new Set([
  "gemini",
  "geminipro",
  "gemini-pro",
  "geminiflash",
  "gemini-flash",
  "gemini15pro",
  "gemini-1.5-pro",
  "gemini15flash",
  "gemini-1.5-flash",
  "gemini20flash",
  "gemini-2.0-flash",
]);

const getUrlHost = (url) => {
  try {
    return url ? new URL(url).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
};

const isChatGPTUrl = (url) => {
  const host = getUrlHost(url);
  return host.endsWith("chatgpt.com") || host.includes("openai.com");
};

const isGeminiUrl = (url) => {
  const host = getUrlHost(url);
  return host.includes("gemini.google.com") || host.includes("bard.google.com");
};

const getPlatformLinks = (bot) => {
  const entries = Object.entries(bot?.models || {})
    .map(([name, url]) => [name, toSafeUrl(url)])
    .filter(([, url]) => Boolean(url));

  const primaryLink = toSafeUrl(bot?.url);
  let chatgptLink = "";
  let geminiLink = "";

  for (const [name, url] of entries) {
    const modelKey = normalizeKeyName(name);

    if (
      !chatgptLink &&
      (isChatGPTUrl(url) ||
        CHATGPT_MODEL_NAMES.has(modelKey) ||
        modelKey.includes("gpt") ||
        modelKey.includes("chatgpt"))
    ) {
      chatgptLink = url;
      continue;
    }

    if (
      !geminiLink &&
      (isGeminiUrl(url) ||
        GEMINI_MODEL_NAMES.has(modelKey) ||
        modelKey.includes("gemini"))
    ) {
      geminiLink = url;
    }
  }

  if (primaryLink) {
    if (!chatgptLink && isChatGPTUrl(primaryLink)) chatgptLink = primaryLink;
    if (!geminiLink && isGeminiUrl(primaryLink)) geminiLink = primaryLink;
  }

  const links = [];
  if (chatgptLink) {
    links.push({ id: "chatgpt", label: "تشات جي بي تي", url: chatgptLink });
  }
  if (geminiLink) {
    links.push({ id: "gemini", label: "جيميناي", url: geminiLink });
  }
  return links;
};

async function loadJsonArray(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function buildPdfLookup(entries) {
  const direct = new Map();
  const normalized = new Map();
  for (const entry of entries) {
    const rawTitle = sanitizeText(entry?.title, 200);
    const file = (entry?.file ?? "").toString().trim();
    if (!rawTitle || !file) continue;
    direct.set(rawTitle, file);
    const normalizedKey = normalizeKeyName(rawTitle);
    if (normalizedKey) normalized.set(normalizedKey, file);
  }
  return { direct, normalized };
}

function getPdfFile(packageName, lookup) {
  if (!packageName || !lookup) return null;
  if (lookup.direct.has(packageName)) return lookup.direct.get(packageName);
  const normalizedKey = normalizeKeyName(packageName);
  if (!normalizedKey) return null;
  return lookup.normalized.get(normalizedKey) || null;
}

function getPdfFallbackFile(packageName, variant = "full") {
  const direct = PACKAGE_PDF_FALLBACKS[packageName];
  if (direct?.[variant]) return direct[variant];

  const normalizedPackage = normalizeKeyName(packageName);
  for (const [name, variants] of Object.entries(PACKAGE_PDF_FALLBACKS)) {
    if (normalizeKeyName(name) === normalizedPackage) {
      return variants?.[variant] || null;
    }
  }
  return null;
}

function normalizePdfFileCandidate(candidate, fallbackFile = null) {
  const raw = (candidate || "").toString().trim();
  const fallback = (fallbackFile || "").toString().trim();

  if (!raw) return fallback || null;
  if (/\.html?$/i.test(raw)) return fallback || null;

  if (/\.pdf$/i.test(raw)) {
    if (raw.includes("/")) return raw;
    if (fallback && fallback.includes("/")) {
      const baseDir = fallback.split("/").slice(0, -1).join("/");
      return `${baseDir}/${raw}`;
    }
    return raw;
  }

  return fallback || raw || null;
}

function getPdfUrl(packageName, lookup, variant = "full") {
  const fallbackFile = getPdfFallbackFile(packageName, variant);
  const lookedUpFile = getPdfFile(packageName, lookup);
  const file = normalizePdfFileCandidate(lookedUpFile, fallbackFile);
  if (!file) return null;
  return resolvePublicPath(file);
}

function runDevAssertions() {
  if (typeof window === "undefined") return;
  if (typeof import.meta === "undefined" || !import.meta.env?.DEV) return;

  console.assert(
    resolvePublicPath("data/packagePdfs.json").includes("packagePdfs.json"),
    "resolvePublicPath should build a usable public URL for packagePdfs.json",
  );

  console.assert(
    Array.isArray(getPlatformLinks({ models: {} })),
    "getPlatformLinks should always return an array",
  );

  const bothPlatforms = getPlatformLinks({
    url: "",
    models: {
      "gpt-5": "https://chatgpt.com/g/test",
      gemini: "https://gemini.google.com/app/test",
    },
  });

  console.assert(
    bothPlatforms.length === 2 &&
      bothPlatforms[0].label === "تشات جي بي تي" &&
      bothPlatforms[1].label === "جيميناي",
    "getPlatformLinks should detect ChatGPT and Gemini correctly",
  );

  const emptyLookup = buildPdfLookup([]);
  console.assert(
    getPdfUrl("باقة الباحث", emptyLookup, "full")?.includes("categorysPdf/with-info/01%20Searcher%20info.pdf") ||
      getPdfUrl("باقة الباحث", emptyLookup, "full")?.includes("categorysPdf/with-info/01 Searcher info.pdf"),
    "getPdfUrl should fall back to the actual full PDF path for باقة الباحث",
  );

  console.assert(
    getPdfUrl("باقة تعليمات النماذج", emptyLookup, "summary")?.includes("categorysPdf/manifest/06%20instructions.pdf") ||
      getPdfUrl("باقة تعليمات النماذج", emptyLookup, "summary")?.includes("categorysPdf/manifest/06 instructions.pdf"),
    "getPdfUrl should fall back to the actual summary PDF path for باقة تعليمات النماذج",
  );

  console.assert(
    normalizePdfFileCandidate(
      "06 instructions info.htm",
      "categorysPdf/with-info/06 instructions info.pdf",
    ) === "categorysPdf/with-info/06 instructions info.pdf",
    "normalizePdfFileCandidate should prefer the actual PDF fallback when JSON returns an HTML file",
  );

  console.assert(
    normalizePdfFileCandidate(
      "01 Searcher.pdf",
      "categorysPdf/manifest/01 Searcher.pdf",
    ) === "categorysPdf/manifest/01 Searcher.pdf",
    "normalizePdfFileCandidate should place a bare PDF filename inside the real manifest folder",
  );

  console.assert(
    Boolean(SOCIAL_ICONS.whatsapp) && Boolean(SOCIAL_ICONS.books) && Boolean(SOCIAL_ICONS.bots),
    "Inline SVG icon set should be available without external icon libraries",
  );
}

runDevAssertions();

const DEFAULT_BOT_ABOUT =
  "يُعدُّ هذا البوت أداةً ذكية متخصصة في دعم الباحثين وطلاب الدراسات العليا في اختيار عناوين أصيلة ومتميزة لرسائل الماجستير والدكتوراه، من خلال تحليل التخصصات الأكاديمية واستنباط الفرص البحثية غير المستكشفة.";
const DEFAULT_BOT_LIMITS =
  "تعمل ضمن نطاق أكاديمي صارم، وتلتزم بالأصالة البحثية والحياد والدقة واللغة العربية الفصيحة والتوثيق العلمي السليم. لا تقدّم اقتراحات عامة متداولة.";
const DEFAULT_BOT_EXAMPLE =
  "أدخل تخصصك (مثل: التربية الخاصة)، وسيقترح البوت 3 عناوين أصيلة لرسائل ماجستير ضمن هذا المجال.";

const SORTS = [
  { id: "popular", label: "الأكثر استخدامًا" },
  { id: "new", label: "الأحدث" },
  { id: "az", label: "أبجديًا" },
];

const BOTS = [
  {
    id: "gpts-portal",
    title: "GPTs — النماذج الذكية",
    category: "المحتوى واللغة",
    tags: ["عام", "تجميعة"],
    url: "https://chatgpt.com/g/g-681f47498138819197d357982c29544c-nmdhj-jy-by-ty-ldhky-custom-gpts?model=gpt-4o",
    badge: "مجاني",
    accent: "from-lime-400 to-emerald-500",
    score: 96,
    date: 20240710,
    package: "باقة عامة",
    packageTitle: "باقة عامة",
    packageSubtitle: "",
    models: {},
    about: DEFAULT_BOT_ABOUT,
    limits: DEFAULT_BOT_LIMITS,
    example: DEFAULT_BOT_EXAMPLE,
  },
];

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

const CATEGORY_ACCENTS = {
  "الباحث العلمي": "from-violet-500 to-fuchsia-500",
  "المحتوى واللغة": "from-lime-400 to-emerald-500",
  "التصميم والإبداع": "from-rose-500 to-pink-500",
  "الإدارة والتسويق": "from-amber-400 to-orange-500",
  "باقة الإدارة والتسويق": "from-teal-400 to-emerald-500",
  "باقة الأنظمة والقوانين": "from-zinc-400 to-gray-600",
  "غير مصنّف": "from-zinc-400 to-gray-600",
};

const pickAccentByCategory = (category) => {
  const c = (category || "").toString().trim();
  if (!c) return ACCENTS[0];
  if (CATEGORY_ACCENTS[c]) return CATEGORY_ACCENTS[c];
  let hash = 0;
  for (let i = 0; i < c.length; i += 1) {
    hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
};

const getAccent = (b) => pickAccentByCategory(b?.category);
const fmt = (n) => new Intl.NumberFormat("ar-SA").format(n);

const SOCIAL_ICONS = {
  whatsapp: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0012.07 0C5.56 0 .25 5.3.25 11.82c0 2.08.54 4.11 1.58 5.9L0 24l6.45-1.69a11.76 11.76 0 005.62 1.43h.01c6.51 0 11.82-5.3 11.82-11.82 0-3.16-1.23-6.12-3.38-8.44zM12.08 21.7a9.8 9.8 0 01-5-1.37l-.36-.21-3.83 1 1.02-3.73-.23-.38a9.83 9.83 0 01-1.5-5.2c0-5.43 4.42-9.85 9.86-9.85 2.63 0 5.1 1.02 6.96 2.89a9.78 9.78 0 012.89 6.97c0 5.43-4.42 9.85-9.85 9.85zm5.4-7.37c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.23-.65.08-.3-.15-1.28-.47-2.43-1.5a9.03 9.03 0 01-1.68-2.1c-.18-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.53.08-.8.38-.27.3-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.06 3.15 5 4.41.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.11.56-.08 1.78-.73 2.03-1.44.25-.71.25-1.32.17-1.44-.07-.12-.27-.2-.57-.35z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M9.04 15.47l-.38 5.34c.54 0 .78-.23 1.06-.5l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9l3.48-16.3h.01c.31-1.45-.52-2.02-1.47-1.67L1.78 10.3C.4 10.84.42 11.6 1.55 11.95l5.05 1.58L18.32 6.2c.55-.34 1.05-.15.63.19" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.26l-4.9-6.42L6.42 22H3.3l7.24-8.27L.8 2h6.42l4.43 5.85L18.9 2zm-1.1 18h1.73L6.3 3.9H4.45L17.8 20z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 00.5 6.2 31.3 31.3 0 000 12a31.3 31.3 0 00.5 5.8 3.02 3.02 0 002.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.56a3.02 3.02 0 002.12-2.14A31.3 31.3 0 0024 12a31.3 31.3 0 00-.5-5.8zM9.6 15.5v-7L15.8 12l-6.2 3.5z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2.2A2.8 2.8 0 004.2 7v10A2.8 2.8 0 007 19.8h10a2.8 2.8 0 002.8-2.8V7A2.8 2.8 0 0017 4.2H7zm10.25 1.65a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.87.25-1.46 1.5-1.46h1.6V4.96c-.28-.04-1.23-.12-2.34-.12-2.31 0-3.89 1.41-3.89 4v2.24H7.5v3h2.87v8h3.13z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2c.43 1.72 1.46 3.2 2.95 4.2A7.3 7.3 0 0022 7.3v3.1a10.5 10.5 0 01-5.5-1.55v6.48a5.83 5.83 0 11-5.83-5.83c.33 0 .66.03.98.08v3.18a2.7 2.7 0 101.72 2.57V2h3.13z" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.51l9 5.63 9-5.63V7H3zm18 10V9.86l-8.48 5.3a1 1 0 01-1.04 0L3 9.86V17h18z" />
    </svg>
  ),
  paypal: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M7.2 3H14c2.86 0 4.86.6 5.75 2 .78 1.23.84 2.76.36 4.75-.55 2.25-1.63 3.54-3.24 4.17-.99.38-2.22.54-3.72.54H12l-.73 4.54H6.5L7.2 3zm2.6 2.2L8.2 15h2.35l.42-2.6h1.84c1.27 0 2.2-.13 2.87-.44.96-.44 1.6-1.36 1.92-2.83.3-1.33.12-2.23-.5-2.8-.6-.55-1.56-.73-3.2-.73H9.8z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.49 2.49 0 11.02 4.98 2.49 2.49 0 01-.02-4.98zM3 9h4v12H3V9zm7 0h3.83v1.64h.05c.53-1 1.84-2.05 3.8-2.05 4.07 0 4.82 2.68 4.82 6.16V21h-4v-5.52c0-1.32-.03-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.93V21h-4V9z" />
    </svg>
  ),
  books: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v17.5a2.5 2.5 0 01-2.5 2.5H6.5A2.5 2.5 0 014 19.5v-15zM6.5 4A.5.5 0 006 4.5V18h11.5a.5.5 0 00.5-.5V4H6.5zm1.5 2h7v2H8V6zm0 4h7v2H8v-2z" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M11 3h2v9.17l2.59-2.58L17 11l-5 5-5-5 1.41-1.41L11 12.17V3zm-7 14h16v4H4v-4z" />
    </svg>
  ),
  subscribe: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.83 5.74L21 8.63l-4.5 4.39 1.06 6.22L12 16.77 6.44 19.24 7.5 13.02 3 8.63l6.17-.89L12 2z" />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
    </svg>
  ),
  bots: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 2a2 2 0 012 2v1h1.5A3.5 3.5 0 0119 8.5V13a3 3 0 01-3 3h-1.1l1.55 2.06A1 1 0 0115.65 20H8.35a1 1 0 01-.8-1.6L9.1 16H8a3 3 0 01-3-3V8.5A3.5 3.5 0 018.5 5H10V4a2 2 0 012-2zm-2 3h4V4h-4v1zm-1.5 2A1.5 1.5 0 007 8.5V13a1 1 0 001 1h8a1 1 0 001-1V8.5A1.5 1.5 0 0015.5 7h-7zM9 9.5A1.5 1.5 0 1010.5 11 1.5 1.5 0 009 9.5zm6 0A1.5 1.5 0 1016.5 11 1.5 1.5 0 0015 9.5z" />
    </svg>
  ),
};

const CATEGORY_ICONS = {
  "الباحث العلمي": (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90">
      <path d="M12 2a7 7 0 00-7 7v2H4a2 2 0 00-2 2v7h20v-7a2 2 0 00-2-2h-1V9a7 7 0 00-7-7zm-5 9V9a5 5 0 0110 0v2H7zm-3 2h16v5H4v-5z" />
    </svg>
  ),
  "المحتوى واللغة": (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90">
      <path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
    </svg>
  ),
  "التصميم والإبداع": (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90">
      <path d="M12 2l9 4-9 4-9-4 9-4zm9 7l-9 4-9-4v7l9 4 9-4V9z" />
    </svg>
  ),
  "الإدارة والتسويق": (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90">
      <path d="M3 13h18v2H3v-2zm0 4h12v2H3v-2zM3 5h18v6H3V5z" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

export default function App() {
  const [route, setRoute] = useState(
    (typeof window !== "undefined" && window.location.hash.replace("#", "")) || "/",
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [sort, setSort] = useState(SORTS[0].id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bots, setBots] = useState(BOTS);
  const [botModal, setBotModal] = useState(null);
  const [catsExpanded, setCatsExpanded] = useState(() => {
    try {
      const v = localStorage.getItem("bots:catsExpanded");
      if (v != null) return v === "1";
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(min-width: 768px)").matches;
      }
      return true;
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [expandedPkgs, setExpandedPkgs] = useState(() => {
    try {
      const raw = localStorage.getItem("bots:expandedPkgs");
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  const [pdfLookup, setPdfLookup] = useState(() => buildPdfLookup([]));
  const [pdfManifestLookup, setPdfManifestLookup] = useState(() =>
    buildPdfLookup([]),
  );
  const bgRef = useRef(null);
  const [showTop, setShowTop] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(true);

  const openExternal = (url) => {
    try {
      clearTimeout(toastTimerRef.current);
    } catch {
      // no-op
    }
    const safe = toSafeUrl(url);
    if (!safe) {
      setToast("الرابط غير صالح");
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      window.open(safe, "_blank", "noopener,noreferrer");
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        "bots:expandedPkgs",
        JSON.stringify(Array.from(expandedPkgs)),
      );
    } catch {
      // no-op
    }
  }, [expandedPkgs]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [pdfs, manifest] = await Promise.all([
        loadJsonArray(PACKAGE_PDFS_URL),
        loadJsonArray(PACKAGE_PDFS_MANIFEST_URL),
      ]);
      if (!active) return;
      setPdfLookup(buildPdfLookup(pdfs));
      setPdfManifestLookup(buildPdfLookup(manifest));
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(NEW_BOTS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const flat = [];
        const packages =
          data && typeof data === "object" && !Array.isArray(data) ? data : {};

        const deriveModelLabel = (link, index, total) => {
          try {
            const url = new URL(link);
            const slug = url.pathname.split("/").pop() || "";
            const modMatch = slug.match(/mod[-_]?([a-z0-9]+)/i);
            if (modMatch && modMatch[1]) return formatModelLabel(modMatch[1]);
            const gptMatch = slug.match(/(gpt[-_]?\w+)/i);
            if (gptMatch && gptMatch[1]) return formatModelLabel(gptMatch[1]);
            const simpleMatch = slug.match(/(4o-mini|4o|5|mini|plus)/i);
            if (simpleMatch && simpleMatch[1]) {
              return formatModelLabel(simpleMatch[1]);
            }
          } catch {
            // no-op
          }
          return total > 1 ? `رابط ${index + 1}` : "رابط";
        };

        Object.entries(packages).forEach(([packageRaw, categoriesObj]) => {
          if (!categoriesObj || typeof categoriesObj !== "object") return;
          const packageLines = (packageRaw ?? "")
            .toString()
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);

          const packageTitle =
            sanitizeText(packageLines[0] ?? "", 160) || "حزمة";
          const packageSubtitle = sanitizeText(
            packageLines.slice(1).join(" — "),
            260,
          );
          const packageName = packageTitle;

          Object.entries(categoriesObj).forEach(([categoryRaw, botsArr]) => {
            const category =
              sanitizeText(categoryRaw ?? "", 160) || "غير مصنّف";
            if (!Array.isArray(botsArr)) return;

            for (let i = 0; i < botsArr.length; i += 1) {
              const entry = botsArr[i] || {};
              const title =
                sanitizeText(
                  entry?.title || entry?.name || `بوت ${i + 1}`,
                  200,
                ) || `بوت ${i + 1}`;
              const details =
                entry?.details && typeof entry.details === "object"
                  ? entry.details
                  : {};
              const about = sanitizeText(details["نبذة"], 2000) || DEFAULT_BOT_ABOUT;
              const limits =
                sanitizeText(details["حدود"], 1600) || DEFAULT_BOT_LIMITS;
              const example =
                sanitizeText(details["مثال"], 600) || DEFAULT_BOT_EXAMPLE;
              const rawLinks = Array.isArray(details["روابط"])
                ? details["روابط"]
                : [];
              const cleanedLinks = rawLinks
                .map((rawLink) =>
                  (rawLink ?? "").toString().replace(/^[:\s]+/, "").trim(),
                )
                .map((link) => toSafeUrl(link))
                .filter(Boolean);

              const canonicalModels = {};
              cleanedLinks.forEach((link, linkIndex) => {
                let label = deriveModelLabel(
                  link,
                  linkIndex,
                  cleanedLinks.length,
                );
                if (canonicalModels[label]) {
                  let suffix = 2;
                  while (canonicalModels[`${label} ${suffix}`]) suffix += 1;
                  label = `${label} ${suffix}`;
                }
                canonicalModels[label] = link;
              });

              flat.push({
                id: `${normalizeKeyName(packageName) || "pkg"}-${normalizeKeyName(category) || "cat"}-${i}`,
                title,
                package: packageName,
                packageTitle,
                packageSubtitle,
                category,
                accent: pickAccentByCategory(category),
                url: cleanedLinks[0] || "",
                hasLink: Boolean(cleanedLinks[0]),
                models: canonicalModels,
                about,
                limits,
                example,
                tags: [],
                badge: "",
                score: 0,
                date: 0,
              });
            }
          });
        });

        if (isMounted) setBots(flat.length ? flat : BOTS);
      } catch (err) {
        console.error("Failed to load new_bots.json:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (navigator?.storage?.persist) navigator.storage.persist();
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bots:ui");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.q === "string") setQ(s.q);
      if (typeof s.cat === "string") setCat(s.cat);
      if (typeof s.sort === "string") {
        const ok = SORTS.some((x) => x.id === s.sort);
        setSort(ok ? s.sort : SORTS[0].id);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("bots:ui", JSON.stringify({ q, cat, sort }));
    } catch {
      // no-op
    }
  }, [q, cat, sort]);

  useEffect(() => {
    try {
      localStorage.setItem("bots:catsExpanded", catsExpanded ? "1" : "0");
    } catch {
      // no-op
    }
  }, [catsExpanded]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const b of bots) {
      const c = (b?.category || "").toString().trim();
      if (c) set.add(c);
    }
    return ["الكل", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ar"))];
  }, [bots]);

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
      const c = (b?.category || "").toString().trim() || "غير مصنّف";
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return counts;
  }, [bots, q]);

  useEffect(() => {
    if (!categories.includes(cat)) setCat("الكل");
  }, [categories, cat]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      setProgress(p);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let rows = bots.filter((b) => (cat === "الكل" ? true : b.category === cat));
    if (tokens.length) {
      rows = rows.filter((b) => {
        const title = b.title.toLowerCase();
        const catL = (b.category || "").toLowerCase();
        return tokens.every((tok) => title.includes(tok) || catL.includes(tok));
      });
    }
    if (sort === "popular") rows.sort((a, b) => b.score - a.score);
    if (sort === "new") rows.sort((a, b) => b.date - a.date);
    if (sort === "az") rows.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return rows;
  }, [q, cat, sort, bots]);

  const botTitles = useMemo(() => {
    try {
      return Array.from(
        new Set(bots.map((b) => (b.title || "").toString().trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "ar"));
    } catch {
      return [];
    }
  }, [bots]);

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
        if (e.key === "ArrowDown") {
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        }
        if (e.key === "ArrowUp") setSelectedIndex((i) => Math.max(i - 1, 0));
        if (e.key === "Enter") {
          const item = filtered[selectedIndex];
          if (item) openExternal(item.url);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, filtered, selectedIndex]);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.replace("#", "") || "/";
      setRoute(h);
    };
    window.addEventListener("hashchange", sync);
    sync();
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (route === "/books" && typeof window !== "undefined") {
      try {
        window.open(PAYHIP_URL, "_blank", "noopener,noreferrer");
      } catch {
        window.location.assign(PAYHIP_URL);
      }
      if (window.location.hash !== "#/") window.location.hash = "#/";
      else setRoute("/");
    }
  }, [route]);

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
    } catch {
      // no-op
    }
  };

  const copyLink = async (url) => {
    const safe = toSafeUrl(url);
    if (!safe) {
      try {
        clearTimeout(toastTimerRef.current);
      } catch {
        // no-op
      }
      setToast("تعذّر نسخ الرابط: العنوان غير صالح");
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      await navigator.clipboard.writeText(safe);
      try {
        clearTimeout(toastTimerRef.current);
      } catch {
        // no-op
      }
      setToast("تم نسخ الرابط");
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = safe;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        try {
          clearTimeout(toastTimerRef.current);
        } catch {
          // no-op
        }
        setToast("تم نسخ الرابط");
        toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      } catch {
        // no-op
      }
    }
  };

  const groupedPackages = useMemo(() => {
    const pkgMap = new Map();
    for (const b of filtered) {
      const pkgKey = b.package || "حزمة";
      const displayName = b.packageTitle || pkgKey;
      const subtitle = b.packageSubtitle || "";
      const catName = b.category || "غير مصنّف";
      if (!pkgMap.has(pkgKey)) {
        pkgMap.set(pkgKey, { displayName, subtitle, catMap: new Map() });
      }
      const entry = pkgMap.get(pkgKey);
      if (!entry.catMap.has(catName)) entry.catMap.set(catName, []);
      entry.catMap.get(catName).push(b);
    }

    const out = [];
    for (const [pkgKey, entry] of pkgMap.entries()) {
      const cats = [];
      for (const [catName, rows] of entry.catMap.entries()) {
        cats.push({ name: catName, accent: pickAccentByCategory(catName), rows });
      }
      cats.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      out.push({
        key: pkgKey,
        name: entry.displayName || pkgKey,
        subtitle: entry.subtitle || "",
        accent: cats[0]?.accent || pickAccentByCategory(entry.displayName || pkgKey),
        cats,
      });
    }

    out.sort((a, b) => {
      const oa = getPkgOrder(a.name);
      const ob = getPkgOrder(b.name);
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, "ar");
    });

    return out;
  }, [filtered]);

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
    window.addEventListener("scroll", onWinScroll, { passive: true });
    onWinScroll();
    return () => window.removeEventListener("scroll", onWinScroll);
  }, []);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="relative min-h-screen bg-neutral-950 text-neutral-100 selection:bg-lime-300/30 selection:text-white theme-nvidia font-arabic"
      id="top"
    >
      <div ref={bgRef} aria-hidden className="liquid-ether">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div
        className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-lime-300 via-emerald-400 to-lime-300 origin-left"
        style={{ transform: `scaleX(${progress})` }}
      />

      <header className="sticky top-0 z-40 backdrop-blur bg-neutral-900/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <a href="#/" aria-label="الصفحة الرئيسية" className="inline-grid">
                <motion.div
                  initial={{ opacity: 0.9, scale: 0.98 }}
                  animate={{ opacity: [0.9, 1, 0.9], scale: 1 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }}
                  className="relative inline-grid w-12 h-12 md:w-14 md:h-14 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
                  aria-hidden
                >
                  <img src={logoUrl} alt="الشعار" className="block h-full w-full object-cover" />
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgba(163,230,53,0.15),transparent)]" />
                </motion.div>
              </a>
              <a href="#/" className="focus:outline-none">
                <strong className="text-lg md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text drop-shadow-[0_2px_6px_rgba(16,185,129,0.25)] animate-gradient-slow">
                  بوابة النماذج العربية الذكية
                </strong>
              </a>
            </div>
          </div>
        </div>
      </header>

      <GooeyNav route={route} />

      {route === "/" && (
        <>
          <section className="relative mx-auto max-w-7xl px-4 md:px-6 pt-12 md:pt-18">
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
              <div className="md:col-span-7">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: [0.96, 1, 0.96], y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    opacity: {
                      duration: 8,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    },
                  }}
                  className="text-3xl/tight md:text-5xl/tight font-bold tracking-[-0.02em] bg-gradient-to-r from-neutral-50 via-lime-200 to-neutral-200 bg-clip-text text-transparent drop-shadow animate-gradient-slow"
                >
                  منصّة النماذج العربية الذكية — طوّر أداءك بإتقان
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: [0.92, 1, 0.92], y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    delay: 0.05,
                    opacity: {
                      duration: 10,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                      delay: 0.8,
                    },
                  }}
                  className="mt-3 md:mt-4 max-w-2xl text-sm md:text-base bg-gradient-to-r from-neutral-300 via-white to-neutral-300 bg-clip-text text-transparent animate-gradient-slow"
                >
                  واجهات أنيقة وتفاعلات سلسة تساعدك على العثور على المنصة المناسبة بسرعة، مع نافذة موحدة لاختيار المنصة بين تشات جي بي تي وجيميناي.
                </motion.p>
              </div>

              <div className="md:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                  className="relative aspect-[5/3] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl"
                >
                  {heroVideoReady ? (
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      src={bgVideoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onError={() => setHeroVideoReady(false)}
                    >
                      <source src={bgVideoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_50%_35%,rgba(16,185,129,0.24),transparent),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,10,10,1))]">
                      <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                      <div className="relative z-10 flex h-full items-end justify-start p-6">
                        <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
                          <p className="text-sm font-bold text-white/90">تعذّر تحميل الفيديو التمهيدي</p>
                          <p className="mt-1 text-xs text-white/65">
                            أضف الملف داخل public باسم 1080-60fps-ai.mp4 ليظهر تلقائيًا.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgba(163,230,53,0.15),transparent)]" />
                  <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                </motion.div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 md:px-6 mt-8">
            <div className="flex flex-wrap items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
              <div
                className={`relative basis-full grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${
                  catsExpanded ? "max-h-none overflow-visible" : "max-h-10 overflow-hidden"
                }`}
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
                      {c !== "الكل" && (
                        <span className="mx-1 rounded-full border border-white/15 bg-black/20 px-1.5 py-0.5 text-[10px] opacity-90">
                          {categoryCounts.get(c) || 0}
                        </span>
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
                  aria-expanded={catsExpanded}
                  aria-label="تبديل عرض الفئات"
                >
                  <span className="mx-1">{catsExpanded ? "إخفاء" : "إظهار المزيد"}</span>
                  <span className="text-lg leading-none">{catsExpanded ? "▲" : "▼"}</span>
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="relative flex w-[220px] md:w-[360px] items-center nv-input">
                  <svg className="ml-1 h-4 w-4 shrink-0 text-white/50" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 20l-5.2-5.2a7 7 0 10-1.4 1.4L20 21zM10 16a6 6 0 110-12 6 6 0 010 12z" />
                  </svg>
                  <input
                    type="search"
                    inputMode="search"
                    autoComplete="off"
                    maxLength={200}
                    aria-label="بحث"
                    value={q}
                    onChange={(e) => setQ(sanitizeText(e.target.value))}
                    placeholder="ابحث باسم البوت…"
                    list="bot-names"
                    className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-white/50 border-0 shadow-none focus:ring-0 appearance-none"
                  />
                  <datalist id="bot-names">
                    {botTitles.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  {!!q && (
                    <button
                      onClick={() => setQ("")}
                      className="ml-auto rounded-full px-2 py-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                      title="مسح البحث"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      SORTS.some((s) => s.id === e.target.value)
                        ? e.target.value
                        : SORTS[0].id,
                    )
                  }
                  className="nv-select text-sm border-0 bg-transparent shadow-none focus:ring-0 appearance-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs md:text-sm text-white/70">نتائج: {fmt(filtered.length)} بوت</p>

            <div className="mt-4 space-y-8">
              {groupedPackages.map((pkg) => {
                const packagePdfUrl = getPdfUrl(pkg.name, pdfLookup, "full");
                const packagePdfManifestUrl = getPdfUrl(
                  pkg.name,
                  pdfManifestLookup,
                  "summary",
                );
                const botsCount = pkg.cats?.reduce((sum, c) => sum + (c.rows?.length || 0), 0) || 0;
                const pkgPanelId = `pkg-panel-${(pkg.key || pkg.name || "")
                  .toString()
                  .replace(/\s+/g, "-")
                  .replace(/[^\w\-]/g, "")}`;

                return (
                  <section
                    key={pkg.key || pkg.name}
                    aria-label={pkg.name}
                    className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-3 md:p-5 shadow"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-10%" }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`${
                        expandedPkgs.has(pkg.key || pkg.name)
                          ? "sticky top-16 md:top-20 z-10 -mx-3 md:-mx-5 px-3 md:px-5 py-2 rounded-2xl bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/55"
                          : ""
                      } flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const k = pkg.key || pkg.name;
                            setExpandedPkgs((prev) => {
                              const next = new Set(prev);
                              if (next.has(k)) next.delete(k);
                              else next.add(k);
                              return next;
                            });
                          }}
                          aria-expanded={expandedPkgs.has(pkg.key || pkg.name)}
                          aria-controls={pkgPanelId}
                          className="inline-flex items-center gap-2 text-xl md:text-2xl font-extrabold text-white rounded-full border border-white/10 px-4 py-1.5 bg-neutral-800 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:bg-emerald-500"
                        >
                          <span className="opacity-90">{CATEGORY_ICONS[pkg.name] || CATEGORY_ICONS.default}</span>
                          {pkg.name}
                          <span className="mx-1 text-xs font-semibold text-white/80 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                            {pkg.cats.length}
                          </span>
                          <span
                            className={`ms-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/80 transition-transform ${
                              expandedPkgs.has(pkg.key || pkg.name)
                                ? "rotate-180"
                                : "rotate-0"
                            }`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7 10l5 5 5-5H7z" />
                            </svg>
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-2 md:gap-3 pl-2 md:pl-4">
                        {packagePdfUrl && (
                          <a
                            href={packagePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح النسخة الكاملة PDF مباشرة"
                            className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-bold bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow hover:shadow-lg transition"
                          >
                            الشرح الكامل
                          </a>
                        )}
                        {packagePdfManifestUrl && (
                          <a
                            href={packagePdfManifestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح النسخة المختصرة PDF مباشرة"
                            className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-bold bg-gradient-to-br from-blue-400 to-cyan-400 text-blue-950 shadow hover:shadow-lg transition"
                          >
                            مختصر
                          </a>
                        )}
                        <a
                          href="https://www.youtube.com/watch?v=cB5VyUtnyzY&t=200s"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="فتح الفيديو مباشرة"
                          className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-white shadow hover:shadow-lg transition bg-[linear-gradient(to_right,#1E3A8A,#3B82F6)]"
                        >
                          فيديو
                        </a>
                      </div>
                    </motion.div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/70">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                        <span className="text-emerald-400">{SOCIAL_ICONS.categories}</span>
                        <span className="font-semibold text-white">{pkg.cats.length}</span>
                        <span>فئات</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                        <span className="text-sky-400">{SOCIAL_ICONS.bots}</span>
                        <span className="font-semibold text-white">{botsCount}</span>
                        <span>بوت</span>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {expandedPkgs.has(pkg.key || pkg.name) && (
                        <motion.div
                          key={pkgPanelId}
                          id={pkgPanelId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                          className="overflow-hidden mt-3 space-y-5"
                        >
                          {pkg.cats.map((catItem) => (
                            <div key={`${pkg.name}-${catItem.name}`} className="space-y-2">
                              <div className="flex items-center gap-2 mb-1 justify-end">
                                <div className="hidden md:block h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                                <span
                                  className={`inline-flex items-center gap-1 text-sm md:text-base text-white/90 rounded-full border border-white/10 px-2 py-0.5 bg-gradient-to-br ${catItem.accent} shadow-[0_0_18px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm animate-gradient-slow`}
                                >
                                  {catItem.name}
                                </span>
                                <span className="hidden md:inline text-xs text-white/60">
                                  {catItem.rows.length} بوت
                                </span>
                                <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <AnimatePresence mode="popLayout">
                                  {catItem.rows.map((b) => {
                                    const platformLinks = getPlatformLinks(b);
                                    const launchLink = platformLinks[0]?.url || "";
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
                                          <h3 className="mt-2 line-clamp-2 text-base md:text-lg leading-snug font-bold tracking-tight drop-shadow-sm min-h-[2.75rem] md:min-h-[3.125rem]">
                                            {b.title}
                                          </h3>

                                          <div className="mt-2 grid grid-cols-3 gap-3 text-xs pb-2">
                                            <button
                                              onClick={() => setBotModal({ type: "about", bot: b })}
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              نبذة
                                            </button>
                                            <button
                                              onClick={() => setBotModal({ type: "limits", bot: b })}
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              حدود البوت
                                            </button>
                                            <button
                                              onClick={() => setBotModal({ type: "example", bot: b })}
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              مثال
                                            </button>
                                          </div>

                                          <div className="mt-auto space-y-2 text-xs">
                                            <div className="grid grid-cols-2 gap-2">
                                              <button
                                                type="button"
                                                onMouseEnter={() => {
                                                  const chatgptUrl = platformLinks.find((p) => p.id === "chatgpt")?.url;
                                                  if (chatgptUrl) warmUp(chatgptUrl);
                                                }}
                                                onClick={() => {
                                                  const chatgptUrl = platformLinks.find((p) => p.id === "chatgpt")?.url;
                                                  if (!chatgptUrl) return;
                                                  openExternal(chatgptUrl);
                                                }}
                                                disabled={!platformLinks.some((p) => p.id === "chatgpt")}
                                                className="grid place-items-center rounded-2xl bg-gradient-to-br from-lime-400 via-emerald-500 to-lime-400 px-3 py-3 font-bold text-white shadow hover:shadow-lg animate-gradient-slow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                                              >
                                                ChatGPT
                                              </button>

                                              <button
                                                type="button"
                                                onMouseEnter={() => {
                                                  const geminiUrl = platformLinks.find((p) => p.id === "gemini")?.url;
                                                  if (geminiUrl) warmUp(geminiUrl);
                                                }}
                                                onClick={() => {
                                                  const geminiUrl = platformLinks.find((p) => p.id === "gemini")?.url;
                                                  if (!geminiUrl) return;
                                                  openExternal(geminiUrl);
                                                }}
                                                disabled={!platformLinks.some((p) => p.id === "gemini")}
                                                className="grid place-items-center rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-900/90 to-sky-900/80 px-3 py-3 font-bold text-white shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                                              >
                                                Gemini
                                              </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => copyLink(launchLink)}
                                                disabled={copyDisabled}
                                                className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10"
                                                title="نسخ الرابط"
                                              >
                                                نسخ الرابط
                                              </button>
                                            </div>
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
                );
              })}
            </div>
          </section>

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
                      إغلاق
                    </button>
                  </div>

                  <div className="p-4 md:p-6 text-sm leading-7 text-white/90">
                    {botModal.type === "about" && <p>{botModal.bot.about || DEFAULT_BOT_ABOUT}</p>}
                    {botModal.type === "limits" && <p>{botModal.bot.limits || DEFAULT_BOT_LIMITS}</p>}
                    {botModal.type === "example" && (
                      <div>
                        <p className="mb-2">مثال الاستخدام:</p>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-white/85">
                          {botModal.bot.example || DEFAULT_BOT_EXAMPLE}
                        </div>
                      </div>
                    )}
                    {botModal.type === "choose-platform" && (
                      <div>
                        <p className="mb-3 font-bold text-white/95">اختيار المنصة:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(Array.isArray(botModal.platformLinks)
                            ? botModal.platformLinks
                            : getPlatformLinks(botModal.bot)
                          ).map((platform) => (
                            <a
                              key={`${platform.id}-${platform.url}`}
                              href={platform.url}
                              target="_blank"
                              rel="noopener"
                              className="nv-btn px-3 py-2 text-center text-sm"
                            >
                              {platform.label} ↗
                            </a>
                          ))}
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

      {route === "/about" && (
        <AboutPage
          botsCount={bots.length}
          catsCount={categories.length}
          booksCount={PAYHIP_BOOKS_COUNT}
        />
      )}

      <footer className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/70">
                نصنع تجارب عربية متقنة في الذكاء الاصطناعي. شاركنا اقتراحاتك وروابط البوتات التي تود إضافتها.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href="https://wa.me/966552191598"
                  target="_blank"
                  rel="noopener"
                  aria-label="واتساب"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="واتساب"
                >
                  {SOCIAL_ICONS.whatsapp}
                </a>
                <a
                  href="https://t.me/zraiee"
                  target="_blank"
                  rel="noopener"
                  aria-label="تيليغرام"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="تيليغرام"
                >
                  {SOCIAL_ICONS.telegram}
                </a>
                <a
                  href="https://x.com/Arab_Ai_"
                  target="_blank"
                  rel="noopener"
                  aria-label="منصة إكس"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="منصة إكس"
                >
                  {SOCIAL_ICONS.x}
                </a>
                <a
                  href="https://www.youtube.com/@shaifarah"
                  target="_blank"
                  rel="noopener"
                  aria-label="يوتيوب"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="يوتيوب"
                >
                  {SOCIAL_ICONS.youtube}
                </a>
                <a
                  href="https://www.instagram.com/alzarraei.gpts/"
                  target="_blank"
                  rel="noopener"
                  aria-label="إنستغرام"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="إنستغرام"
                >
                  {SOCIAL_ICONS.instagram}
                </a>
                <a
                  href="https://www.facebook.com/alzarraei.gpts/"
                  target="_blank"
                  rel="noopener"
                  aria-label="فيسبوك"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="فيسبوك"
                >
                  {SOCIAL_ICONS.facebook}
                </a>
                <a
                  href="https://www.tiktok.com/@alzarraei"
                  target="_blank"
                  rel="noopener"
                  aria-label="تيك توك"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="تيك توك"
                >
                  {SOCIAL_ICONS.tiktok}
                </a>
                <a
                  href="https://mail.google.com/mail/?extsrc=mailto&url=mailto:zraieee@gmail.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="البريد الإلكتروني"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="البريد الإلكتروني"
                >
                  {SOCIAL_ICONS.email}
                </a>
                <a
                  href="https://www.paypal.com/paypalme/zraiee"
                  target="_blank"
                  rel="noopener"
                  aria-label="باي بال"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="باي بال"
                >
                  {SOCIAL_ICONS.paypal}
                </a>
                <a
                  href="https://www.linkedin.com/in/abdulrahman-alzarraei/"
                  target="_blank"
                  rel="noopener"
                  aria-label="لينكدإن"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="لينكدإن"
                >
                  {SOCIAL_ICONS.linkedin}
                </a>
              </div>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="nv-btn text-sm"
              aria-label="العودة إلى أعلى الصفحة"
            >
              إلى الأعلى
            </button>
          </div>
        </div>
      </footer>

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

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-16 right-4 z-50 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-lg transition ${
          showTop ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="العودة إلى أعلى الصفحة"
      >
        ↑ إلى الأعلى
      </button>

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
                  aria-label="بحث"
                  placeholder="اكتب للبحث عن أي بوت…"
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
                  <li className="px-3 py-6 text-center text-sm text-white/60">لا نتائج مطابقة…</li>
                )}
                {filtered.map((b, i) => (
                  <li key={b.id}>
                    <button
                      onClick={() => openExternal(b.url)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm transition ${
                        selectedIndex === i ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="line-clamp-1">{b.title}</span>
                      <span className="text-[10px] text-white/60">{b.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/60">
                <span>اختصار: Ctrl/Cmd + K</span>
                <span>الأسهم ↑ ↓ ثم Enter</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/5 bg-neutral-950/80 p-2 backdrop-blur md:hidden">
        <button
          onClick={() => setPaletteOpen(true)}
          className="rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold hover:bg-white/10"
        >
          بحث سريع
        </button>
        <a
          href="#"
          className="grid place-items-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-lime-400 py-2 text-sm font-bold text-white animate-gradient-slow"
        >
          استعراض البوتات
        </a>
      </div>
    </div>
  );
}

function GooeyNav({ route }) {
  const items = [
    { href: "#/", label: "الرئيسية" },
    { href: PAYHIP_URL, label: "الكتب", external: true },
    { href: "#/about", label: "من نحن" },
    {
      href: "https://chatgpt.com/g/g-681f47498138819197d357982c29544c-mns-lnmdhj-ldhky-lbwtt-arabic-gpts",
      label: "منصة النماذج",
      external: true,
    },
    { href: "https://wa.me/966552191598", label: "اشتراك", external: true },
  ];

  return (
    <div className="mx-auto mt-3 max-w-7xl px-4 md:px-6">
      <div className="relative mx-auto flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
        {items.map((it) => {
          const isActive =
            !it.external &&
            ((route === "/" && it.href === "#/") ||
              (route !== "/" && `#${route}` === it.href));

          return (
            <a
              key={`${it.href}-${it.label}`}
              href={it.href}
              target={it.external ? "_blank" : undefined}
              rel={it.external ? "noopener noreferrer" : undefined}
              className={`relative grid flex-1 place-items-center rounded-xl px-3 py-2 text-sm ${
                isActive ? "bg-white/20 text-white" : "bg-transparent text-white/80"
              }`}
            >
              {it.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function AboutPage({ botsCount = 0, catsCount = 0, booksCount = 0 }) {
  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: [0.95, 1, 0.95], y: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
                opacity: {
                  duration: 8,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                },
              }}
              className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow"
            >
              من نحن
            </motion.h1>
            <p className="mt-3 text-white/80 text-sm md:text-base leading-relaxed">
              تضم بوابة النماذج العربية الذكية حزمة متكاملة من الباقات والبوتات المصممة خصيصًا لدعم المستخدم العربي في مجالات متعددة، تشمل البحث العلمي، والتعليم، والشريعة، والتصميم، وصناعة الأفلام، والإدارة، والتسويق، وتعليمات تكوين النماذج. وتُبنى هذه المنظومة لتسهيل الوصول السريع إلى الأدوات المناسبة، مع الحفاظ على جودة العرض وسهولة الاستخدام واتساق التجربة البصرية.
            </p>
          </div>
        </motion.article>
      </section>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/70 to-neutral-950 p-6 md:p-10">
        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: [0.95, 1, 0.95], y: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              opacity: {
                duration: 8,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              },
            }}
            className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow"
          >
            عنّي
          </motion.h2>
          <p className="mt-3 text-white/80 text-sm md:text-base leading-relaxed">
            أسّس هذه المنصة د. عبدالرحمن الزراعي، مشرف أكاديمي وباحث متخصص في مجالات البحوث العلمية، ومهتم ببناء النماذج العربية الذكية وصياغة تعليماتها بطريقة تضمن الاتساق والجودة والموثوقية. ويعمل ضمن هذه الرؤية على تطوير واجهات عربية ميسّرة، وبوتات تخصصية، ومواد تعليمية تساعد المستخدم العربي على الاستفادة العملية من الذكاء الاصطناعي داخل سياقه العلمي والمهني.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-extrabold">{fmt(botsCount)}</div>
              <div className="text-white/60">بوت</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-extrabold">{fmt(catsCount)}</div>
              <div className="text-white/60">فئة</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-extrabold">{fmt(booksCount)}</div>
              <div className="text-white/60">إصدار</div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">الفريق</h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              يعمل المشروع ضمن توجه يزاوج بين البعد الأكاديمي والتقني، ويستند إلى تطوير نماذج متخصصة في البحث، والتحليل، والتعليم، والتصميم، وغيرها، مع الحرص على ضبط المخرجات باللغة العربية الفصحى، ورفع جودة الأداء عبر تعليمات تكوين دقيقة ومواد مساندة منظّمة.
            </p>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">المجتمع</h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نبني مجتمعًا عربيًا مهتمًا باستخدام الذكاء الاصطناعي في ميادين المعرفة والعمل والإبداع، مع التركيز على التطبيقات العملية، وجودة اللغة، وسلامة البناء المنهجي، وتبادل الخبرات داخل بيئة تعليمية موجهة.
            </p>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">رسالتنا</h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نهدف إلى بناء مكتبة عربية من الحلول الذكية التي تراعي الخصوصية الثقافية واللغوية، وتدعم الاستخدام المسؤول للذكاء الاصطناعي عبر مواد تدريبية، وواجهات منظمة، وروابط مباشرة، ونماذج متخصصة قابلة للتطبيق العملي في السياقات الأكاديمية والمؤسسية.
            </p>
          </div>
        </motion.article>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">دوراتنا</h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نقدم دورات تدريبية فردية وجماعية لتعريف المستخدم بواجهة ChatGPT وآليات العمل معها، وبناء التعليمات، وتخصيص النماذج، وفهم منطق التفاعل مع الأنظمة الذكية، إلى جانب دورات متخصصة في مجالات البحث العلمي، والتعليم، والقانون، والتصميم، وصناعة الأفلام، والتسويق، وغيرها.
            </p>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              تعتمد هذه الدورات أسلوبًا تطبيقيًا مباشرًا، وتُدعم بمحتوى تعليمي منظم ومواد مساندة ونقاشات تفاعلية، مع تحديث مستمر يواكب تطور النماذج والأدوات.
            </p>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4">روابطنا الرسمية</h2>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://alzarraei-gpts.github.io/Arabic-GPT-Hub/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">باقة الباحث الذكي</span>
                    <span className="text-white/40 group-hover:text-white/80 transition">↗</span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="https://chatgpt.com/g/g-681f47498138819197d357982c29544c-mns-lnmdhj-ldhky-lbwtt-arabic-gpts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">منصة النماذج</span>
                    <span className="text-white/40 group-hover:text-white/80 transition">↗</span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="https://www.skool.com/zraiee-3956"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">منصة سكول التعليمية</span>
                    <span className="text-white/40 group-hover:text-white/80 transition">↗</span>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/966552191598"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">الاشتراك عبر واتساب</span>
                    <span className="text-white/40 group-hover:text-white/80 transition">↗</span>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10 flex h-full flex-col">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">روابط الكتب والمراجع</h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نوفر مجموعة من الروابط التعليمية والكتب والمراجع والملفات الإرشادية التي تساعد المستخدم على فهم آلية عمل الذكاء الاصطناعي وطريقة التعامل مع النماذج المخصصة والاستفادة منها في بناء نماذجه الخاصة وتطويرها.
            </p>
            <div className="mt-auto pt-4 flex flex-wrap gap-3">
              <a
                href="https://alzarraei-gpts.github.io/Arabic-GPT-Hub-books/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
              >
                <span className="text-white/90">{SOCIAL_ICONS.books}</span>
                الكتب المجانية
              </a>
              <a
                href="https://payhip.com/zraiee"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 px-4 py-2 text-sm font-bold text-white"
              >
                <span className="text-white/95">{SOCIAL_ICONS.download}</span>
                الكتب المدفوعة
              </a>
              <a
                href="https://wa.me/966552191598"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 px-4 py-2 text-sm font-bold text-blue-950"
              >
                <span className="text-blue-950">{SOCIAL_ICONS.subscribe}</span>
                اشتراك
              </a>
            </div>
          </div>
        </motion.article>
      </section>

      <section className="mt-6">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-3 text-base md:text-lg font-extrabold bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
            جديدنا
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              نعمل باستمرار على تطوير نماذج ذكية جديدة وتحديث الباقات القائمة، مع إضافة مزيد من الأدوات والروابط والمحتوى التعليمي المساند، بما يعزز تجربة المستخدم ويجعل الوصول إلى الحلول التخصصية أكثر سرعة ووضوحًا.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
