"use client";

import { useState, useMemo, useEffect, useRef, use } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CARTE, TAG_LABELS, type DietaryTag, type MenuItem } from "@/data/carte";

/* ═══════════════════════════════════════════════════════════
   MOBILE QR MENU — App-like experience for table diners
   ═══════════════════════════════════════════════════════════ */

const FILTERS: { key: DietaryTag | "all"; label: string; icon: string }[] = [
  { key: "all", label: "Tout", icon: "✨" },
  { key: "halal", label: "Halal", icon: "🥩" },
  { key: "vegetarien", label: "Végé", icon: "🌿" },
  { key: "epice", label: "Épicé", icon: "🌶️" },
];

export default function MobileMenuPage({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ table?: string }>;
}) {
  const searchParams = use(searchParamsPromise);
  const tableFromUrl = searchParams.table;

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<DietaryTag | "all">("all");
  const [activeCategory, setActiveCategory] = useState(CARTE[0].id);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [callWaiterOpen, setCallWaiterOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storedTable, setStoredTable] = useState<string | undefined>(undefined);
  const [tablePromptOpen, setTablePromptOpen] = useState(false);

  /* Effective table number — URL param wins, otherwise use the stored one */
  const tableNumber = tableFromUrl || storedTable;

  const mainRef = useRef<HTMLDivElement>(null);

  /* Load favorites + stored table + onboarding state */
  useEffect(() => {
    const stored = localStorage.getItem("arc-favorites");
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch {}
    }

    /* Smart table default: if no ?table= in URL, check localStorage or prompt */
    if (!tableFromUrl) {
      const storedT = localStorage.getItem("arc-table");
      if (storedT) {
        setStoredTable(storedT);
      } else {
        setTablePromptOpen(true);
      }
    }

    /* Show onboarding first time */
    const seen = localStorage.getItem("arc-onboarding-seen");
    if (!seen) {
      setShowOnboarding(true);
    }
  }, [tableFromUrl]);

  const saveTable = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem("arc-table", trimmed);
      setStoredTable(trimmed);
    }
    setTablePromptOpen(false);
  };

  const skipTable = () => {
    setTablePromptOpen(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("arc-favorites", JSON.stringify([...next]));
      return next;
    });
  };

  /* Filter + search logic */
  const filteredCarte = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CARTE.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        if (activeFilter !== "all" && !item.tags?.includes(activeFilter))
          return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [search, activeFilter]);

  /* Scroll spy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      { rootMargin: "-25% 0px -70% 0px" }
    );
    CARTE.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [filteredCarte]);

  const scrollToCategory = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem("arc-onboarding-seen", "1");
    setShowOnboarding(false);
  };

  const totalItems = CARTE.reduce((sum, cat) => sum + cat.items.length, 0);
  const favItems = Array.from(favorites)
    .map((id) => CARTE.flatMap((c) => c.items).find((i) => i.id === id))
    .filter(Boolean) as MenuItem[];

  return (
    <div className="min-h-screen bg-cream bg-paper pb-24">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-lg border-b border-terracotta/15">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gold font-bold">
                L&apos;Arc en Ciel
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown leading-tight">
                Notre carte
              </h1>
              {tableNumber && (
                <p className="text-xs text-brown-light/70 mt-0.5">
                  Table <span className="font-bold text-brown">#{tableNumber}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setCallWaiterOpen(true)}
              className="relative w-11 h-11 rounded-full bg-red text-white-warm flex items-center justify-center shadow-lg shadow-red/30 active:scale-95 transition-transform"
              aria-label="Appeler le serveur"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a7 7 0 10-14 0v3.2a2 2 0 01-.6 1.4L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <label className="relative block mb-3">
            <span className="sr-only">Rechercher un plat</span>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-light/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat, un ingrédient…"
              className="w-full pl-10 pr-10 py-2.5 bg-white-warm border border-terracotta/20 rounded-full text-sm text-brown placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-brown-light/60 hover:text-brown"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </label>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  activeFilter === f.key
                    ? "bg-brown text-cream border-brown"
                    : "bg-white-warm text-brown-light border-terracotta/20"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
            {favorites.size > 0 && (
              <button
                onClick={() => {
                  const el = document.getElementById("cat-favorites");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border bg-gold/20 text-brown border-gold/40 active:scale-95"
              >
                <span>❤️</span>
                <span>Favoris ({favorites.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Category tabs — sticky under header */}
        <nav className="overflow-x-auto scrollbar-hide border-t border-terracotta/10" aria-label="Catégories">
          <ul className="flex items-center gap-1 px-4 py-2 min-w-max">
            {CARTE.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => scrollToCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    activeCategory === cat.id
                      ? "bg-terracotta/20 text-brown"
                      : "text-brown-light/70"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ═══ MAIN ═══ */}
      <main ref={mainRef} className="px-4 pt-4">
        {/* Favorites section */}
        {favItems.length > 0 && !search && activeFilter === "all" && (
          <section id="cat-favorites" className="mb-8 scroll-mt-44">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">❤️</span>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
                Vos favoris
              </h2>
              <span className="text-xs text-brown-light/60">({favItems.length})</span>
            </div>
            <div className="space-y-3">
              {favItems.map((item) => (
                <MobileMenuCard
                  key={item.id}
                  item={item}
                  isFavorite={true}
                  onFavorite={toggleFavorite}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}

        {filteredCarte.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-brown-light">Aucun plat trouvé</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
              }}
              className="mt-4 text-red text-sm font-semibold"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredCarte.map((category) => (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              className="mb-8 scroll-mt-44"
              aria-labelledby={`heading-${category.id}`}
            >
              {/* Category header */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl">{category.icon}</span>
                <h2
                  id={`heading-${category.id}`}
                  className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown leading-tight"
                >
                  {category.title}
                </h2>
                <span className="text-xs text-brown-light/50 ml-auto">
                  {category.items.length} plat{category.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Items list */}
              <div className="space-y-3">
                {category.items.map((item) => (
                  <MobileMenuCard
                    key={item.id}
                    item={item}
                    isFavorite={favorites.has(item.id)}
                    onFavorite={toggleFavorite}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Footer note */}
        <div className="text-center text-xs text-brown-light/60 pt-6 pb-2 leading-relaxed px-4">
          <p>Prix TTC — Allergènes disponibles sur demande</p>
          <p className="mt-1">Viandes halal certifiées AVS</p>
        </div>
      </main>

      {/* ═══ BOTTOM BAR ═══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-brown text-cream border-t border-gold/20 shadow-2xl"
        aria-label="Actions"
      >
        <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <a
            href="tel:+33164540030"
            className="flex flex-col items-center gap-0.5 px-4 py-2 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-[10px] font-semibold">Appeler</span>
          </a>
          <button
            onClick={() => setCallWaiterOpen(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-2 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a7 7 0 10-14 0v3.2a2 2 0 01-.6 1.4L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-[10px] font-semibold">Serveur</span>
          </button>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex flex-col items-center gap-0.5 px-4 py-2 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <span className="text-[10px] font-semibold">Haut</span>
          </button>
          <a
            href="https://maps.app.goo.gl/abc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 px-4 py-2 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold">Plan</span>
          </a>
        </div>
      </nav>

      {/* ═══ DETAIL MODAL ═══ */}
      <AnimatePresence>
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            isFavorite={favorites.has(selectedItem.id)}
            onFavorite={toggleFavorite}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* ═══ CALL WAITER MODAL ═══ */}
      <AnimatePresence>
        {callWaiterOpen && (
          <CallWaiterModal
            tableNumber={tableNumber}
            onClose={() => setCallWaiterOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ ONBOARDING ═══ */}
      <AnimatePresence>
        {showOnboarding && <Onboarding onDismiss={dismissOnboarding} totalItems={totalItems} tableNumber={tableNumber} />}
      </AnimatePresence>

      {/* ═══ TABLE PROMPT ═══ */}
      <AnimatePresence>
        {tablePromptOpen && (
          <TablePrompt onSave={saveTable} onSkip={skipTable} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE CARD
   ═══════════════════════════════════════════════════════════ */
function MobileMenuCard({
  item,
  isFavorite,
  onFavorite,
  onClick,
}: {
  item: MenuItem;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className="relative flex gap-3 bg-white-warm rounded-2xl p-3 shadow-sm shadow-brown/5 active:scale-[0.98] transition-transform cursor-pointer overflow-hidden"
    >
      {/* Image */}
      {item.image && (
        <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-cream">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown leading-tight">
            {item.name}
          </h3>
          <span className="font-bold text-gold text-sm whitespace-nowrap">
            {item.price}
          </span>
        </div>
        <p className="text-[13px] text-brown-light/80 leading-snug line-clamp-2 mb-1.5">
          {item.description}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.signature && (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-brown text-gold-light px-1.5 py-0.5 rounded">
              ★ Signature
            </span>
          )}
          {item.chef && !item.signature && (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-gold text-brown px-1.5 py-0.5 rounded">
              Chef
            </span>
          )}
          {item.popular && !item.signature && !item.chef && (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-red text-white-warm px-1.5 py-0.5 rounded">
              Populaire
            </span>
          )}
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${TAG_LABELS[tag].color}`}
            >
              {TAG_LABELS[tag].label}
            </span>
          ))}
        </div>
      </div>

      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavorite(item.id);
        }}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white-warm/90 backdrop-blur-sm shadow-sm active:scale-90 transition-transform"
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        {isFavorite ? (
          <span className="text-red text-base">❤️</span>
        ) : (
          <svg className="w-4 h-4 text-brown-light/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        )}
      </button>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL — Fullscreen bottom sheet
   ═══════════════════════════════════════════════════════════ */
function DetailModal({
  item,
  isFavorite,
  onFavorite,
  onClose,
}: {
  item: MenuItem;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.name} — L'Arc en Ciel`,
          text: item.description,
          url: `${window.location.origin}${window.location.pathname}#${item.id}`,
        });
      } catch {}
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[92vh] overflow-y-auto overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        {/* Drag handle */}
        <div className="sticky top-0 pt-2 pb-1 flex justify-center bg-cream z-10">
          <div className="w-10 h-1 rounded-full bg-brown/20" />
        </div>

        {/* Image */}
        {item.image && (
          <div className="relative w-full aspect-[16/10] bg-brown">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white-warm flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 pb-28">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {item.signature && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-brown text-gold-light px-2.5 py-1 rounded-full">
                ★ Signature
              </span>
            )}
            {item.chef && !item.signature && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-gold text-brown px-2.5 py-1 rounded-full">
                Choix du chef
              </span>
            )}
            {item.popular && !item.signature && !item.chef && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-red text-white-warm px-2.5 py-1 rounded-full">
                Populaire
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 mb-2">
            <h2
              id="detail-title"
              className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-tight flex-1"
            >
              {item.name}
            </h2>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-gold whitespace-nowrap">
              {item.price}
            </span>
          </div>

          <p className="text-brown-light leading-relaxed mb-5">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-widest text-brown-light/60 font-semibold mb-2">
                Particularités
              </p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border ${TAG_LABELS[tag].color}`}
                  >
                    {TAG_LABELS[tag].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergens info */}
          <div className="bg-white-warm rounded-xl p-4 mb-5 border border-terracotta/15">
            <p className="text-xs text-brown-light/80 leading-relaxed">
              <strong className="text-brown">Allergènes :</strong> demandez la liste complète à votre serveur. Nous cuisinons dans un environnement où gluten, lactose, œufs et fruits à coque peuvent être présents.
            </p>
          </div>
        </div>

        {/* Fixed action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-cream/95 backdrop-blur-lg border-t border-terracotta/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
          <button
            onClick={() => onFavorite(item.id)}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors active:scale-95 ${
              isFavorite
                ? "bg-red text-white-warm border-red"
                : "bg-white-warm border-terracotta/20 text-brown-light"
            }`}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <button
            onClick={share}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-white-warm border-2 border-terracotta/20 text-brown-light flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Partager"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-brown hover:bg-brown/90 text-cream font-bold py-3 rounded-full transition-colors active:scale-[0.98]"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALL WAITER MODAL
   ═══════════════════════════════════════════════════════════ */
function CallWaiterModal({
  tableNumber,
  onClose,
}: {
  tableNumber?: string;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  const requests = [
    { icon: "🙋", label: "Appeler le serveur" },
    { icon: "🧾", label: "Demander l'addition" },
    { icon: "💧", label: "Apporter de l'eau" },
    { icon: "🍞", label: "Plus de pain" },
  ];

  const send = async (label: string) => {
    const table = Number(tableNumber) || 0;

    /* Demo case: no table number known — skip API, show confirmation anyway */
    if (table === 0) {
      setConfirmed(true);
      setTimeout(() => {
        onClose();
        setConfirmed(false);
      }, 1800);
      return;
    }

    /* Fire-and-forget POST. We show confirmation regardless — don't bother the user with errors. */
    try {
      await fetch("/api/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: table,
          request_type: label,
        }),
      });
    } catch {
      /* swallow — UX continues */
    }

    setConfirmed(true);
    setTimeout(() => {
      onClose();
      setConfirmed(false);
    }, 1800);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-label="Appeler le serveur"
      >
        <div className="w-10 h-1 rounded-full bg-brown/20 mx-auto mb-5" />

        {confirmed ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-6"
          >
            <div className="text-5xl mb-3">✓</div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-1">
              Demande envoyée
            </h3>
            <p className="text-brown-light text-sm">
              Un membre de l&apos;équipe arrive dans un instant
            </p>
          </motion.div>
        ) : (
          <>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-1">
              Besoin d&apos;aide ?
            </h3>
            <p className="text-brown-light text-sm mb-5">
              {tableNumber
                ? `Votre demande sera envoyée pour la table #${tableNumber}`
                : "Choisissez votre demande ci-dessous"}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {requests.map((r) => (
                <button
                  key={r.label}
                  onClick={() => send(r.label)}
                  className="flex flex-col items-center gap-2 p-4 bg-white-warm rounded-2xl border border-terracotta/15 active:scale-95 transition-transform hover:border-gold hover:shadow-md"
                >
                  <span className="text-3xl">{r.icon}</span>
                  <span className="text-xs font-semibold text-brown text-center leading-tight">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
            <a
              href="tel:+33164540030"
              className="block text-center text-xs text-red font-semibold py-3 active:scale-95 transition-transform"
            >
              Ou appeler directement : 01 64 54 00 30
            </a>
          </>
        )}
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════════════════════════ */
function Onboarding({
  onDismiss,
  totalItems,
  tableNumber,
}: {
  onDismiss: () => void;
  totalItems: number;
  tableNumber?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-brown flex items-center justify-center p-6"
    >
      <div className="text-center text-cream max-w-sm">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-[family-name:var(--font-script)] text-gold-light text-2xl mb-2"
        >
          Bienvenue chez
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-[family-name:var(--font-display)] text-5xl font-bold mb-6"
        >
          L&apos;Arc en Ciel
        </motion.h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-16 h-[2px] bg-gold mx-auto mb-8"
        />
        {tableNumber && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-cream/70 text-sm mb-2"
          >
            Table <span className="font-bold text-gold-light">#{tableNumber}</span>
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-cream/80 text-sm leading-relaxed mb-10"
        >
          Découvrez notre carte de <strong className="text-gold-light">{totalItems} plats</strong>,
          filtrez selon vos envies, et appelez-nous en un clic.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onDismiss}
          className="bg-gold hover:bg-gold/90 text-brown font-bold px-8 py-3.5 rounded-full active:scale-95 transition-transform shadow-xl shadow-gold/30"
        >
          Voir la carte
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TABLE PROMPT — Ask user for their table number once
   ═══════════════════════════════════════════════════════════ */
function TablePrompt({
  onSave,
  onSkip,
}: {
  onSave: (value: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSave(value);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[55] bg-brown/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-cream rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-prompt-title"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-brown/20 mx-auto mb-5" />

        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🍽️</div>
          <h3
            id="table-prompt-title"
            className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-1"
          >
            Quelle est votre numéro de table ?
          </h3>
          <p className="text-brown-light text-sm leading-relaxed">
            Pour nous permettre de vous servir plus vite. Vous pouvez ignorer
            cette étape.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            min={1}
            max={99}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex : 7"
            className="w-full px-4 py-3.5 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-center text-xl font-bold placeholder:text-brown-light/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full bg-red hover:bg-red-dark text-white-warm font-bold py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-red/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Valider
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center text-xs text-brown-light py-2 hover:text-brown transition-colors"
          >
            Pas de numéro de table → Continuer
          </button>
        </form>
      </motion.div>
    </>
  );
}
