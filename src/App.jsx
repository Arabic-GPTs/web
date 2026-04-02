import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

// Helper to get absolute URL to prevent fetch parsing errors
const getAbsoluteUrl = (path) => {
  if (typeof window === 'undefined') return path;
  try {
    // This ensures we always have a valid absolute URL for fetch
    return new URL(path, window.location.origin).href;
  } catch (e) {
    return path;
  }
};

// Robust BASE_URL resolution
const getBaseUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
      return import.meta.env.BASE_URL;
    }
  } catch (e) {}
  return "/";
};

const BASE_URL = getBaseUrl();

const resolvePublicPath = (path) => {
  const normalizedBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  const normalizedPath = (path || "").toString().replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
};

const logoUrl = resolvePublicPath("og-image.png");
const bgVideoUrl = resolvePublicPath("1080-60fps-ai.mp4");
const PACKAGE_PDFS_URL = getAbsoluteUrl(resolvePublicPath("data/packagePdfs.json"));
const NEW_BOTS_URL = getAbsoluteUrl(resolvePublicPath("new_bots.json"));

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
  "باقة صانع المحتوى": {
    full: "categorysPdf/with-info/04 Content Creator info.pdf",
    summary: "categorysPdf/manifest/04 Content Creator.pdf",
  },
  "باقة رائد الأعمال": {
    full: "categorysPdf/with-info/05 Entrepreneur info.pdf",
    summary: "categorysPdf/manifest/05 Entrepreneur.pdf",
  },
  "باقة المبرمج": {
    full: "categorysPdf/with-info/06 Programmer info.pdf",
    summary: "categorysPdf/manifest/06 Programmer.pdf",
  },
  "باقة المسوق": {
    full: "categorysPdf/with-info/07 Marketer info.pdf",
    summary: "categorysPdf/manifest/07 Marketer.pdf",
  },
  "باقة اللغات والترجمة": {
    full: "categorysPdf/with-info/08 Languages & Translation info.pdf",
    summary: "categorysPdf/manifest/08 Languages & Translation.pdf",
  },
};

const SOCIAL_ICONS = {
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  subscribe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
      <path d="M19 8v6" />
    </svg>
  )
};

function getPdfFile(packageName, lookup) {
  if (!lookup) return null;
  const match = Object.entries(lookup).find(([pkg]) => pkg === packageName);
  return match ? match[1] : null;
}

function getPdfFallbackFile(packageName, variant = "full") {
  const fallback = PACKAGE_PDF_FALLBACKS[packageName];
  return fallback ? (variant === "summary" ? fallback.summary : fallback.full) : null;
}

function normalizePdfFileCandidate(primary, fallback) {
  const candidate = primary || fallback;
  if (!candidate) return null;
  return candidate.startsWith("public/") ? candidate.slice(7) : candidate;
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
  if (typeof SOCIAL_ICONS !== 'undefined' && SOCIAL_ICONS.whatsapp) {
    console.log("Dev: Assets initialized correctly.");
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({ bots: [], packagePdfs: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDevAssertions();

    async function fetchData() {
      try {
        // Use absolute URLs for fetch to prevent parsing errors
        const [botsRes, pdfsRes] = await Promise.all([
          fetch(NEW_BOTS_URL).then((r) => {
             if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
             return r.json();
          }),
          fetch(PACKAGE_PDFS_URL).then((r) => {
             if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
             return r.json();
          }),
        ]);
        setData({ bots: botsRes.bots || [], packagePdfs: pdfsRes || {} });
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredBots = useMemo(() => {
    return (data.bots || []).filter((bot) => {
      const matchesSearch =
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || bot.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [data.bots, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-white selection:bg-lime-500/30 overflow-x-hidden" dir="rtl">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-20 grayscale brightness-50"
        >
          <source src={bgVideoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-transparent to-[#020617]" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-[#020617]/60 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-lime-500/20">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white md:text-2xl">
                بوابتك <span className="text-lime-400">للمستقبل</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                AI Intelligence Hub
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
             <a
              href="https://smart-mubtakir.com/p/paid-books"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-white/5 px-5 py-2.5 text-sm font-bold transition-all hover:bg-white/10 border border-white/10"
            >
              <span className="text-lime-400 group-hover:scale-110 transition-transform">{SOCIAL_ICONS.download}</span>
              الكتب المدفوعة
            </a>
            <a
              href="https://wa.me/966552191598"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-lime-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-lime-400/20"
            >
              <span>{SOCIAL_ICONS.whatsapp}</span>
              تواصل معنا
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-lime-400 border-t-transparent" />
          </div>
        ) : (
          <>
            <section className="mb-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-lime-400 backdrop-blur-md mb-6"
              >
                🚀 اكتشف عالم الذكاء الاصطناعي
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 text-4xl font-black leading-tight md:text-7xl"
              >
                نخبة <span className="bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">الروبوتات الذكية</span> <br className="hidden md:block" /> في مكان واحد
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mx-auto max-w-2xl text-lg text-white/60 leading-relaxed"
              >
                حلول متكاملة مدعومة بأحدث تقنيات الذكاء الاصطناعي لرفع إنتاجيتك في مختلف المجالات: البرمجة، التصميم، التسويق، وصناعة المحتوى.
              </motion.p>
            </section>

            <section className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                {["all", "البحث والبرمجة", "المحتوى والتصميم", "الأعمال والتسويق"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-lime-400 text-black shadow-lg shadow-lime-400/20"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "الكل" : tab}
                  </button>
                ))}
              </div>

              <div className="relative group w-full md:w-80">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/20 group-focus-within:text-lime-400 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="ابحث عن روبوت..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pr-12 pl-4 text-sm font-medium outline-none transition-all focus:border-lime-400/50 focus:bg-white/10 backdrop-blur-md"
                />
              </div>
            </section>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredBots.map((bot) => (
                  <motion.article
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={bot.name}
                    className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/5 p-4 transition-all hover:border-lime-400/30 hover:bg-white/[0.08]"
                  >
                    <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#0a0f1e] ring-1 ring-white/10">
                      <img
                        src={resolvePublicPath(bot.image)}
                        alt={bot.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-3 right-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                        {bot.category}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col px-2">
                      <h3 className="mb-2 text-xl font-black text-white group-hover:text-lime-400 transition-colors">
                        {bot.name}
                      </h3>
                      <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-white/50 font-medium">
                        {bot.description}
                      </p>

                      <div className="mt-auto space-y-3">
                        <a
                          href={bot.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-black py-3.5 text-sm font-black transition-all hover:bg-lime-400 hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/20"
                        >
                          ابدأ الاستخدام
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </a>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {getPdfUrl(bot.name, data.packagePdfs, "summary") && (
                            <a
                              href={getPdfUrl(bot.name, data.packagePdfs, "summary")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white"
                            >
                              الملخص
                            </a>
                          )}
                          {getPdfUrl(bot.name, data.packagePdfs, "full") && (
                            <a
                              href={getPdfUrl(bot.name, data.packagePdfs, "full")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white"
                            >
                              التفاصيل
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Action Banners */}
        <section className="mt-24 grid gap-8 md:grid-cols-2">
          <motion.article
            whileHover={{ y: -5 }}
            className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-gradient-to-br from-lime-500/10 to-emerald-500/10 p-10"
          >
            <div className="relative z-10">
              <h4 className="mb-4 text-3xl font-black">الكتب المدفوعة</h4>
              <p className="mb-8 max-w-md text-white/60 leading-relaxed font-medium">
                احصل على معرفة أعمق وأدوات حصرية لتطوير مهاراتك من خلال مكتبتنا المختارة من الكتب التعليمية المتقدمة.
              </p>
              <a
                href="https://smart-mubtakir.com/p/paid-books"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-black text-black transition-all hover:bg-lime-400 hover:scale-105 active:scale-95 shadow-2xl shadow-lime-500/20"
              >
                تصفح الكتب
                <span className="text-black/50 transition-transform group-hover:translate-x-[-5px]">{SOCIAL_ICONS.download}</span>
              </a>
            </div>
            <div className="absolute -bottom-10 -left-10 h-64 w-64 bg-lime-500/20 blur-[100px] group-hover:bg-lime-500/30 transition-colors" />
          </motion.article>

          <motion.article
            whileHover={{ y: -5 }}
            className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-10"
          >
            <div className="relative z-10">
              <h4 className="mb-4 text-3xl font-black">الاشتراكات المميزة</h4>
              <p className="mb-8 max-w-md text-white/60 leading-relaxed font-medium">
                استمتع بمميزات غير محدودة ودخول حصري لأقوى الروبوتات والأدوات الذكية التي نوفرها لعملائنا المميزين.
              </p>
              <a
                href="https://wa.me/966552191598"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-black text-black transition-all hover:bg-blue-400 hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20"
              >
                اشترك الآن
                <span className="text-black/50 transition-transform group-hover:translate-x-[-5px]">{SOCIAL_ICONS.subscribe}</span>
              </a>
            </div>
            <div className="absolute -bottom-10 -left-10 h-64 w-64 bg-blue-500/20 blur-[100px] group-hover:bg-blue-500/30 transition-colors" />
          </motion.article>
        </section>
      </main>

      <footer className="relative z-10 mt-24 border-t border-white/5 bg-black/40 py-16 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <h5 className="mb-2 text-xl font-black">المبتكر الذكي</h5>
              <p className="text-sm font-medium text-white/40">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
            </div>
            <div className="flex gap-4">
              <a href="https://wa.me/966552191598" target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white">
                {SOCIAL_ICONS.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
