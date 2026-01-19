import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import bgVideoUrl from "../1080-60fps-ai.mp4";
import packagePdfs from "./data/packagePdfs.json";
import packagePdfsManifest from "./data/packagePdfsManifest.json";

// Use a base-aware public logo URL (SVG for crisp scaling on all DPIs)
const BASE_URL =
  (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/";
const resolvePublicPath = (path) => {
  const normalizedBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  const normalizedPath = (path || "").toString().replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
};
const logoUrl = resolvePublicPath("og-image.png");
const PAYHIP_URL = "https://payhip.com/zraiee";
const PAYHIP_BOOKS_COUNT = 11;

// ترتيب مخصص للباقات على الصفحة الرئيسية
const PACKAGE_ORDER = [
  "باقة الباحث",
  "باقة التعليم والتدريب",
  "باقة القانون",
  "باقة المصمم الذكي",
  "باقة صناعة الأفلام",
  "باقة تصميم الملابس والأزياء",
  "باقة العمارة والتصميم",
  "باقة الإدارة والتسويق",
  "باقة الصحة والأسرة",
  "باقة تكوين النماذج",
];
const PACKAGE_ORDER_INDEX = new Map(PACKAGE_ORDER.map((name, i) => [name, i]));
const PACKAGE_KEYWORDS = [
  "باقة الباحث",
  "باقة التعليم والتدريب",
  "باقة القانون",
  "باقة المصمم الذكي",
  "باقة صناعة الأفلام",
  "باقة تصميم الملابس والأزياء",
  "باقة العمارة والتصميم",
  "باقة الإدارة والتسويق",
  "باقة الصحة والأسرة",
  "باقة تكوين النماذج",
];
const norm = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
const stripTashkeel = (s) =>
  s.replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, "");
// Sanitize user-provided text inputs (keeps Arabic; strips control chars; clamps length)
const sanitizeText = (s, max = 200) => {
  try {
    const t = (s ?? "").toString();
    return t.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
  } catch {
    return "";
  }
};
// Basic allowlist URL check (http/https only)
const isSafeUrl = (url) => {
  try {
    const u = new URL(
      url,
      typeof window !== "undefined" ? window.location.href : "about:blank",
    );
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
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

const formatModelLabel = (name) => {
  try {
    const raw = (name ?? "").toString();
    const lower = raw.toLowerCase();
    if (!lower) return raw;
    if (["4o", "gpt-4o", "gpt4o"].includes(lower)) return "4o";
    if (["4o-mini", "gpt-4o-mini", "gpt4o-mini"].includes(lower))
      return "4o-mini";
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

// Arabic-insensitive normalization for search
const normalizeAr = (s) => stripTashkeel((s || "").toString()).toLowerCase();
const tokenize = (s) => normalizeAr(s).trim().split(/\s+/).filter(Boolean);
const getPkgOrder = (name) => {
  const n = stripTashkeel(norm(name));
  if (PACKAGE_ORDER_INDEX.has(n)) return PACKAGE_ORDER_INDEX.get(n);
  for (let i = 0; i < PACKAGE_KEYWORDS.length; i++) {
    const kw = PACKAGE_KEYWORDS[i];
    if (n.includes(kw) || n.includes(kw.replace("المجسّمات", "المجسمات")))
      return i;
  }
  return Number.POSITIVE_INFINITY;
};

const normalizeKeyName = (key) =>
  stripTashkeel((key || "").toString())
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "")
    .toLowerCase();

const packagePdfEntries = Array.isArray(packagePdfs) ? packagePdfs : [];
const packagePdfManifestEntries = Array.isArray(packagePdfsManifest)
  ? packagePdfsManifest
  : [];

const PACKAGE_PDF_LOOKUP = buildPdfLookup(packagePdfEntries);
const PACKAGE_PDF_MANIFEST_LOOKUP = buildPdfLookup(packagePdfManifestEntries);

// إعادة استخدام نفس الدالة
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

function getPdfFile(packageName, lookup = PACKAGE_PDF_LOOKUP) {
  if (!packageName) return null;
  if (lookup.direct.has(packageName)) return lookup.direct.get(packageName);
  const normalizedKey = normalizeKeyName(packageName);
  if (!normalizedKey) return null;
  return lookup.normalized.get(normalizedKey) || null;
}

function getPdfUrl(packageName, lookup = PACKAGE_PDF_LOOKUP) {
  const file = getPdfFile(packageName, lookup);
  if (!file) return null;
  return resolvePublicPath(file);
}

const buildAlias = (values) => {
  const raw = new Set();
  const normalized = new Set();
  for (const value of values) {
    if (!value) continue;
    raw.add(value);
    const norm = normalizeKeyName(value);
    if (!norm) continue;
    normalized.add(norm);
    const stripped = norm.replace(/[0-9a-z]+$/g, "");
    if (stripped && stripped !== norm) normalized.add(stripped);
  }
  return { raw, normalized };
};

const KEY_ALIAS = {
  models: buildAlias([
    "النماذج",
    "النموذج",
    "النموذج الافتراضي",
    "النموذج الأساسي",
    "النموذج 4o",
    "النموذج 5",
    "روابط النماذج",
    "قائمة النماذج",
    "model",
    "models",
  ]),
  about: buildAlias([
    "عن",
    "الوصف",
    "نبذة تعريفية",
    "المعلومات",
    "التفاصيل",
    "about",
    "description",
  ]),
  limits: buildAlias([
    "القيود",
    "الحدود",
    "المحددات",
    "المحاذير",
    "الشروط",
    "القيود التشغيلية",
    "limits",
    "constraints",
  ]),
  example: buildAlias([
    "مثال",
    "أمثلة",
    "عينة",
    "تجربة",
    "استعراض",
    "نموذج توضيحي",
    "example",
    "examples",
  ]),
  url: buildAlias([
    "الرابط",
    "الرابط المباشر",
    "الرابط الأساسي",
    "الرابط البديل",
    "الرابط الرئيسي",
    "الرابط الأول",
    "العنوان الإلكتروني",
    "عنوان URL",
    "العنوان الإلكتروني الأساسي",
    "العنوان الإلكتروني الثانوي",
    "href",
    "url",
    "link",
    "links",
    "primaryurl",
    "primaryUrl",
    "directurl",
  ]),
};
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const pickVariantValue = (source, alias, fallback) => {
  if (!source || typeof source !== "object") return undefined;
  const keys = Object.keys(source);
  for (const key of keys) {
    if (!hasOwn(source, key)) continue;
    const value = source[key];
    if (value === undefined || value === null) continue;
    const normalizedKey = normalizeKeyName(key);
    if (
      (alias?.raw && alias.raw.has(key)) ||
      (alias?.normalized && alias.normalized.has(normalizedKey))
    ) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      } else if (typeof value === "object") {
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
  if (fallback === "object-with-url") {
    for (const key of keys) {
      if (!hasOwn(source, key)) continue;
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const cleaned = {};
        for (const [k, v] of Object.entries(value)) {
          const safe = toSafeUrl(v);
          if (safe) cleaned[k] = safe;
        }
        if (Object.keys(cleaned).length) return cleaned;
      }
    }
  } else if (fallback === "string-with-http") {
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
  const raw = pickVariantValue(bot, KEY_ALIAS.models, "object-with-url");
  if (typeof raw === "string") {
    const safe = toSafeUrl(raw);
    return safe ? { "4O": safe } : {};
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
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
  if (typeof raw === "string") return raw;
  if (minLength > 0 && bot && typeof bot === "object") {
    for (const [key, value] of Object.entries(bot)) {
      if (key === "botTitle") continue;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length >= minLength) return trimmed;
      }
    }
  }
  return "";
};

const normalizeLinkField = (bot) => {
  const raw = pickVariantValue(bot, KEY_ALIAS.url, "string-with-http");
  return toSafeUrl(raw);
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    const safe = toSafeUrl(value);
    if (safe) return safe;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
};

// ————————————————————————————————————————————
//  Bots Hub — 2025 Reactive Concept (RTL)
//  • TailwindCSS for styling
//  • Framer Motion for micro-animations
//  • Command Palette (Ctrl/Cmd + K)
//  • Responsive: Desktop / iPad / Mobile
// ————————————————————————————————————————————

// فئات افتراضية (لن تُستخدم إذا تم توليدها من JSON)
const CATEGORIES = [
  "الكل",
  "الباحث العلمي",
  "المحتوى واللغة",
  "التصميم والإبداع",
  "الإدارة والتسويق",
];

const SORTS = [
  { id: "popular", label: "الأكثر استخدامًا" },
  { id: "new", label: "الأحدث" },
  { id: "az", label: "أبجديًا" },
];

// روابط أولية تجريبية — تُستخدم كاحتياطي مؤقت
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
  },
  {
    id: "research-title",
    title: "اقتراح عنوان وفكرة بحث",
    category: "الباحث العلمي",
    tags: ["عناوين", "ابتكار"],
    url: "https://chatgpt.com/g/g-686b8ac963248191b35f6c4d8629e688-qtrh-nwyn-bhthy-suggesting-research-titles",
    badge: "مميز",
    accent: "from-violet-500 to-fuchsia-500",
    score: 91,
    date: 20240716,
  },
  {
    id: "research-plan",
    title: "صناعة الخطة البحثية",
    category: "الباحث العلمي",
    tags: ["منهجية", "توثيق"],
    url: "https://chatgpt.com/g/g-683d09bea51c8191b7688edadeef821d-bwt-sn-lkht-lbhthy",
    badge: "مدفوع",
    accent: "from-amber-400 to-orange-500",
    score: 88,
    date: 20240712,
  },
  {
    id: "copy-guru",
    title: "محرّر نصوص عربي فائق",
    category: "المحتوى واللغة",
    tags: ["تحرير", "صياغة"],
    url: "#",
    badge: "قريبًا",
    accent: "from-sky-400 to-cyan-500",
    score: 82,
    date: 20240802,
  },
  {
    id: "design-muse",
    title: "مساعد التصميم الإبداعي",
    category: "التصميم والإبداع",
    tags: ["أفكار", "واجهات"],
    url: "#",
    badge: "تجريبي",
    accent: "from-rose-500 to-pink-500",
    score: 85,
    date: 20240812,
  },
  {
    id: "market-brain",
    title: "مساعد التسويق الذكي",
    category: "الإدارة والتسويق",
    tags: ["تحليل", "رسائل"],
    url: "#",
    badge: "مميز",
    accent: "from-teal-400 to-emerald-500",
    score: 89,
    date: 20240901,
  },
];

// تدرّجات ألوان افتراضية متنوعة لتمييز البطاقات
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

// تعيينات ألوان مخصّصة لبعض الفئات الشائعة
const CATEGORY_ACCENTS = {
  "الباحث العلمي": "from-violet-500 to-fuchsia-500",
  "المحتوى واللغة": "from-lime-400 to-emerald-500",
  "التصميم والإبداع": "from-rose-500 to-pink-500",
  "الإدارة والتسويق": "from-amber-400 to-orange-500",
  "باقة الإدارة والتسويق": "from-teal-400 to-emerald-500",
  "باقة الأنظمة والقوانين": "from-zinc-400 to-gray-600",
  "غير مصنّف": "from-zinc-400 to-gray-600",
};

// اختيار ثابت للتدرّج بناءً على الفئة (مع تجزئة مستقرة للفئات غير المعرّفة)
const pickAccentByCategory = (category) => {
  const c = (category || "").toString().trim();
  if (!c) return ACCENTS[0];
  if (CATEGORY_ACCENTS[c]) return CATEGORY_ACCENTS[c];
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
    hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
};

// مساعد لإرجاع لون البطاقة دائمًا حسب الفئة
const getAccent = (b) => pickAccentByCategory(b?.category);

const fmt = (n) => new Intl.NumberFormat("ar-SA").format(n);

const CATEGORY_ICONS = {
  "الباحث العلمي": (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M12 2a7 7 0 00-7 7v2H4a2 2 0 00-2 2v7h20v-7a2 2 0 00-2-2h-1V9a7 7 0 00-7-7zm-5 9V9a5 5 0 0110 0v2H7zm-3 2h16v5H4v-5z" />
    </svg>
  ),
  "المحتوى واللغة": (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
    </svg>
  ),
  "التصميم والإبداع": (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M12 2l9 4-9 4-9-4 9-4zm9 7l-9 4-9-4v7l9 4 9-4V9z" />
    </svg>
  ),
  "الإدارة والتسويق": (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M3 13h18v2H3v-2zm0 4h12v2H3v-2zM3 5h18v6H3V5z" />
    </svg>
  ),
  "باقة الأنظمة والقوانين": (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M6 2h12v2H6V2zM4 6h16v14H4V6zm2 2v10h12V8H6z" />
    </svg>
  ),
  default: (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="opacity-90"
    >
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

export default function App() {
  // الحالة العامة
  const [route, setRoute] = useState(
    (typeof window !== "undefined" && window.location.hash.replace("#", "")) ||
      "/",
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [sort, setSort] = useState(SORTS[0].id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bots, setBots] = useState(BOTS);
  const [botModal, setBotModal] = useState(null); // { type, bot }

  // تم إزالة مكونات المفضلة والوسوم من الواجهة
  // طي/فتح القوائم الممتدة (محفوظة)
  const [catsExpanded, setCatsExpanded] = useState(() => {
    try {
      const v = localStorage.getItem("bots:catsExpanded");
      if (v != null) return v === "1";
      // افتراضيًا: مفتوح على سطح المكتب، مطوي على الجوال
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(min-width: 768px)").matches;
      }
      return true;
    } catch {
      return true;
    }
  });
  // لا توجد وسوم، لذا لا حاجة لقياسات خاصة بها

  // Toast رسالة عابرة (مثلاً: تم نسخ الرابط)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  // Safe external opener with simple feedback
  const openExternal = (url) => {
    try {
      clearTimeout(toastTimerRef.current);
    } catch {}
    const safe = toSafeUrl(url);
    if (!safe) {
      setToast("الرابط غير صالح");
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      window.open(safe, "_blank", "noopener,noreferrer");
    } catch {}
  };

  // Accordion state for packages (collapsed by default)
  const [expandedPkgs, setExpandedPkgs] = useState(() => {
    try {
      const raw = localStorage.getItem("bots:expandedPkgs");
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  const togglePkg = (key) => {
    setExpandedPkgs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  useEffect(() => {
    try {
      localStorage.setItem(
        "bots:expandedPkgs",
        JSON.stringify(Array.from(expandedPkgs)),
      );
    } catch {}
  }, [expandedPkgs]);

  // (المفضلة أزيلت)

  // تحميل البيانات من public/new_bots.json (هيكل حِزَم → فئات → بوتات)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(resolvePublicPath("new_bots.json"), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // تطبيع البيانات إلى مصفوفة مسطحة مع الاحتفاظ بالحزمة والفئة ونماذج الروابط
        const flat = [];
        const packages =
          data && typeof data === "object" && !Array.isArray(data) ? data : {};

        const deriveModelLabel = (link, index, total) => {
          try {
            const url = new URL(link);
            const slug = url.pathname.split("/").pop() || "";
            const modMatch = slug.match(/mod[-_]?([a-z0-9]+)/i);
            if (modMatch && modMatch[1]) {
              return formatModelLabel(modMatch[1]);
            }
            const gptMatch = slug.match(/(gpt[-_]?\w+)/i);
            if (gptMatch && gptMatch[1]) {
              return formatModelLabel(gptMatch[1]);
            }
            const simpleMatch = slug.match(/(4o-mini|4o|5|mini|plus)/i);
            if (simpleMatch && simpleMatch[1]) {
              return formatModelLabel(simpleMatch[1]);
            }
          } catch {}
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

            for (let i = 0; i < botsArr.length; i++) {
              const entry = botsArr[i] || {};
              const rawTitle = firstNonEmptyString(
                entry?.title,
                entry?.name,
                `بوت ${i + 1}`,
              );
              const title = sanitizeText(rawTitle, 200) || `بوت ${i + 1}`;

              const details =
                entry?.details && typeof entry.details === "object"
                  ? entry.details
                  : {};
              const about =
                sanitizeText(details["نبذة"], 2000) || DEFAULT_BOT_ABOUT;
              const limits =
                sanitizeText(details["حدود"], 1600) || DEFAULT_BOT_LIMITS;
              const example =
                sanitizeText(details["مثال"], 600) || DEFAULT_BOT_EXAMPLE;

              const rawLinks = Array.isArray(details["روابط"])
                ? details["روابط"]
                : [];
              const cleanedLinks = [];
              for (const rawLink of rawLinks) {
                const normalizedLink = (rawLink ?? "")
                  .toString()
                  .replace(/^[:\s]+/, "")
                  .trim();
                const safe = toSafeUrl(normalizedLink);
                if (safe) cleanedLinks.push(safe);
              }

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

              const primaryUrl = cleanedLinks[0] || "";
              const id = `${normalizeKeyName(packageName) || "pkg"}-${normalizeKeyName(category) || "cat"}-${i}`;

              flat.push({
                id,
                title,
                package: packageName,
                packageTitle,
                packageSubtitle,
                category,
                accent: pickAccentByCategory(category),
                url: primaryUrl,
                hasLink: Boolean(primaryUrl),
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

        const normalized = flat.length ? flat : BOTS;
        if (isMounted) setBots(normalized);
      } catch (err) {
        console.error("Failed to load new_bots.json:", err);
        // نبقي على الاحتياطي BOTS إذا فشل التحميل
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // محاولة تفعيل التخزين الدائم للمتصفح لتقليل مسح البيانات المحلية
  useEffect(() => {
    try {
      if (navigator?.storage?.persist) navigator.storage.persist();
    } catch {}
  }, []);

  // حفظ واستعادة حالة الواجهة (بحث/فئة/ترتيب)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bots:ui");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.q === "string") setQ(s.q);
      if (typeof s.cat === "string") setCat(s.cat);
      if (typeof s.sort === "string") {
        const ok = (Array.isArray(SORTS) ? SORTS : []).some(
          (x) => x.id === s.sort,
        );
        setSort(ok ? s.sort : SORTS[0].id);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("bots:ui", JSON.stringify({ q, cat, sort }));
    } catch {}
  }, [q, cat, sort]);

  // حفظ حالة الطيّ للفئات
  useEffect(() => {
    try {
      localStorage.setItem("bots:catsExpanded", catsExpanded ? "1" : "0");
    } catch {}
  }, [catsExpanded]);

  // توليد شرائح الفئات من البيانات المحمّلة
  const categories = useMemo(() => {
    const set = new Set();
    for (const b of bots) {
      const c = (b?.category || "").toString().trim();
      if (c) set.add(c);
    }
    const arr = Array.from(set);
    arr.sort((a, b) => a.localeCompare(b));
    return ["الكل", ...arr];
  }, [bots]);

  // عدّادات للفئات بناءً على البحث + المفضلة
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

  // تأكيد صلاحية الفلتر الحالي عند تغيّر الشرائح
  useEffect(() => {
    if (!categories.includes(cat)) setCat("الكل");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // شريط تقدّم التمرير
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

  // تمت إزالة الوسوم؛ لا حاجة للقياسات الخاصة بها

  // لوحة الأوامر (اختصارات)
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
        if (e.key === "ArrowUp") setSelectedIndex((i) => Math.max(i - 1, 0));
        if (e.key === "Enter") {
          const item = filtered[selectedIndex];
          if (item) openExternal(item.url);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]); // eslint-disable-line

  // مبدّل مسارات بسيط عبر hash
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
      if (window.location.hash !== "#/") {
        window.location.hash = "#/";
      } else {
        setRoute("/");
      }
    }
  }, [route]);

  // تصفية/ترتيب
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
    if (sort === "az") rows.sort((a, b) => a.title.localeCompare(b.title));
    return rows;
  }, [q, cat, sort, bots]);

  // Titles list for datalist suggestions
  const botTitles = useMemo(() => {
    try {
      const set = new Set(
        bots.map((b) => (b.title || "").toString().trim()).filter(Boolean),
      );
      return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
    } catch {
      return [];
    }
  }, [bots]);

  // أدوات مساعدة: تهيئة الاتصال ونسخ الرابط
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
    } catch {}
  };

  const copyLink = async (url) => {
    const safe = toSafeUrl(url);
    if (!safe) {
      try {
        clearTimeout(toastTimerRef.current);
      } catch {}
      setToast("تعذّر نسخ الرابط: العنوان غير صالح");
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      await navigator.clipboard.writeText(safe);
      try {
        clearTimeout(toastTimerRef.current);
      } catch {}
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
        } catch {}
        setToast("تم نسخ الرابط");
        toastTimerRef.current = setTimeout(() => setToast(null), 1800);
      } catch {}
    }
  };

  // تجميع هرمي: حزمة ← فئة ← بوتات
  const groupedPackages = useMemo(() => {
    // pkgMap: key -> { displayName, catMap }
    const pkgMap = new Map();
    for (const b of filtered) {
      const pkgKey = b.package || "حزمة";
      const displayName = b.packageTitle || pkgKey;
      const subtitle = b.packageSubtitle || "";
      const catName = b.category || "غير مصنّف";
      if (!pkgMap.has(pkgKey))
        pkgMap.set(pkgKey, { displayName, subtitle, catMap: new Map() });
      const entry = pkgMap.get(pkgKey);
      if (!entry.displayName) entry.displayName = displayName;
      if (!entry.subtitle && subtitle) entry.subtitle = subtitle;
      if (!entry.catMap.has(catName)) entry.catMap.set(catName, []);
      entry.catMap.get(catName).push(b);
    }
    // إلى مصفوفات مرتبة
    const out = [];
    for (const [pkgKey, entry] of pkgMap.entries()) {
      const cats = [];
      for (const [catName, rows] of entry.catMap.entries()) {
        cats.push({
          name: catName,
          accent: pickAccentByCategory(catName),
          rows,
        });
      }
      cats.sort((a, b) => a.name.localeCompare(b.name));
      const pkgAccent =
        cats[0]?.accent || pickAccentByCategory(entry.displayName || pkgKey);
      out.push({
        key: pkgKey,
        name: entry.displayName || pkgKey,
        subtitle: entry.subtitle || "",
        accent: pkgAccent,
        cats,
      });
    }
    // Sort packages by the custom Arabic order first, then alphabetically
    out.sort((a, b) => {
      const oa = getPkgOrder(a.name);
      const ob = getPkgOrder(b.name);
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, "ar");
    });
    return out;
  }, [filtered]);

  // خلفية ديناميكية (تتبع المؤشر)
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
      {/* خلفية سائلة */}
      <div ref={bgRef} aria-hidden className="liquid-ether">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      {/* شريط تقدم أعلى الصفحة */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-lime-300 via-emerald-400 to-lime-300 origin-left"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* رأس زجاجي */}
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
                  <img
                    src={logoUrl}
                    alt="الشعار"
                    className="block h-full w-full object-cover"
                  />
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
                  بوابة النماذج العربية الذكية
                </strong>
              </a>
              {/* إضافات: إنستغرام، فيسبوك، تيك توك، بريد، PayPal، لينكدإن */}
              <a
                href="https://www.instagram.com/alzarraei.gpts/"
                target="_blank"
                rel="noopener"
                aria-label="إنستغرام"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="إنستغرام"
              >
                <i className="fa-brands fa-instagram fa-lg text-white"></i>
              </a>
              <a
                href="https://www.facebook.com/alzarraei.gpts/"
                target="_blank"
                rel="noopener"
                aria-label="فيسبوك"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="فيسبوك"
              >
                <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
              </a>
              <a
                href="https://www.tiktok.com/@alzarraei"
                target="_blank"
                rel="noopener"
                aria-label="تيك توك"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="تيك توك"
              >
                <i className="fa-brands fa-tiktok fa-lg text-white"></i>
              </a>
              <a
                href="mailto:zraieee@gmail.com"
                target="_blank"
                rel="noopener"
                aria-label="البريد الإلكتروني"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="البريد الإلكتروني"
              >
                <i className="fa-solid fa-envelope fa-lg text-white"></i>
              </a>
              <a
                href="https://www.paypal.com/paypalme/zraiee"
                target="_blank"
                rel="noopener"
                aria-label="PayPal"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="PayPal"
              >
                <i className="fa-brands fa-paypal fa-lg text-white"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/abdulrahman-alzarraei/"
                target="_blank"
                rel="noopener"
                aria-label="لينكدإن"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                title="لينكدإن"
              >
                <i className="fa-brands fa-linkedin-in fa-lg text-white"></i>
              </a>
              {/* تسميات نصية تظهر على الشاشات الكبيرة فقط */}
              <div className="hidden xl:flex items-center gap-1 ml-2 text-[11px] text-white/60">
                <span>واتساب</span>
                <span>· تيليغرام</span>
                <span>· إنستغرام</span>
                <span>· فيسبوك</span>
                <span>· X</span>
                <span>· يوتيوب</span>
                <span>· تيك توك</span>
                <span>· بريد</span>
                <span>· PayPal</span>
                <span>· لينكدإن</span>
              </div>
            </div>
            {/* أزرار الشبكات الاجتماعية */}
            <div className="flex items-center gap-0">
              <span className="hidden md:inline text-xs text-white/70 mr-1">
                قنواتنا الرسمية
              </span>
              <a
                href="https://www.facebook.com/alzarraei.gpts/"
                target="_blank"
                rel="noopener"
                aria-label="واتساب"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                title="انضم عبر واتساب"
              >
                <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
              </a>
              <a
                href="https://t.me/zraiee"
                target="_blank"
                rel="noopener"
                aria-label="تيليغرام"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                title="قناة تيليغرام"
              >
                <i className="fa-brands fa-telegram fa-lg text-white"></i>
              </a>
              <a
                href="https://x.com/Arab_Ai_"
                target="_blank"
                rel="noopener"
                aria-label="منصة إكس"
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
                aria-label="يوتيوب"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition"
                title="يوتيوب"
              >
                <i className="fa-brands fa-paypal fa-lg text-white"></i>
              </a>
            </div>
            {/* separator removed for a cleaner layout */}
          </div>
        </div>
      </header>

      {/* شريط تنقل فرعي بنمط Gooey */}
      <GooeyNav route={route} />

      {/* المحتوى الرئيسي حسب المسار */}
      {route === "/" && (
        <>
          {/* البطل */}
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
                  واجهات أنيقة وتفاعلات سلسة تساعدك على العثور على النموذج
                  المناسب بسرعة — بحث لحظي، تصفية متقدّمة، ولوحة أوامر تفتح أي
                  بوت بضغطة.
                </motion.p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a href="#" className="nv-btn text-sm">
                    استكشاف البوتات
                  </a>
                  <button
                    onClick={() => setPaletteOpen(true)}
                    className="nv-btn-ghost text-sm"
                  >
                    فتح البحث السريع
                  </button>
                </div>
              </div>

              {/* مشهد بصري — تضمين فيديو 60fps */}
              <div className="md:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                  className="relative aspect-[5/3] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl"
                >
                  {/* الفيديو */}
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
                  {/* لمسات فوق الفيديو */}
                  <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgba(163,230,53,0.15),transparent)]" />
                  <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* أدوات التحكم */}
          <section className="mx-auto max-w-7xl px-4 md:px-6 mt-8" id="">
            <div className="flex flex-wrap items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
              {/* فلاتر الفئات */}
              <div
                className={`relative basis-full grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${catsExpanded ? "max-h-none overflow-visible" : "max-h-10 overflow-hidden"}`}
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
                  title={catsExpanded ? "إظهار سطر واحد" : "عرض كل الفئات"}
                  aria-expanded={catsExpanded}
                  aria-label="تبديل عرض الفئات"
                >
                  <span className="mx-1">
                    {catsExpanded ? "إخفاء" : "إظهار المزيد"}
                  </span>
                  <span className="text-lg leading-none">
                    {catsExpanded ? "▲" : "▼"}
                  </span>
                </button>
              </div>

              {/* بحث وترتيب */}
              <div className="ml-auto flex items-center gap-2">
                {/* صندوق بحث مبسّط بدون حدود داخلية */}
                <div className="relative flex w-[220px] md:w-[360px] items-center nv-input">
                  {/* أيقونة البحث */}
                  <svg
                    className="ml-1 h-4 w-4 shrink-0 text-white/50"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
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
                    className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-white/50
     border-0 outline-none
    bg-transparent shadow-none
    focus:outline-none
    focus:ring-0
    focus:border-0
    focus-visible:outline-none
    appearance-none"
                  />

                  {/* Native autocomplete dropdown with available bot names */}
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
                  onChange={(e) => {
                    const v = e.target.value;
                    setSort(
                      (SORTS || []).some((s) => s.id === v)
                        ? v
                        : SORTS?.[0]?.id || "popular",
                    );
                  }}
                  className="
    nv-select text-sm
    border-0 outline-none
    bg-transparent shadow-none
    focus:outline-none
    focus:ring-0
    focus:border-0
    focus-visible:outline-none
    appearance-none
  "
                  style={{
                    position: "relative",
                    zIndex: 50,
                    isolation: "isolate",
                  }}
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* تم إزالة الوسوم من الواجهة */}

            {/* عدّاد */}
            <p className="mt-3 text-xs md:text-sm text-white/70">
              نتائج: {fmt(filtered.length)} بوت
            </p>

            {/* الحِزَم ← الفئات ← البوتات */}
            <div className="mt-4 space-y-8">
              {groupedPackages.map((pkg) => {
                const packagePdfUrl = getPdfUrl(pkg.name, PACKAGE_PDF_LOOKUP);
                const packagePdfManifestUrl = getPdfUrl(
                  pkg.name,
                  PACKAGE_PDF_MANIFEST_LOOKUP,
                );
                return (
                  <section
                    key={pkg.key || pkg.name}
                    aria-label={pkg.name}
                    className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-3 md:p-5 shadow "
                  >
                    {/* عنوان الحزمة */}
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
                          aria-controls={`pkg-panel-${(
                            pkg.key ||
                            pkg.name ||
                            ""
                          )
                            .toString()
                            .replace(/\s+/g, "-")
                            .replace(/[^\w\-]/g, "")}`}
                          className="inline-flex items-center gap-2 text-xl md:text-2xl font-extrabold text-white rounded-full border border-white/10 px-4 py-1.5 bg-neutral-800 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:bg-emerald-500"
                        >
                          <span className="opacity-90">
                            {CATEGORY_ICONS[pkg.name] || CATEGORY_ICONS.default}
                          </span>
                          {pkg.name}
                          <span className="mx-1 text-xs font-semibold text-white/80 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                            {pkg.cats.length}
                          </span>
                          <span
                            className={`ms-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/80 transition-transform ${expandedPkgs.has(pkg.key || pkg.name) ? "rotate-180" : "rotate-0"}`}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7 10l5 5 5-5H7z" />
                            </svg>
                          </span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {packagePdfUrl && (
                          <a
                            href={packagePdfUrl}
                            download
                            title="تحميل النسخة الكاملة مع الشرح"
                            className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-bold
        bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950
        shadow hover:shadow-lg transition"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M12 3v12" />
                              <path d="M7 11l5 5 5-5" />
                              <path d="M5 19h14" />
                            </svg>
                            الشرح الكامل
                          </a>
                        )}

                        {packagePdfManifestUrl && (
                          <a
                            href={packagePdfManifestUrl}
                            download
                            title="تحميل النسخة المختصرة"
                            className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-bold
        bg-gradient-to-br from-blue-400 to-cyan-400 text-blue-950
        shadow hover:shadow-lg transition"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M12 3v12" />
                              <path d="M7 11l5 5 5-5" />
                              <path d="M5 19h14" />
                            </svg>
                            مختصر
                          </a>
                        )}
                      </div>
                    </motion.div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/70">
                      {/* عدد الفئات */}
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                        <svg
                          className="h-4 w-4 text-emerald-400"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" />
                        </svg>
                        <span className="font-semibold text-white">
                          {pkg.cats.length}
                        </span>
                        <span>فئات</span>
                      </div>

                      {/* اسم الدكتور */}
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                        <svg
                          width="17px"
                          height="17px"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                          <g
                            id="SVGRepo_tracerCarrier"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          ></g>
                          <g id="SVGRepo_iconCarrier">
                            {" "}
                            <path
                              d="M16.8311 15.6402C17.5011 15.2002 18.3811 15.6802 18.3811 16.4802V17.7702C18.3811 19.0402 17.3911 20.4002 16.2011 20.8002L13.0111 21.8602C12.4511 22.0502 11.5411 22.0502 10.9911 21.8602L7.80109 20.8002C6.60109 20.4002 5.62109 19.0402 5.62109 17.7702V16.4702C5.62109 15.6802 6.50109 15.2002 7.16109 15.6302L9.22109 16.9702C10.0111 17.5002 11.0111 17.7602 12.0111 17.7602C13.0111 17.7602 14.0111 17.5002 14.8011 16.9702L16.8311 15.6402Z"
                              fill="#38c3f2"
                            ></path>{" "}
                            <path
                              d="M19.9795 6.45859L13.9895 2.52859C12.9095 1.81859 11.1295 1.81859 10.0495 2.52859L4.02953 6.45859C2.09953 7.70859 2.09953 10.5386 4.02953 11.7986L5.62953 12.8386L10.0495 15.7186C11.1295 16.4286 12.9095 16.4286 13.9895 15.7186L18.3795 12.8386L19.7495 11.9386V14.9986C19.7495 15.4086 20.0895 15.7486 20.4995 15.7486C20.9095 15.7486 21.2495 15.4086 21.2495 14.9986V10.0786C21.6495 8.78859 21.2395 7.28859 19.9795 6.45859Z"
                              fill="#38c3f2"
                            ></path>{" "}
                          </g>
                        </svg>
                        <span className="font-medium text-white">
                          د. عبدالرحمن أبو حسان
                        </span>
                      </div>
                    </div>

                    {/* فئات الحزمة */}
                    <AnimatePresence initial={false}>
                      {expandedPkgs.has(pkg.key || pkg.name) && (
                        <motion.div
                          key={`pkg-panel-${(pkg.key || pkg.name || "")
                            .toString()
                            .replace(/\s+/g, "-")
                            .replace(/[^\w\-]/g, "")}`}
                          id={`pkg-panel-${(pkg.key || pkg.name || "")
                            .toString()
                            .replace(/\s+/g, "-")
                            .replace(/[^\w\-]/g, "")}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                          className="overflow-hidden mt-3 space-y-5"
                        >
                          {pkg.cats.map((cat, idx) => (
                            <div
                              key={`${pkg.name}-${cat.name}`}
                              className="space-y-2"
                            >
                              <div className="flex items-center gap-2 mb-1 justify-end">
                                <div className="hidden md:block h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                                <span
                                  className={`inline-flex items-center gap-1 text-sm md:text-base text-white/90 rounded-full border border-white/10 px-2 py-0.5 bg-gradient-to-br ${cat.accent} shadow-[0_0_18px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm animate-gradient-slow`}
                                >
                                  {cat.name}
                                </span>
                                <span className="hidden md:inline text-xs text-white/60">
                                  {cat.rows.length} بوت
                                </span>
                                <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <AnimatePresence mode="popLayout">
                                  {cat.rows.map((b) => {
                                    const rawModelEntries = Object.entries(
                                      b?.models || {},
                                    );
                                    const validModelEntries = rawModelEntries
                                      .map(([model, url]) => [
                                        model,
                                        toSafeUrl(url),
                                      ])
                                      .filter(([, url]) => !!url);
                                    const hasMultipleModels =
                                      validModelEntries.length > 1;
                                    const primaryLink = toSafeUrl(b?.url);
                                    const launchLink =
                                      primaryLink ||
                                      validModelEntries[0]?.[1] ||
                                      "";
                                    const chatModelNames = new Set([
                                      "4o",
                                      "gpt-4o",
                                      "gpt4o",
                                      "4o-mini",
                                      "mini",
                                      "gpt-5",
                                      "gpt5",
                                      "5",
                                    ]);
                                    const hasChatModels =
                                      validModelEntries.some(([model]) =>
                                        chatModelNames.has(
                                          (model || "")
                                            .toString()
                                            .toLowerCase(),
                                        ),
                                      );
                                    const launchHost = (() => {
                                      try {
                                        return launchLink
                                          ? new URL(launchLink).hostname || ""
                                          : "";
                                      } catch {
                                        return "";
                                      }
                                    })();
                                    const isChatGPTLaunch =
                                      launchHost.endsWith("chatgpt.com");
                                    const buttonLabel = (() => {
                                      if (hasMultipleModels) {
                                        return hasChatModels
                                          ? "اختيار النموذج"
                                          : "عرض الروابط";
                                      }
                                      if (launchLink) {
                                        return isChatGPTLaunch
                                          ? "تشغيل في ChatGPT"
                                          : "فتح الرابط";
                                      }
                                      return "غير متاح";
                                    })();
                                    const canLaunch =
                                      hasMultipleModels || Boolean(launchLink);
                                    const copyDisabled = !launchLink;

                                    return (
                                      <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{
                                          duration: 0.3,
                                          ease: "easeOut",
                                        }}
                                        className="pixel-card group relative overflow-hidden rounded-2xl bg-neutral-900/60 p-3 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition will-change-transform"
                                      >
                                        <div
                                          className={`absolute inset-0 opacity-60 bg-gradient-to-br ${getAccent(b)}`}
                                        />
                                        <div className="relative z-10 flex h-full flex-col">
                                          <div className="flex items-center gap-2 text-xs">
                                            <div className="ml-auto" />
                                          </div>
                                          <h3 className="mt-2 line-clamp-2 text-base md:text-lg leading-snug font-bold tracking-tight drop-shadow-sm min-h-[2.75rem] md:min-h-[3.125rem]">
                                            {b.title}
                                          </h3>
                                          <div className="mt-2 grid grid-cols-3 gap-3 text-xs pb-2">
                                            <button
                                              onClick={() =>
                                                setBotModal({
                                                  type: "about",
                                                  bot: b,
                                                })
                                              }
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              حول البوت
                                            </button>
                                            <button
                                              onClick={() =>
                                                setBotModal({
                                                  type: "limits",
                                                  bot: b,
                                                })
                                              }
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              قيود الاستخدام
                                            </button>
                                            <button
                                              onClick={() =>
                                                setBotModal({
                                                  type: "example",
                                                  bot: b,
                                                })
                                              }
                                              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white transition hover:bg-white/15"
                                            >
                                              أمثلة
                                            </button>
                                          </div>
                                          {/* إجراءات إضافية */}
                                          <div className="mt-auto flex items-center gap-2 text-xs">
                                            <button
                                              type="button"
                                              onMouseEnter={() => {
                                                if (launchLink)
                                                  warmUp(launchLink);
                                              }}
                                              onClick={() => {
                                                if (hasMultipleModels) {
                                                  setBotModal({
                                                    type: "choose-model",
                                                    bot: b,
                                                  });
                                                  return;
                                                }
                                                if (launchLink) {
                                                  openExternal(launchLink);
                                                  return;
                                                }
                                                openExternal("");
                                              }}
                                              disabled={!canLaunch}
                                              className="flex-1 grid place-items-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-lime-400 px-3 py-2 font-bold text-white shadow hover:shadow-lg animate-gradient-slow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
                                            >
                                              {buttonLabel}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                copyLink(launchLink)
                                              }
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
                );
              })}
            </div>
          </section>

          {/* نافذة منبثقة لبطاقات الصفحة الرئيسية */}
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
                    {botModal.type === "about" && (
                      <p>{botModal.bot.about || DEFAULT_BOT_ABOUT}</p>
                    )}
                    {botModal.type === "limits" && (
                      <p>{botModal.bot.limits || DEFAULT_BOT_LIMITS}</p>
                    )}
                    {botModal.type === "example" && (
                      <div>
                        <p className="mb-2">مثال الاستخدام:</p>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-white/85">
                          {botModal.bot.example || DEFAULT_BOT_EXAMPLE}
                        </div>
                      </div>
                    )}
                    {botModal.type === "choose-model" && (
                      <div>
                        <p className="mb-3 font-bold text-white/95">
                          اختر النموذج:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(botModal.bot?.models || {})
                            .map(([name, url]) => {
                              const safe = toSafeUrl(url);
                              if (!safe) return null;
                              const label = formatModelLabel(name);
                              const accentClass =
                                typeof name === "string" &&
                                name.toLowerCase().includes("4")
                                  ? ""
                                  : "bg-gradient-to-br from-violet-400 via-fuchsia-500 to-violet-400 animate-gradient-slow";
                              return (
                                <a
                                  key={`${name}-${safe}`}
                                  href={safe}
                                  target="_blank"
                                  rel="noopener"
                                  className={`nv-btn px-3 py-2 text-center text-sm ${accentClass}`}
                                >
                                  {label || name || "رابط"} ↗
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

      {route === "/about" && (
        <AboutPage
          botsCount={bots.length}
          catsCount={categories.length}
          booksCount={PAYHIP_BOOKS_COUNT}
        />
      )}

      {/* تذييل */}
      <footer className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/70">
                نصنع تجارب عربية متقنة في الذكاء الاصطناعي. شاركنا اقتراحاتك
                وروابط البوتات التي تود إضافتها — ونعمل على دمجها ضمن أقسام
                مخصّصة وبأسلوب احترافي.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://wa.me/966552191598"
                  target="_blank"
                  rel="noopener"
                  aria-label="واتساب"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-whatsapp fa-lg text-white"></i>
                </a>
                <a
                  href="https://t.me/zraiee"
                  target="_blank"
                  rel="noopener"
                  aria-label="تيليغرام"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-telegram fa-lg text-white"></i>
                </a>
                <a
                  href="https://x.com/Arab_Ai_"
                  target="_blank"
                  rel="noopener"
                  aria-label="منصة إكس"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-x-twitter fa-lg text-white"></i>
                </a>
                <a
                  href="https://www.youtube.com/@alzarraei-gpts"
                  target="_blank"
                  rel="noopener"
                  aria-label="يوتيوب"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-youtube fa-lg text-white"></i>
                </a>
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/alzarraei.gpts/"
                  target="_blank"
                  rel="noopener"
                  aria-label="إنستغرام"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-instagram fa-lg text-white"></i>
                </a>
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/alzarraei.gpts/"
                  target="_blank"
                  rel="noopener"
                  aria-label="فيسبوك"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                </a>
                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@alzarraei"
                  target="_blank"
                  rel="noopener"
                  aria-label="تيك توك"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-tiktok fa-lg text-white"></i>
                </a>
                {/* Email */}
                <a
                  href="mailto:zraieee@gmail.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="البريد الإلكتروني"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-solid fa-envelope fa-lg text-white"></i>
                </a>
                {/* PayPal */}
                <a
                  href="https://www.paypal.com/paypalme/zraiee"
                  target="_blank"
                  rel="noopener"
                  aria-label="باي بال"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-paypal fa-lg text-white"></i>
                </a>
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/abdulrahman-alzarraei/"
                  target="_blank"
                  rel="noopener"
                  aria-label="لينكدإن"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <i className="fa-brands fa-linkedin-in fa-lg text-white"></i>
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

      {/* Toast: تم نسخ الرابط */}
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

      {/* زر طافي للرجوع للأعلى */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-16 right-4 z-50 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-lg transition ${showTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label="العودة إلى أعلى الصفحة"
      >
        ↑ إلى الأعلى
      </button>

      {/* لوحة الأوامر / البحث السريع */}
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
                  <li className="px-3 py-6 text-center text-sm text-white/60">
                    لا نتائج مطابقة…
                  </li>
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
                      <span className="text-[10px] text-white/60">
                        {b.category}
                      </span>
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

      {/* شريط إجراءات سفلي للهاتف */}
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
    { href: "https://wa.me/966552191598", label: "اشتراك", external: true },
  ];
  return (
    <div className="mx-auto mt-3 max-w-7xl px-4 md:px-6">
      {/* Removed gooey filter and transitions/hover effects from nav buttons */}
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
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-transparent text-white/80"
              }`}
            >
              {it.label}
            </a>
          );
        })}
        <div className="pointer-events-none absolute inset-0 -z-10" />
      </div>
    </div>
  );
}

function AboutPage({ botsCount = 0, catsCount = 0, booksCount = 0 }) {
  const [bc, setBc] = useState(0);
  const [cc, setCc] = useState(0);
  const [bk, setBk] = useState(0);
  useEffect(() => {
    let i1;
    let i2;
    let i3;
    const easeIn = (to, setter) => {
      let n = 0;
      const step = Math.max(1, Math.ceil(to / 60));
      const tick = () => {
        n = Math.min(to, n + step);
        setter(n);
        if (n < to) {
          const id = requestAnimationFrame(tick);
          if (setter === setBc) i1 = id;
          if (setter === setCc) i2 = id;
          if (setter === setBk) i3 = id;
        }
      };
      const id = requestAnimationFrame(tick);
      if (setter === setBc) i1 = id;
      if (setter === setCc) i2 = id;
      if (setter === setBk) i3 = id;
    };
    easeIn(botsCount, setBc);
    easeIn(catsCount, setCc);
    easeIn(booksCount, setBk);
    return () => {
      if (i1) cancelAnimationFrame(i1);
      if (i2) cancelAnimationFrame(i2);
      if (i3) cancelAnimationFrame(i3);
    };
  }, [botsCount, catsCount, booksCount]);
  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
      {/* من نحن */}
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

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0.9, 1, 0.9], y: 0 }}
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
              className="mt-3 text-white/80 text-sm md:text-base leading-relaxed"
            >
              تُقدّم بوابة النماذج التصميمية الذكية منظومة متخصصة من البوتات
              المصمّمة لخدمة المصمّم العربي بمختلف تخصصاته، بدءًا من تصميم
              الشعارات والهويات البصرية، مرورًا بأغلفة الكتب والمواد الدعائية،
              وصولًا إلى التصميم ثلاثي الأبعاد، والنحتي، والزخرفي، والمعماري.
              تعمل هذه البوتات على تحويل الفكرة الخام إلى تصور بصري واضح، يساعد
              المصمّم على تسريع عملية الإبداع، وضبط التكوين، واختيار الأسلوب
              والخامات، مع الحفاظ على الأصالة والتوازن الجمالي دون حلول جاهزة أو
              مكررة.
            </motion.p>
          </div>

          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.12)_20%,transparent_35%)]" />
        </motion.article>
      </section>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/70 to-neutral-950 p-6 md:p-10">
        {/* عنّى */}

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
            عنّى
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0.9, 1, 0.9], y: 0 }}
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
            className="mt-3 text-white/80 text-sm md:text-base leading-relaxed"
          >
            أسّس هذه المنصة د. عبدالرحمن الزراعي، مشرف أكاديمي وباحث مهتم
            بالفنون البصرية وتكاملها مع الذكاء الاصطناعي، وعمل على تطوير تعليمات
            دقيقة لنماذج تصميمية ذكية تُحاكي طريقة تفكير المصمّم لا طريقة
            الإنتاج الآلي. تعتمد المنصة على رؤية منهجية تُراعي الحس الفني، ومنطق
            التكوين، والهوية البصرية، مع إشراف نخبة من المهتمين بالفن والتصميم
            لتقييم أداء النماذج وتحسينها باستمرار، بما يخدم المصمّم العربي
            ويمنحه أدوات ذكية تحترم ذائقته وثقافته البصرية.
          </motion.p>
          {/* Counters */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-lime-400/20 to-emerald-500/20 text-lime-300">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M12 2a5 5 0 015 5v2h1a3 3 0 013 3v8H3V12a3 3 0 013-3h1V7a5 5 0 015-5zm-3 7h6V7a3 3 0 10-6 0v2zm11 5H4v5h16v-5z" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold">{fmt(bc)}</div>
              <div className="text-white/60">بوت</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400/20 to-cyan-500/20 text-sky-300">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold">{fmt(cc)}</div>
              <div className="text-white/60">فئة</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M2 5a3 3 0 013-3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V5zm14 6h3v6h-3v-6zm-5 0h3v6h-3v-6zm-5 0h3v6H6v-6z" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold">{fmt(bk)}</div>
              <div className="text-white/60">إصدار</div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
      </div>

      {/* Content */}
      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10">
            <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                className="text-lime-300"
              >
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a3 3 0 110 6 3 3 0 010-6zm0 14a8 8 0 01-6.32-3.07c.03-1.99 4-3.08 6.32-3.08 2.33 0 6.29 1.09 6.32 3.08A8 8 0 0112 21z" />
              </svg>
              الفريق
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نعمل باستمرار على تطوير نماذج ذكية جديدة تواكب الاحتياجات المتغيرة
              للمستخدمين. من أحدث ما أُضيف: «اقتراح عنوان وفكرة بحث»، «دليل
              فهارس المخطوطات»، «تعليمات تكوين النموذج»، «علم العروض والأوزان
              الشعرية»، «المساعد في تأليف الكتب»، «نظام الزكاة»، و«الرد الفوري
              على الفتوى الشرعية». تأتي هذه النماذج ضمن باقات جاهزة للاستخدام،
              مع فيديوهات شرح وتوجيهات مخصصة.
            </p>
          </div>
          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.15)_20%,transparent_35%)]" />
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10">
            <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                className="text-sky-300"
              >
                <path d="M12 2a10 10 0 00-3.16 19.45c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.61.07-.61 1 .07 1.53 1.06 1.53 1.06.89 1.52 2.34 1.08 2.91.82.09-.66.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.95a3.87 3.87 0 011.03-2.68 3.59 3.59 0 01.1-2.65s.84-.27 2.75 1.02a9.34 9.34 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02a3.59 3.59 0 01.1 2.65 3.87 3.87 0 011.03 2.68c0 3.86-2.34 4.7-4.57 4.95.36.3.68.89.68 1.8v2.66c0 .26.18.58.69.48A10 10 0 0012 2z" />
              </svg>
              المجتمع
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نبني مجتمعاً من الباحثين والمبدعين والمهتمين بالذكاء الاصطناعي،
              حيث يتعاون الجميع على تصميم تجارب دقيقة وفعّالة للنماذج السردية
              والتفاعلية. نركز على الجودة اللغوية وسلامة المخرجات، مع الالتزام
              بالمعايير الأخلاقية والأكاديمية في كل ما نقدمه من أدوات تعليمية
              ومنهجيات عمل.
            </p>
          </div>
          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.15)_20%,transparent_35%)]" />
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                className="text-rose-300"
              >
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v6h5v2h-7V7h2z" />
              </svg>
              رسالة
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نهدف إلى إنشاء مكتبة من الحلول الذكية التي تراعي الخصوصية الثقافية
              واللغوية للمستخدم العربي، مع التركيز على تقديم محتوى تدريبي شامل
              يضمن الاستخدام الآمن والمسؤول للذكاء الاصطناعي. نؤمن بأن المعرفة
              المتاحة باللغة العربية هي مفتاح تمكين الأفراد والمؤسسات من استخدام
              التقنيات الحديثة بثقة وكفاءة.
            </p>
          </div>
          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                className="text-amber-300"
              >
                <path d="M3.9 12a5 5 0 017.07 0l1.06 1.06-2.12 2.12L8.85 14.1a2 2 0 10-2.83 2.83l1.06 1.06-2.12 2.12L4 19.9A5 5 0 013.9 12zm16.2 0a5 5 0 00-7.07 0l-1.06 1.06 2.12 2.12 1.06-1.06a2 2 0 012.83 2.83l-1.06 1.06 2.12 2.12L20 19.9A5 5 0 0020.1 12z" />
              </svg>
              روابط ومراجع
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نوفر مجموعة من الروابط التعليمية لمساعدة المستخدم على فهم آلية عمل
              الذكاء الاصطناعي وطريقة التعامل مع النماذج المخصصة. من أبرز
              المحتويات: كتاب «الآلة التي تفكر» وكتاب «الآلة التي ترد»، إضافة
              إلى مؤلفات مختصرة وملفات إرشادية قابلة للتحميل تحتوي على أمثلة
              عملية وتعليمات جاهزة للاستخدام. يتم تحديث المواد التعليمية
              باستمرار وبأسلوب يناسب جميع المستويات.
            </p>
            <div className="mt-3">
              <a
                href={PAYHIP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:shadow-lg"
              >
                متجر الكتب ↗
              </a>
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
        </motion.article>
      </section>

      {/* Content */}
      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* دوراتنا */}
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              دوراتنا
            </h2>

            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نقدّم في بوابة النماذج العربية الذكية – باقة المصمّم مسارًا
              تدريبيًا متكاملًا يهدف إلى تمكين المصمّم من استخدام الذكاء
              الاصطناعي بوصفه أداة إبداعية واعية، لا مجرد مولّد بصري. تبدأ
              الدورات بتعريف المصمّم بواجهة ChatGPT وكيفية التعامل معها بوعي
              تصميمي، ثم تنتقل تدريجيًا إلى بناء مهارة صياغة الوصف البصري
              الاحترافي، وتحويل الفكرة المجردة إلى تصور بصري واضح يحترم التكوين،
              والأسلوب، والخامة، والهوية الفنية. كما تتناول الدورات كيفية توجيه
              النماذج التصميمية الذكية في مجالات متعددة مثل تصميم الشعارات،
              وأغلفة الكتب، والتصميم ثلاثي الأبعاد، والتصوير المفاهيمي، والتصميم
              المعماري، مع التركيز على ضبط الأسلوب الفني بدل الاكتفاء بالنتيجة
              السريعة.
            </p>

            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              تعتمد الدورات أسلوبًا تطبيقيًا مباشرًا، حيث يُدرَّب المصمّم على
              استخدام البوتات داخل ChatGPT خطوة بخطوة، وفهم آلية تفكير النموذج
              البصري، وكيفية تصحيحه وتطوير مخرجاته، بما يحفظ للمصمّم دوره
              الإبداعي المركزي. وتُقدَّم هذه الدورات عبر منصة ChatGPT للتطبيق
              العملي المباشر، إضافة إلى منصة Skool التي تحتوي على المحتوى
              التعليمي المنظم، والدروس المسجلة، والمواد المساندة، والنقاشات
              التفاعلية، والتحديثات المستمرة.
            </p>
          </div>

          <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.12)_20%,transparent_35%)]" />
        </motion.article>

        {/* روابطنا الرسمية */}
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4">
              روابطنا الرسمية
            </h2>

            <ul className="space-y-4">
              {/* رابط 1 */}
              <li>
                <a
                  href="https://arabic-gpts.github.io/web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">
                      جميع الباقات الذكية
                    </span>
                    <span className="text-white/40 group-hover:text-white/80 transition">
                      ↗
                    </span>
                  </div>
                </a>
              </li>

              {/* رابط 2 */}
              <li>
                <a
                  href="https://chatgpt.com/g/g-681f47498138819197d357982c29544c-mns-lnmdhj-ldhky-lbwtt-arabic-gpts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">
                      جميع نماذج وبوتات التصميم على ChatGPT:
                    </span>
                    <span className="text-white/40 group-hover:text-white/80 transition">
                      ↗
                    </span>
                  </div>
                </a>
              </li>

              {/* رابط 3 */}
              <li>
                <a
                  href="https://www.skool.com/zraiee-3956"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium group-hover:text-white">
                      منصة Skool التعليمية (المجتمع والدورات):
                    </span>
                    <span className="text-white/40 group-hover:text-white/80 transition">
                      ↗
                    </span>
                  </div>
                </a>
              </li>
            </ul>

            <p className="mt-5 text-white/80 text-sm md:text-base leading-relaxed">
              يُتاح الالتحاق بالدورات بشكل فردي أو ضمن مجموعات، مع تحديث المحتوى
              باستمرار لمواكبة تطور النماذج البصرية وأدوات الذكاء الاصطناعي، بما
              يضمن للمصمّم تجربة تعليمية متجددة، عملية، ومتصلة بسوق العمل
              الإبداعي الحقيقي.
            </p>
          </div>
        </motion.article>

        {/* روابط الكتب */}
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="relative z-10 flex h-full flex-col">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              روابط الكتب والمراجع
            </h2>

            <p
              className="mt-2 text-white/80 text-sm md:text-base"
              style={{ lineHeight: "1.75" }}
            >
              نوفر مجموعة من الروابط التعليمية لمساعدة المستخدم على فهم آلية عمل
              الذكاء الاصطناعي، وطريقة التعامل مع النماذج المخصصة. من أبرز
              المحتويات: كتاب <strong>"الآلة التي تفكر"</strong> التي توضح كيفية
              تحليل النموذج للمحتوى قبل توليده. وكتاب{" "}
              <strong>"الآلة التي ترد"</strong> التي تشرح بطريقة عملية وتطبيقية
              كيف يتفاعل النموذج مع التعليمات، كما نُتيح مؤلفات مختصرة وملفات
              إرشادية قابلة للتحميل، تحتوي على أمثلة عملية وتعليمات جاهزة
              للاستخدام، يمكن الاستفادة من هذه التعليمات في تكوين نماذجك الخاصة،
              وضبط أدائها بما يتناسب مع هدفك، كل المواد التعليمية يتم تحديثها
              باستمرار، وهي مصممة لتناسب جميع المستويات.
            </p>

            <div className="mt-auto pt-4 flex flex-wrap gap-3">
              <a
                href="https://alzarraei-gpts.github.io/Arabic-GPT-Hub-books/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
              >
                الكتب المجانية
              </a>

              <a
                href="https://payhip.com/zraiee"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 px-4 py-2 text-sm font-bold text-white"
              >
                الكتب المدفوعة
              </a>
            </div>
          </div>
        </motion.article>

        {/* جديدنا */}
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4 }}
          className="
          pixel-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2"
        >
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              جديدنا
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
              نعمل على تطوير بوتات تصميمية جديدة باستمرار، مع تحديث النماذج
              الحالية لتواكب تطور أدوات الذكاء الاصطناعي البصري. أُضيف مؤخرًا
              دعم نماذج أحدث لبعض أدوات التصميم، مع تحسينات في الدقة البصرية،
              والتكوين، وفهم الوصف الفني.
            </p>
          </div>
        </motion.article>
      </section>

      {/* Timeline */}
      <section className="mt-6">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-3 text-base md:text-lg font-extrabold bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">
            رحلتنا
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-rose-400 to-pink-500 animate-gradient-slow" />
              <div className="relative z-10">
                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">
                  الفكرة
                </span>
                <p className="mt-2 text-sm text-white/85">
                  إطلاق مبادرة عربية لتصميم بوتات دقيقة.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-sky-400 to-cyan-500 animate-gradient-slow" />
              <div className="relative z-10">
                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">
                  التطوير
                </span>
                <p className="mt-2 text-sm text-white/85">
                  بناء منهجيات متخصصة للذكاء الاصطناعي التوليدي.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-amber-400 to-orange-500 animate-gradient-slow" />
              <div className="relative z-10">
                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">
                  المستقبل
                </span>
                <p className="mt-2 text-sm text-white/85">
                  إطلاق مزيد من الحلول الموجهة للباحثين والمبدعين.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

const DEFAULT_BOT_ABOUT =
  "يُعدُّ هذا البوت أداةً ذكية متخصصة في دعم الباحثين وطلاب الدراسات العليا في اختيار عناوين أصيلة ومتميزة لرسائل الماجستير والدكتوراه، من خلال تحليل التخصصات الأكاديمية واستنباط الفرص البحثية غير المستكشفة.";
const DEFAULT_BOT_LIMITS =
  "تعمل ضمن نطاق أكاديمي صارم، وتلتزم بالأصالة البحثية والحياد والدقة واللغة العربية الفصيحة والتوثيق العلمي السليم. لا تقدّم اقتراحات عامة متداولة.";
const DEFAULT_BOT_EXAMPLE =
  "أدخل تخصصك (مثل: التربية الخاصة)، وسيقترح البوت 3 عناوين أصيلة لرسائل ماجستير ضمن هذا المجال.";
