"use client";

import { useState, useMemo, useEffect, useRef, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CARTE, TAG_LABELS, type DietaryTag, type MenuItem } from "@/data/carte";
import { formatCents, parsePriceToCents } from "@/lib/format";
import type { LoyaltyCard, LoyaltyConfig } from "@/lib/db/loyalty-types";

/* ═══════════════════════════════════════════════════════════
   MOBILE QR MENU — App-like experience for table diners.

   Cart flow:
     1. Tap "+ Ajouter" on a card → item appears in localStorage cart
     2. Tap 🛒 in the bottom bar → opens CartDrawer bottom sheet
     3. Adjust quantities / remove items
     4. Tap "Envoyer ma commande" → POST /api/m/order
     5. Cart clears, success toast

   Cart persistence key: `cart-table-{tableNumber}` (LocalStorage).
   Items merge by (menu_item_id + modifiers signature) — different
   modifiers = separate lines.
   ═══════════════════════════════════════════════════════════ */

const FILTERS: { key: DietaryTag | "all"; label: string; icon: string }[] = [
  { key: "all", label: "Tout", icon: "✨" },
  { key: "halal", label: "Halal", icon: "🥩" },
  { key: "vegetarien", label: "Végé", icon: "🌿" },
  { key: "epice", label: "Épicé", icon: "🌶️" },
];

/* Mirrors the mapping in src/app/staff/_lib/menu.ts — kept inline here to
 * avoid pulling a staff-side module into a public-facing client bundle. */
type Station = "main" | "pizza" | "grill" | "cold" | "dessert" | "bar";
function stationForCategory(categoryId: string): Station {
  switch (categoryId) {
    case "pizzas":
      return "pizza";
    case "grillades":
      return "grill";
    case "entrees":
    case "salades":
      return "cold";
    case "desserts":
      return "dessert";
    case "boissons":
      return "bar";
    default:
      return "main";
  }
}

/* ─── Cart types ─── */
interface CartLine {
  /** Stable line id — lets us edit quantity without stomping on other lines
   * that share the same menu_item_id but have different modifiers. */
  line_id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_category: string;
  price_cents: number;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  station: Station;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

type LoyaltyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "enrolled";
      card: LoyaltyCard;
      config: LoyaltyConfig;
    }
  | { kind: "anonymous"; config: LoyaltyConfig | null }
  | { kind: "disabled" };

type EnrollState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; cardNumber: string }
  | { kind: "error"; message: string };

const LOYALTY_CARD_KEY = "arc-loyalty-card";

function cartKey(table: string | undefined): string | null {
  if (!table) return null;
  return `cart-table-${table}`;
}

function signatureFor(item: Pick<CartLine, "menu_item_id" | "modifiers">): string {
  const mods = [...(item.modifiers || [])].sort().join("|");
  return `${item.menu_item_id}::${mods}`;
}

function makeLineId(): string {
  /* crypto.randomUUID isn't universal on older iOS Safari — cheap fallback. */
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function MobileMenuPage({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ table?: string }>;
}) {
  const searchParams = use(searchParamsPromise);
  const tableFromUrl = searchParams.table;
  const prefersReducedMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<DietaryTag | "all">("all");
  const [activeCategory, setActiveCategory] = useState(CARTE[0].id);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [callWaiterOpen, setCallWaiterOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storedTable, setStoredTable] = useState<string | undefined>(undefined);
  const [tablePromptOpen, setTablePromptOpen] = useState(false);

  /* Cart state — null until we've read localStorage to avoid flash-of-empty. */
  const [cart, setCart] = useState<CartLine[] | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [flashLineId, setFlashLineId] = useState<string | null>(null);

  /* Loyalty — ⭐ Rejoindre / show balance. Fetched once + after enrolment. */
  const [loyalty, setLoyalty] = useState<LoyaltyState>({ kind: "idle" });
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyPostOrder, setLoyaltyPostOrder] = useState(false);

  /* Effective table number — URL param wins, otherwise use the stored one */
  const tableNumber = tableFromUrl || storedTable;

  const mainRef = useRef<HTMLDivElement>(null);

  /* Load stored table + onboarding state.
   *
   * We read localStorage here and setState — this is the canonical "sync from
   * external system" case (localStorage isn't available during SSR, and
   * reading it in a lazy initialiser would hydration-mismatch). Disabling
   * react-hooks/set-state-in-effect locally: the rule warns about cascading
   * renders, but here the state settles after one extra render on mount,
   * which is acceptable for post-hydration hydration of client-only storage.
   */
  useEffect(() => {
    /* Smart table default: if no ?table= in URL, check localStorage or prompt */
    if (!tableFromUrl) {
      const storedT = localStorage.getItem("arc-table");
      if (storedT) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  /* Hydrate cart from localStorage whenever the effective table changes.
   * We key by table so switching tables doesn't mix items. Same external-
   * storage-sync justification as above. */
  useEffect(() => {
    const key = cartKey(tableNumber);
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart([]);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) {
          setCart(parsed);
          return;
        }
      }
    } catch {
      /* Corrupt cart — nuke it silently. */
    }
    setCart([]);
  }, [tableNumber]);

  /* Persist cart on any change. */
  useEffect(() => {
    const key = cartKey(tableNumber);
    if (!key || cart === null) return;
    try {
      if (cart.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(cart));
      }
    } catch {
      /* localStorage full / private mode → silent. Cart still works in-memory. */
    }
  }, [cart, tableNumber]);

  /* Bootstrap loyalty — fetch the public settings flag + any stored card. */
  const refreshLoyalty = useCallback(async () => {
    setLoyalty((prev) => (prev.kind === "idle" ? { kind: "loading" } : prev));
    try {
      const settingsRes = await fetch("/api/settings", { cache: "no-store" });
      const settings = settingsRes.ok
        ? ((await settingsRes.json()) as { feature_loyalty?: boolean })
        : {};
      if (settings.feature_loyalty === false) {
        setLoyalty({ kind: "disabled" });
        return;
      }

      const storedNumber =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LOYALTY_CARD_KEY)
          : null;

      if (storedNumber) {
        const cardRes = await fetch(
          `/api/loyalty/card/${encodeURIComponent(storedNumber)}`,
          { cache: "no-store" }
        );
        if (cardRes.ok) {
          const data = (await cardRes.json()) as {
            card: LoyaltyCard;
            config: LoyaltyConfig;
          };
          setLoyalty({ kind: "enrolled", card: data.card, config: data.config });
          return;
        }
        /* Stale card number — clear it silently and fall through to anonymous. */
        try {
          window.localStorage.removeItem(LOYALTY_CARD_KEY);
        } catch {}
      }

      /* No card (yet) — fetch the public config so we can display the teaser. */
      try {
        const cfgRes = await fetch("/api/loyalty/config", {
          cache: "no-store",
        });
        if (cfgRes.ok) {
          const config = (await cfgRes.json()) as LoyaltyConfig;
          if (config.active === false) {
            setLoyalty({ kind: "disabled" });
            return;
          }
          setLoyalty({ kind: "anonymous", config });
          return;
        }
      } catch {}
      setLoyalty({ kind: "anonymous", config: null });
    } catch {
      setLoyalty({ kind: "anonymous", config: null });
    }
  }, []);

  useEffect(() => {
    refreshLoyalty();
  }, [refreshLoyalty]);

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

  /* ─── Cart mutations ───────────────────────────────── */

  const addToCart = useCallback(
    (item: MenuItem, categoryId: string, modifiers?: string[]) => {
      const priceCents = parsePriceToCents(item.price);
      if (priceCents <= 0) return;

      const candidate = {
        menu_item_id: item.id,
        modifiers: modifiers && modifiers.length > 0 ? modifiers : undefined,
      };
      const sig = signatureFor(candidate);

      setCart((prev) => {
        const base = prev ?? [];
        const idx = base.findIndex((l) => signatureFor(l) === sig);
        if (idx >= 0) {
          /* Bump the existing line by 1. */
          const next = base.slice();
          const existing = next[idx];
          next[idx] = {
            ...existing,
            quantity: Math.min(20, existing.quantity + 1),
          };
          setFlashLineId(existing.line_id);
          return next;
        }
        const line: CartLine = {
          line_id: makeLineId(),
          menu_item_id: item.id,
          menu_item_name: item.name,
          menu_item_category: categoryId,
          price_cents: priceCents,
          quantity: 1,
          modifiers: candidate.modifiers,
          station: stationForCategory(categoryId),
        };
        setFlashLineId(line.line_id);
        return [...base, line];
      });
    },
    []
  );

  /* Clear the flash highlight after a beat. */
  useEffect(() => {
    if (!flashLineId) return;
    const id = window.setTimeout(() => setFlashLineId(null), 900);
    return () => window.clearTimeout(id);
  }, [flashLineId]);

  const setLineQuantity = useCallback((lineId: string, quantity: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        return prev.filter((l) => l.line_id !== lineId);
      }
      return prev.map((l) =>
        l.line_id === lineId
          ? { ...l, quantity: Math.min(20, Math.max(1, Math.floor(quantity))) }
          : l
      );
    });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setCart((prev) => (prev ? prev.filter((l) => l.line_id !== lineId) : prev));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  /* ─── Derived cart stats ────────────────────────────── */
  const cartCount = useMemo(
    () => (cart || []).reduce((s, l) => s + l.quantity, 0),
    [cart]
  );
  const cartSubtotal = useMemo(
    () => (cart || []).reduce((s, l) => s + l.price_cents * l.quantity, 0),
    [cart]
  );
  const cartTax = Math.round(cartSubtotal * 0.1);
  const cartTotal = cartSubtotal + cartTax;

  /* ─── Submit cart ───────────────────────────────────── */
  const submitCart = useCallback(async () => {
    if (!cart || cart.length === 0) return;
    if (!tableNumber) {
      setSubmitState({
        kind: "error",
        message:
          "Indiquez votre numéro de table avant d'envoyer la commande.",
      });
      return;
    }
    const tableNum = Number(tableNumber);
    if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > 50) {
      setSubmitState({
        kind: "error",
        message: "Numéro de table invalide.",
      });
      return;
    }

    setSubmitState({ kind: "sending" });
    try {
      const res = await fetch("/api/m/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: tableNum,
          items: cart.map((l) => ({
            menu_item_id: l.menu_item_id,
            menu_item_name: l.menu_item_name,
            menu_item_category: l.menu_item_category,
            price_cents: l.price_cents,
            quantity: l.quantity,
            modifiers: l.modifiers,
            notes: l.notes,
            station: l.station,
          })),
        }),
      });
      if (!res.ok) {
        let message = "Impossible d'envoyer la commande.";
        try {
          const json = (await res.json()) as { error?: string };
          if (json?.error) message = json.error;
        } catch {}
        setSubmitState({ kind: "error", message });
        return;
      }
      setSubmitState({ kind: "success" });
      clearCart();
      /* If loyalty is active AND the diner isn't enrolled yet, surface the
       * post-order invitation card after the success toast closes. */
      if (loyalty.kind === "anonymous" && loyalty.config?.active) {
        window.setTimeout(() => {
          setCartOpen(false);
          setLoyaltyPostOrder(true);
        }, 2200);
        window.setTimeout(() => setSubmitState({ kind: "idle" }), 2600);
        return;
      }
      /* Auto-dismiss the drawer after a beat. */
      window.setTimeout(() => {
        setCartOpen(false);
        /* Reset to idle a moment later so if user reopens it, it's clean. */
        window.setTimeout(() => setSubmitState({ kind: "idle" }), 400);
      }, 2200);
    } catch {
      setSubmitState({
        kind: "error",
        message: "Connexion interrompue. Vérifiez votre réseau.",
      });
    }
  }, [cart, tableNumber, clearCart]);

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
            setActiveCategory(entry.target.id.replace(/^cat-/, ""));
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
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem("arc-onboarding-seen", "1");
    setShowOnboarding(false);
  };

  const totalItems = CARTE.reduce((sum, cat) => sum + cat.items.length, 0);
  const activeFilterMeta = FILTERS.find((f) => f.key === activeFilter);

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
            <div className="flex items-center gap-2">
              <LoyaltyPill
                loyalty={loyalty}
                onClick={() => setLoyaltyOpen(true)}
              />
              <button
                onClick={() => setFiltersOpen(true)}
                className={`relative inline-flex items-center gap-1.5 px-3 h-11 rounded-full text-xs font-semibold border transition active:scale-95 ${
                  activeFilter !== "all"
                    ? "bg-brown text-cream border-brown"
                    : "bg-white-warm text-brown-light border-terracotta/20"
                }`}
                aria-label="Ouvrir les filtres"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h18M6 12h12M10 20h4"
                  />
                </svg>
                <span>
                  {activeFilter === "all"
                    ? "Filtres"
                    : `${activeFilterMeta?.icon ?? ""} ${activeFilterMeta?.label ?? "Filtres"}`}
                </span>
                {activeFilter !== "all" && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gold border-2 border-cream" />
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <label className="relative block">
            <span className="sr-only">Rechercher un plat</span>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-light/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
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
        </div>

        {/* Category tabs — sticky under header */}
        <nav
          className="overflow-x-auto scrollbar-hide border-t border-terracotta/10"
          aria-label="Catégories"
        >
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
              className="mb-8 scroll-mt-40"
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
                    onClick={() => setSelectedItem(item)}
                    onAdd={() => addToCart(item, category.id)}
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

      {/* ═══ BOTTOM BAR — Cart + Waiter ═══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-brown text-cream border-t border-gold/20 shadow-2xl"
        aria-label="Actions"
      >
        <div className="flex items-stretch justify-between gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gold text-brown font-bold text-sm active:scale-[0.98] transition-transform shadow-md shadow-black/10"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>Mon panier</span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-red text-white-warm text-[11px] font-black tabular-nums"
                aria-label={`${cartCount} articles`}
              >
                {cartCount}
              </motion.span>
            )}
          </button>
          <button
            onClick={() => setCallWaiterOpen(true)}
            className="flex-shrink-0 flex items-center justify-center gap-2 h-14 px-4 rounded-2xl bg-brown-light/20 text-cream border border-gold/20 font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <svg
              className="w-5 h-5 text-gold-light"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a7 7 0 10-14 0v3.2a2 2 0 01-.6 1.4L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="hidden xs:inline">Serveur</span>
            <span className="xs:hidden">🙋</span>
          </button>
        </div>
      </nav>

      {/* ═══ DETAIL MODAL ═══ */}
      <AnimatePresence>
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAdd={() => {
              /* Find the category to infer station. */
              const cat = CARTE.find((c) =>
                c.items.some((i) => i.id === selectedItem.id)
              );
              if (cat) addToCart(selectedItem, cat.id);
              setSelectedItem(null);
              /* Quick micro-reassurance: open the cart briefly. */
              setCartOpen(true);
            }}
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

      {/* ═══ FILTERS BOTTOM SHEET ═══ */}
      <AnimatePresence>
        {filtersOpen && (
          <BottomSheetFilters
            activeFilter={activeFilter}
            onChange={(f) => {
              setActiveFilter(f);
              setFiltersOpen(false);
            }}
            onClose={() => setFiltersOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ CART DRAWER ═══ */}
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            lines={cart || []}
            subtotal={cartSubtotal}
            tax={cartTax}
            total={cartTotal}
            tableNumber={tableNumber}
            flashLineId={flashLineId}
            submitState={submitState}
            onClose={() => {
              setCartOpen(false);
              /* Reset error state when the user dismisses. */
              if (submitState.kind === "error") {
                setSubmitState({ kind: "idle" });
              }
            }}
            onInc={(id) => {
              const line = (cart || []).find((l) => l.line_id === id);
              if (line) setLineQuantity(id, line.quantity + 1);
            }}
            onDec={(id) => {
              const line = (cart || []).find((l) => l.line_id === id);
              if (line) setLineQuantity(id, line.quantity - 1);
            }}
            onRemove={removeLine}
            onSubmit={submitCart}
          />
        )}
      </AnimatePresence>

      {/* ═══ ONBOARDING ═══ */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding
            onDismiss={dismissOnboarding}
            totalItems={totalItems}
            tableNumber={tableNumber}
          />
        )}
      </AnimatePresence>

      {/* ═══ TABLE PROMPT ═══ */}
      <AnimatePresence>
        {tablePromptOpen && (
          <TablePrompt onSave={saveTable} onSkip={skipTable} />
        )}
      </AnimatePresence>

      {/* ═══ LOYALTY SHEET ═══ */}
      <AnimatePresence>
        {loyaltyOpen && (
          <LoyaltySheet
            loyalty={loyalty}
            onClose={() => setLoyaltyOpen(false)}
            onEnrolled={(cardNumber) => {
              try {
                window.localStorage.setItem(LOYALTY_CARD_KEY, cardNumber);
              } catch {}
              refreshLoyalty();
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══ POST-ORDER LOYALTY INVITE ═══ */}
      <AnimatePresence>
        {loyaltyPostOrder && (
          <PostOrderLoyaltyInvite
            config={loyalty.kind === "anonymous" ? loyalty.config : null}
            onClose={() => setLoyaltyPostOrder(false)}
            onAccept={() => {
              setLoyaltyPostOrder(false);
              setLoyaltyOpen(true);
            }}
          />
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
  onClick,
  onAdd,
}: {
  item: MenuItem;
  onClick: () => void;
  onAdd: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className="relative flex gap-3 bg-white-warm rounded-2xl p-3 pb-12 shadow-sm shadow-brown/5 active:scale-[0.99] transition-transform cursor-pointer overflow-hidden"
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

      {/* Add button — pinned to bottom-right, doesn't fight the card's tap-to-open. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-gold text-brown text-xs font-bold shadow-md shadow-gold/20 active:scale-95 transition-transform hover:bg-gold/90"
        aria-label={`Ajouter ${item.name} au panier`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Ajouter</span>
      </button>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL — Fullscreen bottom sheet
   ═══════════════════════════════════════════════════════════ */
function DetailModal({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: () => void;
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
              <strong className="text-brown">Allergènes :</strong> demandez la
              liste complète à votre serveur. Nous cuisinons dans un
              environnement où gluten, lactose, œufs et fruits à coque peuvent
              être présents.
            </p>
          </div>
        </div>

        {/* Fixed action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-cream/95 backdrop-blur-lg border-t border-terracotta/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
          <button
            onClick={share}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-white-warm border-2 border-terracotta/20 text-brown-light flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Partager"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            onClick={onAdd}
            className="flex-1 bg-gold hover:bg-gold/90 text-brown font-bold py-3 rounded-full transition-colors active:scale-[0.98] inline-flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Ajouter au panier
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOTTOM SHEET FILTERS
   ═══════════════════════════════════════════════════════════ */
function BottomSheetFilters({
  activeFilter,
  onChange,
  onClose,
}: {
  activeFilter: DietaryTag | "all";
  onChange: (f: DietaryTag | "all") => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
        aria-label="Filtres"
      >
        <div className="w-10 h-1 rounded-full bg-brown/20 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
            Filtrer la carte
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white-warm text-brown-light flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => onChange(f.key)}
                className={`flex items-center gap-2.5 p-4 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${
                  active
                    ? "bg-brown text-cream border-brown shadow-lg shadow-brown/20"
                    : "bg-white-warm text-brown border-terracotta/20 hover:border-gold"
                }`}
              >
                <span className="text-2xl">{f.icon}</span>
                <span>{f.label}</span>
                {active && <span className="ml-auto text-gold-light">✓</span>}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-brown-light/70 text-center pt-2">
          Les filtres sont cumulables avec la recherche.
        </p>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CART DRAWER
   ═══════════════════════════════════════════════════════════ */
function CartDrawer({
  lines,
  subtotal,
  tax,
  total,
  tableNumber,
  flashLineId,
  submitState,
  onClose,
  onInc,
  onDec,
  onRemove,
  onSubmit,
}: {
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  tableNumber?: string;
  flashLineId: string | null;
  submitState: SubmitState;
  onClose: () => void;
  onInc: (line_id: string) => void;
  onDec: (line_id: string) => void;
  onRemove: (line_id: string) => void;
  onSubmit: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const sending = submitState.kind === "sending";
  const success = submitState.kind === "success";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={sending ? undefined : onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Votre panier"
      >
        {/* Drag handle */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-brown/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gold font-bold">
              Votre panier
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
              {lines.length === 0
                ? "Panier vide"
                : `${lines.length} ${lines.length > 1 ? "plats" : "plat"}`}
              {tableNumber && !success && (
                <span className="text-sm font-normal text-brown-light ml-2">
                  · Table #{tableNumber}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="w-9 h-9 rounded-full bg-white-warm text-brown-light flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {success ? (
            <SuccessState tableNumber={tableNumber} />
          ) : lines.length === 0 ? (
            <EmptyState onClose={onClose} />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <CartRow
                    key={line.line_id}
                    line={line}
                    flashing={flashLineId === line.line_id}
                    disabled={sending}
                    onInc={() => onInc(line.line_id)}
                    onDec={() => onDec(line.line_id)}
                    onRemove={() => onRemove(line.line_id)}
                    reduced={!!prefersReducedMotion}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {submitState.kind === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-red/10 border border-red/30 text-sm text-red"
            >
              {submitState.message}
            </motion.div>
          )}
        </div>

        {/* Footer — totals + CTA (hidden on success/empty) */}
        {!success && lines.length > 0 && (
          <div className="border-t border-terracotta/15 bg-white-warm px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-brown-light">Sous-total</span>
              <span className="tabular-nums text-brown">
                {formatCents(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brown-light">TVA 10&nbsp;%</span>
              <span className="tabular-nums text-brown">{formatCents(tax)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-terracotta/20">
              <span className="text-base font-bold text-brown">Total</span>
              <span className="font-[family-name:var(--font-display)] text-2xl font-black text-brown tabular-nums">
                {formatCents(total)}
              </span>
            </div>

            <button
              onClick={onSubmit}
              disabled={sending || !tableNumber}
              className="w-full h-14 rounded-2xl bg-red text-white-warm font-bold text-base tracking-wide shadow-lg shadow-red/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <motion.span
                    animate={
                      prefersReducedMotion ? undefined : { rotate: 360 }
                    }
                    transition={{
                      repeat: Infinity,
                      ease: "linear",
                      duration: 0.9,
                    }}
                    className="inline-block w-4 h-4 border-2 border-white-warm/40 border-t-white-warm rounded-full"
                  />
                  Envoi en cours…
                </>
              ) : !tableNumber ? (
                "Indiquez votre numéro de table"
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12l5 5L20 7"
                    />
                  </svg>
                  Envoyer ma commande
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-brown-light/70 leading-relaxed">
              Votre serveur validera la commande avant qu&apos;elle parte en
              cuisine.
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}

function CartRow({
  line,
  flashing,
  disabled,
  onInc,
  onDec,
  onRemove,
  reduced,
}: {
  line: CartLine;
  flashing: boolean;
  disabled: boolean;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  reduced: boolean;
}) {
  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: flashing
          ? "rgba(184, 146, 47, 0.18)"
          : "rgba(255, 251, 245, 1)",
      }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40, height: 0 }}
      transition={{ duration: 0.22 }}
      className="bg-white-warm border border-terracotta/15 rounded-2xl p-3 relative overflow-hidden"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-[family-name:var(--font-display)] font-bold text-brown truncate">
              {line.menu_item_name}
            </p>
            <p className="text-sm font-bold text-brown tabular-nums whitespace-nowrap">
              {formatCents(line.price_cents * line.quantity)}
            </p>
          </div>
          <p className="text-[11px] text-brown-light/70 tabular-nums mt-0.5">
            {formatCents(line.price_cents)} / unité
          </p>
          {line.modifiers && line.modifiers.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {line.modifiers.map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-gold/15 text-gold"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-cream border border-terracotta/15 rounded-full">
          <button
            onClick={onDec}
            disabled={disabled}
            aria-label="Réduire la quantité"
            className="w-9 h-9 rounded-full hover:bg-brown/10 text-brown active:scale-90 transition disabled:opacity-40"
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-bold tabular-nums text-brown">
            {line.quantity}
          </span>
          <button
            onClick={onInc}
            disabled={disabled || line.quantity >= 20}
            aria-label="Augmenter la quantité"
            className="w-9 h-9 rounded-full hover:bg-brown/10 text-brown active:scale-90 transition disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Retirer ${line.menu_item_name} du panier`}
          className="ml-auto w-9 h-9 rounded-full text-brown-light hover:text-red hover:bg-red/10 active:scale-90 transition disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 mx-auto"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M9 7V4h6v3M6 7l1.4 13a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L18 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </motion.li>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-10 text-center"
    >
      <div className="mx-auto w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-gold"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-1">
        Votre panier est vide
      </p>
      <p className="text-sm text-brown-light leading-relaxed mb-6 max-w-xs mx-auto">
        Parcourez la carte et appuyez sur <strong>« Ajouter »</strong> sur les
        plats qui vous tentent.
      </p>
      <button
        onClick={onClose}
        className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-brown text-cream text-sm font-bold active:scale-95 transition-transform"
      >
        Voir la carte
      </button>
    </motion.div>
  );
}

function SuccessState({ tableNumber }: { tableNumber?: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-12 text-center"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
        className="mx-auto w-24 h-24 rounded-full bg-gold flex items-center justify-center mb-5 shadow-xl shadow-gold/30"
      >
        <svg
          className="w-12 h-12 text-brown"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12l5 5L20 7"
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-2"
      >
        Commande envoyée !
      </motion.p>
      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-brown-light text-sm leading-relaxed max-w-xs mx-auto"
      >
        {tableNumber
          ? `Votre serveur va valider votre commande pour la table #${tableNumber} dans un instant.`
          : "Votre serveur va valider votre commande dans un instant."}
      </motion.p>
    </motion.div>
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

    /* Fire-and-forget POST. We show confirmation regardless. */
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
            Table{" "}
            <span className="font-bold text-gold-light">#{tableNumber}</span>
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-cream/80 text-sm leading-relaxed mb-10"
        >
          Découvrez <strong className="text-gold-light">{totalItems} plats</strong>,
          commandez directement depuis votre téléphone, appelez le serveur en
          un clic.
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
            Indispensable pour passer commande depuis votre téléphone. Vous
            pouvez ignorer si vous consultez seulement la carte.
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
            Continuer sans numéro de table
          </button>
        </form>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOYALTY — Pill + Sheet (enrollment + card display)
   ═══════════════════════════════════════════════════════════ */

function LoyaltyPill({
  loyalty,
  onClick,
}: {
  loyalty: LoyaltyState;
  onClick: () => void;
}) {
  if (loyalty.kind === "disabled" || loyalty.kind === "loading") return null;

  if (loyalty.kind === "enrolled") {
    const required = loyalty.config.stamps_required;
    const current = loyalty.card.current_stamps;
    const ready = current >= required;
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "relative inline-flex items-center gap-1.5 px-3 h-11 rounded-full text-xs font-bold border transition active:scale-95",
          ready
            ? "bg-gold text-brown border-gold shadow shadow-gold/30"
            : "bg-brown text-gold-light border-brown",
        ].join(" ")}
        aria-label={`Ma carte fidélité · ${current} sur ${required} tampons`}
      >
        <span aria-hidden>{ready ? "🎁" : "⭐"}</span>
        <span className="tabular-nums">
          {current}
          <span className="opacity-60">/</span>
          {required}
        </span>
        {ready && (
          <motion.span
            aria-hidden
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full ring-2 ring-gold/50 pointer-events-none"
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 px-3 h-11 rounded-full text-xs font-bold bg-white-warm text-brown border border-terracotta/30 hover:border-gold transition active:scale-95"
      aria-label="Rejoindre le programme fidélité"
    >
      <span aria-hidden className="text-sm">
        ⭐
      </span>
      <span>Fidélité</span>
    </button>
  );
}

function LoyaltySheet({
  loyalty,
  onClose,
  onEnrolled,
}: {
  loyalty: LoyaltyState;
  onClose: () => void;
  onEnrolled: (cardNumber: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [enrollState, setEnrollState] = useState<EnrollState>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (enrollState.kind === "sending") return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setEnrollState({ kind: "error", message: "Merci d'indiquer votre nom" });
      return;
    }
    if (!/^[+]?[\d\s().-]{6,20}$/.test(trimmedPhone)) {
      setEnrollState({
        kind: "error",
        message: "Numéro de téléphone invalide",
      });
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEnrollState({ kind: "error", message: "Email invalide" });
      return;
    }

    setEnrollState({ kind: "sending" });
    try {
      const res = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: trimmedName,
          customer_phone: trimmedPhone,
          customer_email: trimmedEmail || undefined,
        }),
      });
      const data = (await res.json()) as {
        card_number?: string;
        error?: string;
      };
      if (!res.ok || !data.card_number) {
        setEnrollState({
          kind: "error",
          message: data.error || "Inscription impossible.",
        });
        return;
      }
      setEnrollState({ kind: "success", cardNumber: data.card_number });
      onEnrolled(data.card_number);
    } catch {
      setEnrollState({
        kind: "error",
        message: "Connexion interrompue.",
      });
    }
  }

  const isEnrolled = loyalty.kind === "enrolled";
  const config =
    loyalty.kind === "enrolled"
      ? loyalty.config
      : loyalty.kind === "anonymous"
        ? loyalty.config
        : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream shadow-2xl"
        role="dialog"
        aria-modal
        aria-label="Programme fidélité"
      >
        <div className="sticky top-0 bg-cream/95 backdrop-blur pt-3 pb-2 px-5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-brown/20" aria-hidden />
        </div>

        <div className="px-5 pb-10">
          {/* ── Card visual (enrolled) ─────────────── */}
          {isEnrolled && loyalty.kind === "enrolled" && (
            <EnrolledCard
              card={loyalty.card}
              config={loyalty.config}
            />
          )}

          {/* ── Enrollment form (anonymous) ──────────── */}
          {!isEnrolled && enrollState.kind !== "success" && (
            <>
              <div className="pt-1 text-center">
                <p className="text-[11px] uppercase tracking-widest text-gold font-bold mb-1">
                  Programme fidélité
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-1">
                  Rejoignez le cercle
                </h2>
                {config?.welcome_message && (
                  <p className="text-sm text-brown-light/90 leading-snug px-4">
                    {config.welcome_message}
                  </p>
                )}
              </div>

              {config && (
                <div className="mt-5 mx-auto max-w-md rounded-2xl bg-white-warm border border-terracotta/20 px-5 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-brown-light/70 font-bold">
                    Récompense
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mt-0.5">
                    {config.reward_label}
                  </p>
                  <p className="text-[13px] text-brown-light/90 mt-1">
                    {config.reward_description}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-brown-light font-semibold">
                    <span
                      className="inline-flex items-center gap-0.5 text-base"
                      aria-hidden
                    >
                      {Array.from({ length: config.stamps_required }).map(
                        (_, i) => (
                          <span key={i}>⭐</span>
                        )
                      )}
                    </span>
                    <span>
                      soit {config.stamps_required} passages = 1 récompense
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-3 max-w-md mx-auto">
                <label className="block">
                  <span className="sr-only">Nom</span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    maxLength={60}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Téléphone</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email (optionnel)"
                    className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>

                {enrollState.kind === "error" && (
                  <p className="text-xs text-red bg-red/10 px-3 py-2 rounded-lg text-center">
                    {enrollState.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enrollState.kind === "sending"}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brown hover:bg-brown-light text-cream font-bold py-3.5 rounded-full transition-all shadow-lg shadow-brown/20 active:scale-[0.98] disabled:opacity-60"
                >
                  {enrollState.kind === "sending" ? (
                    <>Inscription en cours…</>
                  ) : (
                    <>
                      <span aria-hidden>⭐</span>
                      <span>Créer ma carte fidélité</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-brown-light/70 text-center pt-1">
                  En rejoignant, vous acceptez qu&apos;on mémorise votre nom et
                  téléphone pour gérer vos tampons. Rien d&apos;autre.
                </p>
              </form>
            </>
          )}

          {/* ── Success state (just enrolled) ──────────── */}
          {enrollState.kind === "success" && (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 220 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold flex items-center justify-center text-3xl"
                aria-hidden
              >
                ⭐
              </motion.div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
                Bienvenue !
              </h2>
              <p className="text-sm text-brown-light mt-1">
                Votre carte est prête. N° <strong>{enrollState.cardNumber}</strong>.
              </p>
              <Link
                href={`/fidelite/carte/${enrollState.cardNumber}`}
                className="inline-block mt-5 bg-gold hover:bg-gold/90 text-brown font-bold px-6 py-3 rounded-full text-sm transition active:scale-95"
              >
                Voir ma carte
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="block mx-auto mt-3 text-xs text-brown-light hover:text-brown"
              >
                Continuer la commande
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function EnrolledCard({
  card,
  config,
}: {
  card: LoyaltyCard;
  config: LoyaltyConfig;
}) {
  const ready = card.current_stamps >= config.stamps_required;
  return (
    <div className="pt-1">
      <p className="text-[11px] uppercase tracking-widest text-gold font-bold text-center">
        Ma carte fidélité
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown text-center">
        N° {card.card_number}
      </h2>

      <div
        className="mt-4 rounded-3xl p-6 shadow-xl relative overflow-hidden"
        style={{
          backgroundColor: config.brand_color || "#2C1810",
          color: "#FDF8F0",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: config.accent_color || "#B8922F" }}
        />
        <div className="relative">
          <p
            className="text-[10px] uppercase tracking-widest font-bold opacity-80"
            style={{ color: config.accent_color }}
          >
            Progression
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold mt-0.5 tabular-nums">
            {card.current_stamps}
            <span className="opacity-60 text-xl"> / {config.stamps_required}</span>
          </p>

          <div
            className="mt-4 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(config.stamps_required, 10)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: config.stamps_required }).map((_, i) => {
              const filled = i < card.current_stamps;
              return (
                <span
                  key={i}
                  className={[
                    "aspect-square rounded-full flex items-center justify-center text-[11px] font-black border-2 transition",
                    filled
                      ? "bg-gold text-brown"
                      : "border-cream/30 text-cream/40",
                  ].join(" ")}
                  style={filled ? {} : { borderColor: "rgba(253,248,240,0.3)" }}
                  aria-hidden
                >
                  {filled ? "★" : ""}
                </span>
              );
            })}
          </div>

          {ready ? (
            <div
              className="mt-5 px-4 py-3 rounded-xl font-bold text-sm"
              style={{
                backgroundColor: config.accent_color,
                color: config.brand_color,
              }}
            >
              🎁 {config.reward_label} — prête à réclamer à l&apos;équipe.
            </div>
          ) : (
            <p className="mt-5 text-sm opacity-90 leading-snug">
              Plus que{" "}
              <span className="font-bold">
                {config.stamps_required - card.current_stamps}
              </span>{" "}
              tampon{config.stamps_required - card.current_stamps > 1 ? "s" : ""}{" "}
              avant {config.reward_label}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href={`/fidelite/carte/${card.card_number}`}
          className="flex-1 text-center bg-brown hover:bg-brown-light text-cream font-bold py-3 rounded-full text-sm transition active:scale-95"
        >
          Voir ma carte complète
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-brown-light/70 text-center">
        Présentez ce numéro au serveur à chaque visite pour obtenir un tampon.
      </p>
    </div>
  );
}

function PostOrderLoyaltyInvite({
  config,
  onClose,
  onAccept,
}: {
  config: LoyaltyConfig | null;
  onClose: () => void;
  onAccept: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="fixed inset-x-4 bottom-6 z-50 rounded-3xl bg-white-warm p-6 shadow-2xl"
        role="dialog"
        aria-modal
        aria-label="Invitation fidélité"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-2xl flex-shrink-0">
            ⭐
          </div>
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight">
              Un tampon offert en bonus ?
            </h3>
            <p className="text-xs text-brown-light/90 mt-1 leading-snug">
              Votre commande est envoyée en cuisine. Rejoignez notre programme
              fidélité maintenant —{" "}
              {config
                ? `${config.stamps_required} passages = ${config.reward_label}.`
                : "en 30 secondes, sans application."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-xs font-semibold text-brown-light hover:text-brown py-3 rounded-full transition"
          >
            Non merci
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-[2] inline-flex items-center justify-center gap-1.5 bg-brown hover:bg-brown-light text-cream text-sm font-bold py-3 rounded-full transition active:scale-95"
          >
            <span aria-hidden>⭐</span>
            <span>Rejoindre</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
