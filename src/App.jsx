import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import bgVideoUrl from "../1080-60fps-ai.mp4";
// Use a base-aware public logo URL (SVG for crisp scaling on all DPIs)
const logoUrl = ((import.meta && import.meta.env && import.meta.env.BASE_URL) || "/") + "logo.svg";
import { BOOKS as STATIC_BOOKS, SERIES as STATIC_SERIES } from "./data/books.js";

// ترتيب مخصص للباقات على الصفحة الرئيسية
const PACKAGE_ORDER = [
    "باقة الباحث",
    "باقة تنمية المهارات",
    "باقة الشريعة والقانون",
    "باقة الإبداع الإعلاني",
    "باقة الإبداع الإعلامي",
    "باقة المجسّمات",
    "باقة الإدارة والتسويق",
    "باقة الصحة",
    "باقة تكوين النماذج",
];
const PACKAGE_ORDER_INDEX = new Map(PACKAGE_ORDER.map((name, i) => [name, i]));
const PACKAGE_KEYWORDS = [
    "الباحث",
    "تنمية المهارات",
    "الشريعة والقانون",
    "الإبداع الإعلاني",
    "الإبداع الإعلامي",
    "المجسّمات",
    "الإدارة والتسويق",
    "الصحة",
    "تكوين النماذج",
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
// Arabic-insensitive normalization for search
const normalizeAr = (s) => stripTashkeel((s || "").toString()).toLowerCase();
const tokenize = (s) => normalizeAr(s).trim().split(/\s+/).filter(Boolean);
const getPkgOrder = (name) => {
    const n = stripTashkeel(norm(name));
    if (PACKAGE_ORDER_INDEX.has(n)) return PACKAGE_ORDER_INDEX.get(n);
    for (let i = 0; i < PACKAGE_KEYWORDS.length; i++) {
        const kw = PACKAGE_KEYWORDS[i];
        if (n.includes(kw) || n.includes(kw.replace("المجسّمات", "المجسمات"))) return i;
    }
    return Number.POSITIVE_INFINITY;
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
        url:
            "https://chatgpt.com/g/g-681f47498138819197d357982c29544c-nmdhj-jy-by-ty-ldhky-custom-gpts?model=gpt-4o",
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
        url:
            "https://chatgpt.com/g/g-686b8ac963248191b35f6c4d8629e688-qtrh-nwyn-bhthy-suggesting-research-titles",
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
        url:
            "https://chatgpt.com/g/g-683d09bea51c8191b7688edadeef821d-bwt-sn-lkht-lbhthy",
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
    if (CATEGORY_ACCENTS[c]) return "from-neutral-800 via-neutral-900 to-black";
    // تجزئة بسيطة وثابتة لإسناد لون من القائمة
    let hash = 0;
    for (let i = 0; i < c.length; i++) {
        hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
    }
    return "from-neutral-800 via-neutral-900 to-black";
};

// مساعد لإرجاع لون البطاقة دائمًا حسب الفئة
const getAccent = (b) => pickAccentByCategory(b?.category);

const fmt = (n) => new Intl.NumberFormat("ar-SA").format(n);

const CATEGORY_ICONS = {
    "الباحث العلمي": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2a7 7 0 00-7 7v2H4a2 2 0 00-2 2v7h20v-7a2 2 0 00-2-2h-1V9a7 7 0 00-7-7zm-5 9V9a5 5 0 0110 0v2H7zm-3 2h16v5H4v-5z" /></svg>
    ),
    "المحتوى واللغة": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" /></svg>
    ),
    "التصميم والإبداع": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2l9 4-9 4-9-4 9-4zm9 7l-9 4-9-4v7l9 4 9-4V9z" /></svg>
    ),
    "الإدارة والتسويق": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M3 13h18v2H3v-2zm0 4h12v2H3v-2zM3 5h18v6H3V5z" /></svg>
    ),
    "باقة الأنظمة والقوانين": (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M6 2h12v2H6V2zM4 6h16v14H4V6zm2 2v10h12V8H6z" /></svg>
    ),
    default: (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="opacity-90"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
    ),
};

export default function App() {
    // الحالة العامة
    const [route, setRoute] = useState((typeof window !== "undefined" && window.location.hash.replace("#", "")) || "/");
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
            const v = localStorage.getItem('bots:catsExpanded');
            if (v != null) return v === '1';
            // افتراضيًا: مفتوح على سطح المكتب، مطوي على الجوال
            if (typeof window !== 'undefined' && window.matchMedia) {
                return window.matchMedia('(min-width: 768px)').matches;
            }
            return true;
        } catch { return true; }
    });
    // لا توجد وسوم، لذا لا حاجة لقياسات خاصة بها

    // Toast رسالة عابرة (مثلاً: تم نسخ الرابط)
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    // Safe external opener with simple feedback
    const openExternal = (url) => {
        try { clearTimeout(toastTimerRef.current); } catch {}
        if (!isSafeUrl(url)) {
            setToast('رابط غير صالح');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            return;
        }
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { }
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

    // (المفضلة أزيلت)

    // تحميل البيانات من public/new_bots.json (هيكل حِزَم → فئات → بوتات)
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/";
                const res = await fetch(`${base}new_bots.json`, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                // تطبيع البيانات إلى مصفوفة مسطحة مع الاحتفاظ بالحزمة والفئة ونماذج الروابط
                const flat = [];
                const pkgs = Array.isArray(data?.packages) ? data.packages : [];
                for (const pkg of pkgs) {
                    const packageName = (pkg?.package || "").toString().trim() || "حزمة";
                    const packageTitle = (pkg?.packageTitle || pkg?.title || packageName).toString().trim();
                    const packageId = pkg?.packageId ?? undefined;
                    const cats = Array.isArray(pkg?.categories) ? pkg.categories : [];
                    for (const catObj of cats) {
                        const category = (catObj?.category || "").toString().trim() || "غير مصنّف";
                        const botsArr = Array.isArray(catObj?.bots) ? catObj.bots : [];
                        for (let i = 0; i < botsArr.length; i++) {
                            const b = botsArr[i] || {};
                            const title = (b?.botTitle || b?.title || "").toString().trim() || `بوت ${i + 1}`;
                            const models = (b?.['النموذج']) || b?.models || {};
                            const about = b?.['نبذة'] || b?.about || "";
                            const limits = b?.['حدود'] || b?.limits || "";
                            const example = b?.['مثال'] || b?.example || "";
                            const model4o = (models && typeof models === 'object') ? (models['4O'] || models['4o'] || models['4o-mini'] || "") : "";
                            const model5 = (models && typeof models === 'object') ? (models['5'] || models['gpt-5'] || "") : "";
                            const primaryUrl = model4o || model5 || "#";
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
                                url: primaryUrl,
                                models: { '4O': model4o, '5': model5 },
                                about,
                                limits,
                                example,
                                tags: [],
                                badge: "",
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
        } catch { }
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

    // حفظ حالة الطيّ للفئات
    useEffect(() => {
        try {
            localStorage.setItem('bots:catsExpanded', catsExpanded ? '1' : '0');
        } catch { }
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
            const set = new Set(bots.map((b) => (b.title || '').toString().trim()).filter(Boolean));
            return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
        } catch { return []; }
    }, [bots]);

    // أدوات مساعدة: تهيئة الاتصال ونسخ الرابط
    const warmUp = (url) => {
        try {
            if (!isSafeUrl(url)) return;
            const u = new URL(url, window.location.href);
            const origin = `${u.protocol}//${u.host}`;
            const pre = document.createElement("link");
            pre.rel = "preconnect";
            pre.href = origin;
            pre.crossOrigin = "anonymous";
            document.head.appendChild(pre);
            const pf = document.createElement("link");
            pf.rel = "prefetch";
            pf.href = url;
            pf.as = "document";
            document.head.appendChild(pf);
        } catch { }
    };

    const copyLink = async (url) => {
        if (!isSafeUrl(url)) {
            try { clearTimeout(toastTimerRef.current); } catch {}
            setToast('لا يمكن نسخ رابط غير صالح');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            try { clearTimeout(toastTimerRef.current); } catch {}
            setToast('تم نسخ الرابط');
            toastTimerRef.current = setTimeout(() => setToast(null), 1800);
        } catch {
            try {
                const ta = document.createElement("textarea");
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                try { clearTimeout(toastTimerRef.current); } catch {}
                setToast('تم نسخ الرابط');
                toastTimerRef.current = setTimeout(() => setToast(null), 1800);
            } catch { }
        }
    };

    // تجميع هرمي: حزمة ← فئة ← بوتات
    const groupedPackages = useMemo(() => {
        // pkgMap: key -> { displayName, catMap }
        const pkgMap = new Map();
        for (const b of filtered) {
            const pkgKey = b.package || "حزمة";
            const displayName = (b.packageTitle || pkgKey);
            const catName = b.category || "غير مصنّف";
            if (!pkgMap.has(pkgKey)) pkgMap.set(pkgKey, { displayName, catMap: new Map() });
            const entry = pkgMap.get(pkgKey);
            if (!entry.displayName) entry.displayName = displayName;
            if (!entry.catMap.has(catName)) entry.catMap.set(catName, []);
            entry.catMap.get(catName).push(b);
        }
        // إلى مصفوفات مرتبة
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
                                transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                                className="relative inline-grid w-12 h-12 md:w-14 md:h-14 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
                                aria-hidden
                            >
                                <img src={logoUrl} alt="الشعار" className="h-full w-full object-contain" />
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
                            <a href="https://www.instagram.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="إنستغرام" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="إنستغرام">
                                <i className="fa-brands fa-instagram fa-lg text-white"></i>
                            </a>
                            <a href="https://www.facebook.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="فيسبوك" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="فيسبوك">
                                <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                            </a>
                            <a href="https://www.tiktok.com/@alzarraei" target="_blank" rel="noopener" aria-label="تيك توك" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="تيك توك">
                                <i className="fa-brands fa-tiktok fa-lg text-white"></i>
                            </a>
                            <a href="mailto:zraieee@gmail.com" target="_blank" rel="noopener" aria-label="البريد الإلكتروني" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="البريد الإلكتروني">
                                <i className="fa-solid fa-envelope fa-lg text-white"></i>
                            </a>
                            <a href="https://www.paypal.com/paypalme/zraiee" target="_blank" rel="noopener" aria-label="PayPal" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="PayPal">
                                <i className="fa-brands fa-paypal fa-lg text-white"></i>
                            </a>
                            <a href="https://www.linkedin.com/in/abdulrahman-alzarraei/" target="_blank" rel="noopener" aria-label="لينكدإن" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition" title="لينكدإن">
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
                            <span className="hidden md:inline text-xs text-white/70 mr-1">قنواتنا الرسمية</span>
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
                                    transition={{ duration: 0.6, ease: "easeOut", opacity: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }}
                                    className="text-3xl/tight md:text-5xl/tight font-bold tracking-[-0.02em] bg-gradient-to-r from-neutral-50 via-lime-200 to-neutral-200 bg-clip-text text-transparent drop-shadow animate-gradient-slow"
                                >
                                    منصّة النماذج العربية الذكية — طوّر أداءك بإتقان
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: [0.92, 1, 0.92], y: 0 }}
                                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }}
                                    className="mt-3 md:mt-4 max-w-2xl text-sm md:text-base bg-gradient-to-r from-neutral-300 via-white to-neutral-300 bg-clip-text text-transparent animate-gradient-slow"
                                >
                                    واجهات أنيقة وتفاعلات سلسة تساعدك على العثور على النموذج المناسب بسرعة — بحث لحظي، تصفية متقدّمة، ولوحة أوامر تفتح أي بوت بضغطة.
                                </motion.p>
                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <a
                                        href="#"
                                        className="nv-btn text-sm"
                                    >
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
                                            {c !== "الكل" && (
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
                                    title={catsExpanded ? "إظهار سطر واحد" : "عرض كل الفئات"}
                                    aria-expanded={catsExpanded}
                                    aria-label="تبديل عرض الفئات"
                                >
                                    <span className="mx-1">{catsExpanded ? 'إخفاء' : 'إظهار المزيد'}</span>
                                    <span className="text-lg leading-none">{catsExpanded ? '▲' : '▼'}</span>
                                </button>
                            </div>

                            {/* بحث وترتيب */}
                            <div className="ml-auto flex items-center gap-2">
                                {/* صندوق بحث مبسّط بدون حدود داخلية */}
                                <div className="flex w-[220px] md:w-[360px] items-center gap-1 nv-input">
                                    <input
                                        type="search"
                                        inputMode="search"
                                        autoComplete="off"
                                        maxLength={200}
                                        aria-label="بحث"
                                        value={q}
                                        onChange={(e) => setQ(sanitizeText(e.target.value))}
                                        placeholder={'ابحث باسم البوت…'}
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
                                            title="مسح البحث"
                                        >
                                            مسح
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

                        {/* تم إزالة الوسوم من الواجهة */}

                        {/* عدّاد */}
                        <p className="mt-3 text-xs md:text-sm text-white/70">
                            نتائج: {fmt(filtered.length)} بوت
                        </p>

                        {/* الحِزَم ← الفئات ← البوتات */}
                        <div className="mt-4 space-y-8">
                            {groupedPackages.map((pkg) => (
                                <section key={pkg.key || pkg.name} aria-label={pkg.name} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-3 md:p-5 shadow">
                                    {/* عنوان الحزمة */}
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
                                            className={`inline-flex items-center gap-2 text-xl md:text-2xl font-extrabold text-white rounded-full border-2 border-emerald-300 px-4 py-1.5 bg-neutral-900/60 ring-2 ring-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 hover:bg-neutral-900/70 shadow-[0_0_0_1px_rgba(16,185,129,0.18)] transition-colors`}
                                        >
                                            <span className="opacity-90">
                                                {(CATEGORY_ICONS[pkg.name] || CATEGORY_ICONS.default)}
                                            </span>
                                            {pkg.name}
                                            <span className="me-1 inline-block h-2.5 w-2.5 rounded-full bg-neutral-300/70"></span>
                                            <span className="mx-1 text-xs font-semibold text-white/80 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">{pkg.cats.length}</span>
                                            <span className={`ms-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/80 transition-transform ${expandedPkgs.has(pkg.key || pkg.name) ? 'rotate-180' : 'rotate-0'}`}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5H7z"/></svg>
                                            </span>
                                        </button>
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                    </motion.div>
                                    <p className="-mt-1 text-center text-[11px] text-white/60">حُزمة • {pkg.cats.length} فئات</p>

                                    {/* فئات الحزمة */}
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
                                                <span className={`inline-flex items-center gap-1 text-sm md:text-base text-white/90 rounded-full border border-white/10 px-2 py-0.5 bg-gradient-to-br from-neutral-700 to-neutral-900 shadow-[0_0_18px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm animate-gradient-slow`}>
                                                    {cat.name}
                                                </span>
                                                <span className="hidden md:inline text-xs text-white/60">{cat.rows.length} بوت</span>
                                                <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                <AnimatePresence mode="popLayout">
                                                    {cat.rows.map((b) => (
                                                        <motion.div
                                                            key={b.id}
                                                            initial={{ opacity: 0, y: 18 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                                            className="pixel-card group relative overflow-hidden rounded-2xl bg-neutral-900/60 p-3 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition will-change-transform"
                                                        >
                                                            <div className={`absolute inset-0 opacity-60 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black`} />
                                                            <div className="relative z-10 flex h-full flex-col">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <div className="ml-auto" />
                                                                </div>
                                                                <h3 className="mt-2 line-clamp-2 text-base md:text-lg leading-snug font-bold tracking-tight drop-shadow-sm min-h-[2.75rem] md:min-h-[3.125rem]">
                                                                    {b.title}
                                                                </h3>
                                                                <div className="mt-2 grid grid-cols-3 gap-3 text-xs pb-2">
                                                                    <button onClick={() => setBotModal({ type: "about", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-white/10 hover:text-white transition">
                                                                        نبذة
                                                                    </button>
                                                                    <button onClick={() => setBotModal({ type: "limits", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-white/10 hover:text-white transition">
                                                                        حدود
                                                                    </button>
                                                                    <button onClick={() => setBotModal({ type: "example", bot: b })} className="rounded-xl border border-white/15 bg-black px-2 py-1.5 font-bold text-white hover:bg-white/10 hover:text-white transition">
                                                                        مثال
                                                                    </button>
                                                                </div>
                                                                {/* أزرار النماذج */}
                                                                <div className="mt-auto flex items-center gap-2 text-xs">
                                                                    <button
                                                                        onClick={() => {
                                                                            const urls = Object.values(b?.models || {}).filter(Boolean);
                                                                            if (urls.length > 1) {
                                                                                setBotModal({ type: 'choose-model', bot: b });
                                                                            } else {
                                                                                const u = urls[0] || b.url;
                                                                                if (u) openExternal(u);
                                                                            }
                                                                        }}
                                                                        className="flex-1 grid place-items-center rounded-xl bg-gradient-to-br from-neutral-700 via-neutral-800 to-black px-3 py-2 font-bold text-white shadow hover:shadow-lg animate-gradient-slow"
                                                                    >
                                                                        فتح البوت ↗
                                                                    </button>
                                                                    <button
                                                                        onClick={() => copyLink(b?.models?.['4O'] || b?.models?.['5'] || b.url)}
                                                                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-white hover:bg-white/15 transition"
                                                                        title="نسخ الرابط"
                                                                    >
                                                                        نسخ الرابط
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.12)_20%,transparent_35%)] opacity-0 group-hover:opacity-100 transition duration-700" />
                                                        </motion.div>
                                                    ))}
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
                                                <p className="mb-3 font-bold text-white/95">اختر النموذج:</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {Object.entries(botModal.bot?.models || {})
                                                        .filter(([, url]) => !!url)
                                                        .map(([name, url]) => (
                                                            <a
                                                                key={name}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener"
                                                                className={`nv-btn px-3 py-2 text-center text-sm ${name.toLowerCase().includes('4') ? '' : 'bg-gradient-to-br from-violet-400 via-fuchsia-500 to-violet-400 animate-gradient-slow'}`}
                                                            >
                                                                {name} ↗
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

            {route === "/books" && <BooksPage />}
            {route === "/about" && <AboutPage botsCount={bots.length} catsCount={categories.length} booksCount={STATIC_BOOKS.length} />}

            {/* تذييل */}
            <footer className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-white/70">
                                نصنع تجارب عربية متقنة في الذكاء الاصطناعي. شاركنا اقتراحاتك وروابط البوتات التي تود إضافتها — ونعمل على دمجها ضمن أقسام مخصّصة وبأسلوب احترافي.
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
                                <a href="https://t.me/zraiee" target="_blank" rel="noopener" aria-label="تيليغرام" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-telegram fa-lg text-white"></i>
                                </a>
                                <a href="https://x.com/Arab_Ai_" target="_blank" rel="noopener" aria-label="منصة إكس" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-x-twitter fa-lg text-white"></i>
                                </a>
                                <a href="https://www.youtube.com/@alzarraei-gpts" target="_blank" rel="noopener" aria-label="يوتيوب" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-youtube fa-lg text-white"></i>
                                </a>
                                {/* Instagram */}
                                <a href="https://www.instagram.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="إنستغرام" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-instagram fa-lg text-white"></i>
                                </a>
                                {/* Facebook */}
                                <a href="https://www.facebook.com/alzarraei.gpts/" target="_blank" rel="noopener" aria-label="فيسبوك" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-facebook-f fa-lg text-white"></i>
                                </a>
                                {/* TikTok */}
                                <a href="https://www.tiktok.com/@alzarraei" target="_blank" rel="noopener" aria-label="تيك توك" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-tiktok fa-lg text-white"></i>
                                </a>
                                {/* Email */}
                                <a href="mailto:zraieee@gmail.com" target="_blank" rel="noopener" aria-label="البريد الإلكتروني" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-solid fa-envelope fa-lg text-white"></i>
                                </a>
                                {/* PayPal */}
                                <a href="https://www.paypal.com/paypalme/zraiee" target="_blank" rel="noopener" aria-label="باي بال" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-paypal fa-lg text-white"></i>
                                </a>
                                {/* LinkedIn */}
                                <a href="https://www.linkedin.com/in/abdulrahman-alzarraei/" target="_blank" rel="noopener" aria-label="لينكدإن" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                                    <i className="fa-brands fa-linkedin-in fa-lg text-white"></i>
                                </a>
                            </div>
                        </div>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-16 right-4 z-50 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-lg transition ${showTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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

// ————————————————————————————————————————————
// صفحة الكتب: بطاقات + نوافذ منبثقة متحركة
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

    // تجميع الكتب حسب السلسلة/الفئة
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
                        من المؤلف إلى القارئ — منشورات مختارة
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0.9, 1, 0.9], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }} className="mt-2 text-white/70 text-sm md:text-base max-w-2xl">
                        استكشف أعمالاً صُنعت بعناية لتضيف قيمة حقيقية إلى تجربتك. لكل إصدار قصة ومنهج وأثر — ابدأ القراءة أو حمّل النسخة المناسبة لك.
                    </motion.p>
                </div>
                <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
            </div>

            {/* مجموعات حسب السلسلة */}
            {loading && (
                <div className="mt-6 text-center py-12 text-white/60">جارٍ التحميل…</div>
            )}
            {!loading && (
                (STATIC_SERIES || []).map((s) => {
                    const rows = groupedBooks.get(s.id) || [];
                    if (!rows.length) return null;
                    return (
                        <section key={s.id} className="mt-6">
                            <h2 className="text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">{s.title}</h2>
                            <p className="mt-1 text-white/70 text-sm">سلسلة مختارة تضم إصدارات متخصصة بعناية.</p>
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
                                                            مشاهدة
                                                        </a>
                                                        <button
                                                            onClick={() => b.downloadUrl && handleDownload(b.downloadUrl, `${b.slug || b.id}.pdf`)}
                                                            className={`px-3 py-2 text-center text-xs font-bold text-white rounded-xl ${b.downloadUrl ? 'nv-btn' : 'bg-white/5 opacity-60 cursor-not-allowed'}`}
                                                            disabled={!b.downloadUrl}
                                                        >
                                                            تحميل
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

// شريط تنقل Gooey بسيط لروابط الصفحات
function GooeyNav({ route }) {
    const items = [
        { href: "#/", label: "الرئيسية" },
        { href: "#/books", label: "الكتب" },
        { href: "#/about", label: "من نحن" },
        { href: "https://wa.me/966552191598", label: "اشتراك", external: true },
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

// صفحة من نحن بتخطيط Bento متحرك
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
                        من نحن
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0.9, 1, 0.9], y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05, opacity: { duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.8 } }} className="mt-3 text-white/80 text-sm md:text-base leading-relaxed">
                        أسّس هذه المنصة د. عبدالرحمن الزراعي، مشرف أكاديمي وباحث متخصص في مجالات البحوث العلمية، مهتم بالفنون البصرية ونماذج الذكاء الاصطناعي، عمل من وقت طويل على تطوير تعليمات دقيقة ومخصصة للنماذج العربية الذكية GPT، وهذه التعليمات تهدف إلى إنشاء نماذج ذكية تعمل على تحقيق أداء متسق وعالي الجودة في مختلف التخصصات، فضلاً عن استضافة فريق من الباحثين والأكاديميين والمهتمين في العمل لبناء رؤية تحليلية عميقة ومنهجية وصارمة في تصميم كل نموذج، وهذا يضمن توافق تلك النماذج مع المعايير العلمية واللغوية، وتقييم أدائها على نحو منهجي بهدف تحسينها وتطويرها، كما يسعى الفريق إلى تمكين المجتمع العربي من الإفادة الكاملة من قدرات الذكاء الاصطناعي بلغته وثقافته، إيمانًا منه بأن التقنية المصممة بعناية قادرة على أن تكون أداة فعالة، وأن تسهم بقوة في تعزيز الكفاءة والإنتاجية.
                    </motion.p>
                    {/* Counters */}
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-lime-400/20 to-emerald-500/20 text-lime-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a5 5 0 015 5v2h1a3 3 0 013 3v8H3V12a3 3 0 013-3h1V7a5 5 0 015-5zm-3 7h6V7a3 3 0 10-6 0v2zm11 5H4v5h16v-5z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(bc)}</div>
                            <div className="text-white/60">بوت</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400/20 to-cyan-500/20 text-sky-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(cc)}</div>
                            <div className="text-white/60">فئة</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 2h14a1 1 0 011 1v18l-8-4-8 4V3a1 1 0 011-1z" /></svg>
                            </div>
                            <div className="text-2xl font-extrabold">{fmt(bk)}</div>
                            <div className="text-white/60">كتاب</div>
                        </div>
                    </div>
                    {/* أزلنا الشرائح/الوسوم من قسم من نحن بناءً على الطلب */}
                </div>
                <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.08)_20%,transparent_35%)]" />
                <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-lime-400/15 to-emerald-500/0 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/15 to-lime-500/0 blur-3xl" />
            </div>

            {/* Sections */}
            <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* وصف */}
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
                            وصف المنصة
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            تضم بوابة «النماذج العربية الذكية» حزمة متكاملة من الباقات والبوتات المصممة خصيصًا لدعم المستخدم العربي في مجالات عدة، تشمل: البحث العلمي، والتعليم، والتصميم، والإدارة، والتسويق، والقانون، والبرمجة، وغيرها. تحتوي كل باقة على مجموعة من البوتات التي تؤدي مهامًا ذكية محددة بدقة وسرعة، مثل: إعداد العنوان والفكرة، وصناعة الخطة، وإعداد البحث العلمي، وتوثيق النصوص، وتنسيق المراجع، وإعادة الصياغة، والترجمة الاصطلاحية، وتحليل النصوص، وغيرها.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* دوراتنا */}
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
                            دوراتنا
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            نقدم مجموعة من الدورات التدريبية المصممة بعناية لتعريف المستخدمين بواجهة ChatGPT وطرق التعامل معها باحتراف، وتشمل الدورات محاور أساسية مثل: كيفية طرح الأسئلة، وإدارة الحوار، وهندسة التعليمات وتوجيهها بطريقة صحيحة، كما نقدم دورات في البحث العلمي تتناول كيفية إنشاء نماذج مخصصة للعمل البحثي، وتتناول أيضاً مفاهيم مثل النماذج التوليدية، وتعليمات التكوين، وتدريب النماذج، وفهم آليات التفكير الآلي. تُعقد الدورات بأسلوب تطبيقي مع مواد تعليمية تساعد على التطبيق الفوري، ويمكن طلب الدورات بشكل فردي أو جماعي حسب الحاجة.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* جديدنا */}
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
                            جديدنا
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            نعمل باستمرار على تطوير نماذج ذكية جديدة تواكب الاحتياجات المتغيرة للمستخدمين. من أحدث ما أُضيف: «اقتراح عنوان وفكرة بحث»، «دليل فهارس المخطوطات»، «تعليمات تكوين النموذج»، «علم العروض والأوزان الشعرية»، «المساعد في تأليف الكتب»، «نظام الزكاة»، و«الرد الفوري على الفتوى الشرعية». تأتي هذه النماذج ضمن باقات جاهزة للاستخدام، مع فيديوهات شرح وتوجيهات مخصصة.
                        </p>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>

                {/* روابط */}
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
                            روابط ومراجع
                        </h2>
                        <p className="mt-2 text-white/80 text-sm md:text-base leading-relaxed">
                            نوفر مجموعة من الروابط التعليمية لمساعدة المستخدم على فهم آلية عمل الذكاء الاصطناعي وطريقة التعامل مع النماذج المخصصة. من أبرز المحتويات: كتاب «الآلة التي تفكر» وكتاب «الآلة التي ترد»، إضافة إلى مؤلفات مختصرة وملفات إرشادية قابلة للتحميل تحتوي على أمثلة عملية وتعليمات جاهزة للاستخدام. يتم تحديث المواد التعليمية باستمرار وبأسلوب يناسب جميع المستويات.
                        </p>
                        <div className="mt-3">
                            <a
                                href="https://alzarraei-gpts.github.io/Arabic-GPT-Hub-books/"
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:shadow-lg"
                            >
                                روابط الكتب ↗
                            </a>
                        </div>
                    </div>
                    <div className="pointer-events-none absolute -inset-[1px] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0,rgba(255,255,255,0.10)_20%,transparent_35%)]" />
                </motion.article>
            </section>

            {/* Timeline */}
            <section className="mt-6">
                <div className="mx-auto max-w-6xl">
                    <h3 className="mb-3 text-base md:text-lg font-extrabold bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-200 text-transparent bg-clip-text animate-gradient-slow">رحلتنا</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-rose-400 to-pink-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">الفكرة</span>
                                <p className="mt-2 text-sm text-white/85">تصميم تجربة عربية فاخرة للبوتات.</p>
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-sky-400 to-cyan-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">التطوير</span>
                                <p className="mt-2 text-sm text-white/85">هندسة التعليمات ونماذج مخصّصة عالية الجودة.</p>
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-amber-400 to-orange-500 animate-gradient-slow" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white animate-gradient-slow">الإطلاق</span>
                                <p className="mt-2 text-sm text-white/85">بوابة النماذج العربية الذكية.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
// غلاف PDF: يحاول استخراج الصفحة الأولى، وإلا يستخدم صورة احتياطية
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
        title: "اقتراح العناوين البحثية — دليل عملي",
        author: "د. الزرّاعي",
        category: "الباحث العلمي",
        tags: ["ماجستير", "دكتوراه"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
    {
        id: "bk-02",
        title: "أساسيات المنهجية العلمية",
        author: "د. الزرّاعي",
        category: "الباحث العلمي",
        tags: ["منهجية", "توثيق"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
    {
        id: "bk-03",
        title: "دليل كتابة المحتوى العربي",
        author: "د. الزرّاعي",
        category: "المحتوى واللغة",
        tags: ["تحرير", "صياغة"],
        coverUrl: logoUrl,
        viewUrl: "#",
        downloadUrl: "#"
    },
];

// افتراضيات لنوافذ البطاقات في الصفحة الرئيسية
const DEFAULT_BOT_ABOUT =
    "يُعدُّ هذا البوت أداةً ذكية متخصصة في دعم الباحثين وطلاب الدراسات العليا في اختيار عناوين أصيلة ومتميزة لرسائل الماجستير والدكتوراه، من خلال تحليل التخصصات الأكاديمية واستنباط الفرص البحثية غير المستكشفة.";
const DEFAULT_BOT_LIMITS =
    "تعمل ضمن نطاق أكاديمي صارم، وتلتزم بالأصالة البحثية والحياد والدقة واللغة العربية الفصيحة والتوثيق العلمي السليم. لا تقدّم اقتراحات عامة متداولة.";
const DEFAULT_BOT_EXAMPLE =
    "أدخل تخصصك (مثل: التربية الخاصة)، وسيقترح البوت 3 عناوين أصيلة لرسائل ماجستير ضمن هذا المجال.";

