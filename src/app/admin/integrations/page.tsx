"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  animate as animateValue,
} from "framer-motion";
import {
  ALL_PLATFORMS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  getReplacedPlatforms,
  getConnectedPlatforms,
  type Platform,
  type PlatformCategory,
} from "@/data/platforms";

/* ═══════════════════════════════════════════════════════════
   /admin/integrations — Command Center des plateformes
   ───────────────────────────────────────────────────────────
   3 tabs:
     1. OUTILS REMPLACÉS  → checklist, calcul d'économies live
     2. PLATEFORMES CONNECTÉES  → webhook setup + setup hints
     3. VUE D'ENSEMBLE  → avant/après + ROI pack

   Le token webhook + la section test cURL + le tutoriel Zapier
   sont conservés dans le tab "Connectées".
   ═══════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────── */

const GOURMET_PACK_PRICE_EUR = 4990; /* One-shot investment (pack price) */
const LOCAL_STORAGE_KEY = "gourmet-replaced";

type TabId = "replaced" | "connected" | "overview";

type TokenInfo = {
  configured: boolean;
  token: string | null;
  webhook_url?: string;
  hint?: string;
};

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   localStorage-backed store for the "replaced" selection.
   Using useSyncExternalStore avoids hydration mismatches and
   sidesteps the React 19 lint rule against setState-in-effect.
   ───────────────────────────────────────────────────────────── */

type StorageListener = () => void;
const storageListeners = new Set<StorageListener>();

function subscribeStorage(cb: StorageListener): () => void {
  storageListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    storageListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function writeRaw(arr: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(arr));
  } catch {}
  storageListeners.forEach((l) => l());
}

function useReplacedIds(): [Set<string>, (ids: Set<string>) => void] {
  const raw = useSyncExternalStore(
    subscribeStorage,
    readRaw,
    () => "[]" /* SSR snapshot */
  );
  const ids = useMemo<Set<string>>(() => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {}
    return new Set();
  }, [raw]);

  const setIds = (next: Set<string>) => {
    const arr = [...next];
    writeRaw(arr);
    /* Fire-and-forget server persistence — localStorage is the source of truth. */
    fetch("/api/admin/replaced-tools", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_ids: arr }),
    }).catch(() => {});
  };

  return [ids, setIds];
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("replaced");
  const [replacedIds, setReplacedIds] = useReplacedIds();
  const reduced = useReducedMotion();

  /* On mount: try to refresh from the server (if anything was stored there). */
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/replaced-tools", {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (
          d?.platform_ids &&
          Array.isArray(d.platform_ids) &&
          d.platform_ids.length
        ) {
          writeRaw(
            (d.platform_ids as unknown[]).filter(
              (x): x is string => typeof x === "string"
            )
          );
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  /* Selected cost — excluding commission (commissions are variable, not
     a fixed subscription saving). */
  const monthlySaving = useMemo(() => {
    let total = 0;
    for (const p of ALL_PLATFORMS) {
      if (replacedIds.has(p.id)) total += p.monthly_cost_eur;
    }
    return total;
  }, [replacedIds]);

  const toggle = (id: string) => {
    const next = new Set(replacedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setReplacedIds(next);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── Header ────────────────────────────────────────── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl leading-none mb-1">
          Command Center
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-brown mb-2">
          Plateformes & Intégrations
        </h1>
        <p className="text-brown-light/80 max-w-2xl text-sm md:text-base">
          Ce que votre pack <strong className="text-brown">remplace</strong>,
          ce qu&apos;il <strong className="text-brown">connecte</strong>, et
          combien vous économisez chaque mois.
        </p>
      </motion.div>

      {/* ─── Savings banner (visible sur replaced & overview) ─ */}
      <AnimatePresence initial={false}>
        {(activeTab === "replaced" || activeTab === "overview") && (
          <motion.div
            key="savings-banner"
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <SavingsBanner
              monthly={monthlySaving}
              count={replacedIds.size}
              reduced={!!reduced}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tabs nav (sticky) ──────────────────────────────── */}
      <div className="sticky top-[56px] md:top-[64px] z-10 -mx-4 md:-mx-8 mb-8 bg-cream-dark/40 backdrop-blur-md">
        <div className="px-4 md:px-8 pt-4 pb-3 border-b border-terracotta/25">
          <nav
            role="tablist"
            aria-label="Sections"
            className="flex gap-1 overflow-x-auto scrollbar-none"
          >
            <TabBtn
              id="replaced"
              activeTab={activeTab}
              onClick={() => setActiveTab("replaced")}
              badge={replacedIds.size || undefined}
            >
              <span aria-hidden>💰</span> Outils remplacés
            </TabBtn>
            <TabBtn
              id="connected"
              activeTab={activeTab}
              onClick={() => setActiveTab("connected")}
            >
              <span aria-hidden>🔌</span> Plateformes connectées
            </TabBtn>
            <TabBtn
              id="overview"
              activeTab={activeTab}
              onClick={() => setActiveTab("overview")}
            >
              <span aria-hidden>📊</span> Vue d&apos;ensemble
            </TabBtn>
          </nav>
        </div>
      </div>

      {/* ─── Panels ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "replaced" && (
          <motion.section
            key="replaced"
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <ReplacedPanel
              selected={replacedIds}
              onToggle={toggle}
              reduced={!!reduced}
            />
          </motion.section>
        )}

        {activeTab === "connected" && (
          <motion.section
            key="connected"
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <ConnectedPanel reduced={!!reduced} />
          </motion.section>
        )}

        {activeTab === "overview" && (
          <motion.section
            key="overview"
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <OverviewPanel
              selected={replacedIds}
              monthlySaving={monthlySaving}
              reduced={!!reduced}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tabs button
   ═══════════════════════════════════════════════════════════ */

function TabBtn({
  id,
  activeTab,
  onClick,
  badge,
  children,
}: {
  id: TabId;
  activeTab: TabId;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  const active = activeTab === id;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "text-brown bg-white-warm"
          : "text-brown-light/70 hover:text-brown hover:bg-white-warm/50",
      ].join(" ")}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={[
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
            active ? "bg-gold text-brown" : "bg-brown-light/20 text-brown",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute left-2 right-2 -bottom-[1px] h-[2px] bg-gold rounded-full"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Savings banner — sticky savings counter
   ═══════════════════════════════════════════════════════════ */

function SavingsBanner({
  monthly,
  count,
  reduced,
}: {
  monthly: number;
  count: number;
  reduced: boolean;
}) {
  const yearly = monthly * 12;
  const amortizationMonths = monthly > 0 ? GOURMET_PACK_PRICE_EUR / monthly : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brown via-brown to-[#1a0f09] text-cream p-6 md:p-8 mb-8 shadow-xl border border-gold/30">
      {/* Decorative gold rings */}
      <div
        aria-hidden
        className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-red/10 blur-3xl"
      />

      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 md:gap-8 items-center">
        {/* Monthly savings — the hero */}
        <div className="md:border-r md:border-cream/10 md:pr-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-gold-light/80">
              Économies mensuelles
            </span>
          </div>
          <div className="flex items-baseline gap-2 font-[family-name:var(--font-display)]">
            <CountUp
              value={monthly}
              reduced={reduced}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gold leading-none tabular-nums"
            />
            <span className="text-base md:text-lg text-gold-light/80 font-normal">
              €/mois
            </span>
          </div>
          <p className="text-xs text-cream/60 mt-1.5">
            {count === 0
              ? "Cochez vos abonnements actuels pour voir le calcul"
              : `Sur ${count} outil${count > 1 ? "s" : ""} remplacé${count > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="hidden md:block text-cream/20 text-2xl select-none">
          →
        </div>

        {/* Yearly */}
        <div className="md:border-r md:border-cream/10 md:pr-6">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-gold-light/80 block mb-1">
            Sur 12 mois
          </span>
          <div className="flex items-baseline gap-2">
            <CountUp
              value={yearly}
              reduced={reduced}
              className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-cream tabular-nums"
            />
            <span className="text-sm text-cream/70">€/an</span>
          </div>
        </div>

        <div className="hidden md:block text-cream/20 text-2xl select-none">
          ·
        </div>

        {/* Amortization */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-gold-light/80 block mb-1">
            Amortissement pack
          </span>
          {monthly > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-cream tabular-nums">
                {amortizationMonths.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="text-sm text-cream/70">mois</span>
            </div>
          ) : (
            <span className="text-sm text-cream/50 italic">En attente…</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CountUp — smooth count animation for savings
   ═══════════════════════════════════════════════════════════ */

function CountUp({
  value,
  reduced,
  className = "",
}: {
  value: number;
  reduced: boolean;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("fr-FR"));
  const prevValue = useRef(value);

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      prevValue.current = value;
      return;
    }
    const controls = animateValue(mv, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });
    prevValue.current = value;
    return controls.stop;
  }, [value, reduced, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

/* ═══════════════════════════════════════════════════════════
   TAB 1 — Replaced
   ═══════════════════════════════════════════════════════════ */

function ReplacedPanel({
  selected,
  onToggle,
  reduced,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  reduced: boolean;
}) {
  const replaced = useMemo(() => getReplacedPlatforms(), []);
  const grouped = useMemo(() => {
    const map = new Map<PlatformCategory, Platform[]>();
    for (const p of replaced) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return [...map.entries()];
  }, [replaced]);

  return (
    <div>
      {/* Intro */}
      <div className="mb-8 p-5 md:p-6 rounded-2xl bg-white-warm border border-terracotta/20">
        <p className="text-sm md:text-base text-brown leading-relaxed">
          <strong className="text-brown">
            Cochez les outils que vous payez aujourd&apos;hui.
          </strong>
          <br />
          <span className="text-brown-light/80">
            Votre pack GOURMET les remplace tous — vous coupez les abonnements
            le mois prochain. Le compteur d&apos;économies en haut se met à
            jour en temps réel.
          </span>
        </p>
      </div>

      <div className="space-y-8">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <h2 className="flex items-center gap-2 mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-brown">
              <span aria-hidden className="text-xl">
                {CATEGORY_ICONS[category]}
              </span>
              {CATEGORY_LABELS[category]}
              <span className="text-xs font-normal text-brown-light/60 ml-1">
                ({items.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((p, i) => (
                <PlatformCard
                  key={p.id}
                  platform={p}
                  selected={selected.has(p.id)}
                  onToggle={() => onToggle(p.id)}
                  index={i}
                  reduced={reduced}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  selected,
  onToggle,
  index,
  reduced,
}: {
  platform: Platform;
  selected: boolean;
  onToggle: () => void;
  index: number;
  reduced: boolean;
}) {
  return (
    <motion.label
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      whileHover={reduced ? undefined : { y: -2 }}
      className={[
        "group relative block cursor-pointer select-none p-4 rounded-2xl border-2 transition-colors",
        selected
          ? "bg-gradient-to-br from-gold/15 to-gold/5 border-gold shadow-[0_6px_20px_-8px_rgba(184,146,47,0.45)]"
          : "bg-white-warm border-terracotta/15 hover:border-gold/40",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="sr-only"
        aria-label={`Je paye actuellement ${platform.name}`}
      />

      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <BrandBadge platform={platform} />
        <div className="flex-1 min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown leading-tight truncate">
            {platform.name}
          </h3>
          <p className="text-xs text-brown-light/70 line-clamp-2 mt-0.5">
            {platform.description}
          </p>
        </div>

        {/* Checkbox visual */}
        <div
          className={[
            "shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
            selected
              ? "bg-gold border-gold"
              : "bg-white border-brown-light/30 group-hover:border-gold/60",
          ].join(" ")}
          aria-hidden
        >
          {selected && (
            <motion.svg
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              viewBox="0 0 24 24"
              className="w-4 h-4 text-brown"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </div>
      </div>

      {/* Cost + replaced_by */}
      <div className="flex flex-wrap items-center gap-1.5">
        {platform.monthly_cost_eur > 0 ? (
          <span className="text-[11px] font-bold tabular-nums bg-red/10 text-red px-2 py-1 rounded-md">
            ≈ {platform.monthly_cost_eur.toLocaleString("fr-FR")} €/mois
          </span>
        ) : platform.commission_percent ? (
          <span className="text-[11px] font-bold bg-red/10 text-red px-2 py-1 rounded-md">
            {platform.commission_percent}% de commission
          </span>
        ) : (
          <span className="text-[11px] font-semibold bg-brown-light/10 text-brown-light px-2 py-1 rounded-md">
            Gratuit
          </span>
        )}

        {platform.replaced_by && (
          <span className="text-[11px] font-semibold text-gold-dark bg-gold/15 px-2 py-1 rounded-md">
            → {platform.replaced_by}
          </span>
        )}
      </div>

      {/* Footer link */}
      {platform.website && (
        <a
          href={platform.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-brown-light/60 hover:text-red mt-3"
        >
          Voir le site
          <svg
            viewBox="0 0 24 24"
            className="w-2.5 h-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M7 17L17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
    </motion.label>
  );
}

function BrandBadge({ platform }: { platform: Platform }) {
  if (platform.brand_color) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0"
        style={{
          backgroundColor: platform.brand_color,
          color: isLight(platform.brand_color) ? "#2C1810" : "#FDF8F0",
        }}
      >
        <span aria-hidden>{platform.icon}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-brown/10 flex items-center justify-center text-lg shrink-0">
      <span aria-hidden>{platform.icon}</span>
    </div>
  );
}

/* Quick luminance check so text on a brand-colored tile stays readable. */
function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.6;
}

/* ═══════════════════════════════════════════════════════════
   TAB 2 — Connected
   ═══════════════════════════════════════════════════════════ */

function ConnectedPanel({ reduced }: { reduced: boolean }) {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [revealToken, setRevealToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/webhook-token", { credentials: "include" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ configured: false, token: null }));
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const connected = useMemo(() => getConnectedPlatforms(), []);

  if (!info) {
    return (
      <div className="flex items-center justify-center h-40 text-brown-light">
        Chargement…
      </div>
    );
  }

  const baseUrl = info.webhook_url || "https://arc-en-ciel-theta.vercel.app";
  const webhookUrl = `${baseUrl}/api/reservations/webhook`;
  const token = info.token || "<WEBHOOK_SECRET non configuré>";

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="p-5 md:p-6 rounded-2xl bg-white-warm border border-terracotta/20">
        <p className="text-sm md:text-base text-brown leading-relaxed">
          <strong>Ces plateformes continuent d&apos;exister</strong>, mais
          leurs réservations arrivent <em>automatiquement</em> dans votre CRM
          unifié via webhook. Plus de copier-coller, plus de Post-it.
        </p>
      </div>

      {/* ─── Credentials block ───────────────────────────────── */}
      {!info.configured && (
        <div className="p-4 rounded-xl border border-yellow-400/40 bg-yellow-50/40">
          <p className="text-sm text-brown font-semibold mb-1">
            ⚠️ Webhook non configuré
          </p>
          <p className="text-xs text-brown-light/80">
            Ajoutez{" "}
            <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded">
              WEBHOOK_SECRET
            </code>{" "}
            dans Vercel → Settings → Environment Variables, puis redéployez.
          </p>
        </div>
      )}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="p-6 rounded-2xl bg-brown text-cream relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gold/10 blur-3xl pointer-events-none"
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span aria-hidden>🔐</span>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Vos identifiants webhook
            </h2>
          </div>

          {/* URL */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-widest text-gold-light font-bold block mb-1.5">
              URL du Webhook
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-black/30 px-3 py-2.5 rounded-lg break-all">
                {webhookUrl}
              </code>
              <button
                onClick={() => copy(webhookUrl, "url")}
                className="text-xs bg-gold hover:bg-gold/90 text-brown font-bold px-3 py-2.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
              >
                {copied === "url" ? "✓ Copié" : "Copier"}
              </button>
            </div>
          </div>

          {/* Token */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gold-light font-bold block mb-1.5">
              Token d&apos;authentification
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-black/30 px-3 py-2.5 rounded-lg break-all">
                {info.configured
                  ? revealToken
                    ? token
                    : "•".repeat(40)
                  : token}
              </code>
              {info.configured && (
                <button
                  onClick={() => setRevealToken(!revealToken)}
                  className="text-xs bg-cream/10 hover:bg-cream/20 border border-cream/30 text-cream font-semibold px-3 py-2.5 rounded-lg active:scale-95 transition-transform"
                >
                  {revealToken ? "Masquer" : "Voir"}
                </button>
              )}
              {info.configured && (
                <button
                  onClick={() => copy(token, "token")}
                  className="text-xs bg-gold hover:bg-gold/90 text-brown font-bold px-3 py-2.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
                >
                  {copied === "token" ? "✓ Copié" : "Copier"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-cream/60 mt-2">
              Ajoutez le token dans l&apos;en-tête{" "}
              <code className="font-mono bg-cream/10 px-1 py-0.5 rounded">
                Authorization: Bearer &lt;token&gt;
              </code>{" "}
              de chaque appel. Ne le partagez jamais publiquement.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick test cURL ─────────────────────────────────── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.05 }}
        className="p-6 rounded-2xl bg-white-warm border border-terracotta/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <span aria-hidden>🧪</span>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
            Test rapide (cURL)
          </h2>
        </div>
        <p className="text-brown-light/80 text-sm mb-3">
          Lancez cette commande dans un terminal pour tester votre webhook :
        </p>
        <pre className="bg-brown text-gold-light font-mono text-xs p-4 rounded-lg overflow-x-auto">
          {`curl -X POST ${webhookUrl} \\
  -H "Authorization: Bearer ${info.configured ? (revealToken ? token : "VOTRE_TOKEN") : "VOTRE_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "thefork",
    "external_id": "TEST-001",
    "customer_name": "Test TheFork",
    "customer_phone": "0612345678",
    "date": "2026-05-01",
    "time": "20:00",
    "guests": 4
  }'`}
        </pre>
        <p className="text-[11px] text-brown-light/60 mt-2">
          Si succès → la résa apparaît instantanément dans{" "}
          <a
            href="/admin/reservations"
            className="text-red font-semibold hover:underline"
          >
            /admin/reservations
          </a>
        </p>
      </motion.div>

      {/* ─── Platforms list ──────────────────────────────────── */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-4">
          Plateformes connectables
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connected.map((p, i) => (
            <ConnectedCard
              key={p.id}
              platform={p}
              index={i}
              reduced={reduced}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              webhookUrl={webhookUrl}
              token={token}
              tokenConfigured={info.configured}
              revealToken={revealToken}
              onCopy={copy}
              copied={copied}
            />
          ))}
        </div>
      </div>

      {/* ─── Zapier tutorial (conservé) ──────────────────────── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-[#FF4A00]/10 to-transparent border border-[#FF4A00]/30"
      >
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden>⚡</span>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
            Setup via Zapier (recommandé)
          </h3>
        </div>
        <ol className="list-decimal list-inside text-sm text-brown-light/80 space-y-1.5 ml-1">
          <li>
            Créez un compte sur{" "}
            <a
              href="https://zapier.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red font-semibold hover:underline"
            >
              zapier.com
            </a>{" "}
            (gratuit jusqu&apos;à 100 tâches/mois)
          </li>
          <li>
            <strong>Trigger</strong> : choisissez votre plateforme (TheFork,
            Gmail, etc.) et l&apos;évènement « New reservation »
          </li>
          <li>
            <strong>Action</strong> : « Webhooks by Zapier » → POST
          </li>
          <li>
            <strong>URL</strong> : collez{" "}
            <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
              {webhookUrl}
            </code>
          </li>
          <li>
            <strong>Headers</strong> : ajoutez{" "}
            <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
              Authorization: Bearer &lt;votre token&gt;
            </code>
          </li>
          <li>
            <strong>Body</strong> : utilisez le payload JSON de la plateforme
            ci-dessus
          </li>
          <li>Testez, puis activez le Zap 🎉</li>
        </ol>
      </motion.div>
    </div>
  );
}

function ConnectedCard({
  platform,
  index,
  reduced,
  open,
  onToggle,
  webhookUrl,
  token,
  tokenConfigured,
  revealToken,
  onCopy,
  copied,
}: {
  platform: Platform;
  index: number;
  reduced: boolean;
  open: boolean;
  onToggle: () => void;
  webhookUrl: string;
  token: string;
  tokenConfigured: boolean;
  revealToken: boolean;
  onCopy: (text: string, key: string) => void;
  copied: string | null;
}) {
  /* For demo we keep the status "à connecter" by default — a real
     implementation would query reservations.source to mark as connected. */
  const status: "connected" | "pending" = "pending";

  const samplePayload = {
    source: platform.id,
    external_id: `${platform.id.toUpperCase()}-{{id}}`,
    customer_name: "{{name}}",
    customer_phone: "{{phone}}",
    date: "{{date}}",
    time: "{{time}}",
    guests: "{{party_size}}",
  };

  const tokenDisplay = tokenConfigured
    ? revealToken
      ? token
      : "VOTRE_TOKEN"
    : "VOTRE_TOKEN";

  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="rounded-2xl bg-white-warm border border-terracotta/15 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <BrandBadge platform={platform} />
          <div className="flex-1 min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight">
              {platform.name}
            </h3>
            <p className="text-xs text-brown-light/70 line-clamp-2 mt-0.5">
              {platform.description}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {platform.commission_percent ? (
            <span className="text-[11px] font-bold bg-red/10 text-red px-2 py-1 rounded-md">
              {platform.commission_percent}% commission
            </span>
          ) : null}
          {platform.monthly_cost_eur > 0 ? (
            <span className="text-[11px] font-semibold bg-brown-light/10 text-brown-light px-2 py-1 rounded-md">
              ≈ {platform.monthly_cost_eur.toLocaleString("fr-FR")} €/mois
            </span>
          ) : null}
          {platform.website && (
            <a
              href={platform.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-brown-light/70 hover:text-red ml-auto"
            >
              Voir le site ↗
            </a>
          )}
        </div>

        <button
          onClick={onToggle}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-red hover:text-red-dark transition-colors py-2"
        >
          <span>Voir les instructions de connexion</span>
          <motion.svg
            animate={reduced ? undefined : { rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-terracotta/15 bg-cream/50"
          >
            <div className="p-5 space-y-4">
              {platform.setup_hint && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brown-light mb-1.5">
                    Méthode recommandée
                  </p>
                  <p className="text-sm text-brown leading-relaxed">
                    {platform.setup_hint}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-brown-light mb-1.5">
                  Exemple cURL
                </p>
                <pre className="bg-brown text-gold-light font-mono text-[11px] p-3 rounded-lg overflow-x-auto">
                  {curlExample}
                </pre>
                <button
                  onClick={() => onCopy(curlExample, `curl-${platform.id}`)}
                  className="mt-2 text-[11px] font-semibold text-red hover:text-red-dark"
                >
                  {copied === `curl-${platform.id}`
                    ? "✓ Copié"
                    : "Copier la commande"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function StatusPill({ status }: { status: "connected" | "pending" }) {
  if (status === "connected") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-700 px-2 py-1 rounded-md whitespace-nowrap">
        ✅ Connectée
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider bg-brown/10 text-brown-light px-2 py-1 rounded-md whitespace-nowrap">
      ⚙️ À connecter
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3 — Overview
   ═══════════════════════════════════════════════════════════ */

function OverviewPanel({
  selected,
  monthlySaving,
  reduced,
}: {
  selected: Set<string>;
  monthlySaving: number;
  reduced: boolean;
}) {
  const selectedPlatforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => selected.has(p.id)),
    [selected]
  );

  const maxCost = Math.max(1, ...selectedPlatforms.map((p) => p.monthly_cost_eur));
  const amortizationMonths = monthlySaving > 0 ? GOURMET_PACK_PRICE_EUR / monthlySaving : 0;

  if (selectedPlatforms.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-terracotta/40 bg-white-warm/40 p-10 text-center">
        <div className="text-5xl mb-3" aria-hidden>
          📊
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-2">
          Vue d&apos;ensemble indisponible
        </h2>
        <p className="text-sm text-brown-light/80 max-w-md mx-auto">
          Commencez par cocher vos outils payants dans l&apos;onglet{" "}
          <strong className="text-brown">Outils remplacés</strong> pour voir la
          comparaison avant / après.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Before / After big banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-white-warm border-2 border-red/30 relative overflow-hidden">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-red block mb-2">
            Avant GOURMET PACK
          </span>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-brown tabular-nums">
              {selectedPlatforms.length}
            </span>
            <span className="text-sm text-brown-light">
              outil{selectedPlatforms.length > 1 ? "s" : ""} payant
              {selectedPlatforms.length > 1 ? "s" : ""} cumulé
              {selectedPlatforms.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-brown-light/80">
            Facturation multiple, logins séparés, données éparpillées.
          </p>
        </div>
        <div className="p-6 rounded-3xl bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold relative overflow-hidden">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-gold-dark block mb-2">
            Après GOURMET PACK
          </span>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-brown tabular-nums">
              1
            </span>
            <span className="text-sm text-brown-light">
              seul outil — votre pack
            </span>
          </div>
          <p className="text-sm text-brown-light/80">
            Un dashboard, un login, un interlocuteur, toutes vos données
            unifiées.
          </p>
        </div>
      </div>

      {/* ROI hero */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-brown via-brown to-[#1a0f09] text-cream overflow-hidden text-center"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(184,146,47,0.25),transparent_60%)] pointer-events-none"
        />
        <p className="relative text-[10px] uppercase tracking-[0.3em] font-bold text-gold-light mb-3">
          ROI du pack
        </p>
        <div className="relative flex items-baseline justify-center gap-3 flex-wrap">
          <span className="font-[family-name:var(--font-display)] text-sm text-cream/70">
            Amorti en
          </span>
          <CountUp
            value={amortizationMonths}
            reduced={reduced}
            className="font-[family-name:var(--font-display)] text-6xl md:text-8xl font-bold text-gold leading-none tabular-nums"
          />
          <span className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-cream/90">
            mois
          </span>
        </div>
        <p className="relative text-sm text-cream/70 mt-4">
          Pack à{" "}
          <strong className="text-cream">
            {GOURMET_PACK_PRICE_EUR.toLocaleString("fr-FR")} €
          </strong>{" "}
          · Économies :{" "}
          <strong className="text-gold">
            {monthlySaving.toLocaleString("fr-FR")} €/mois
          </strong>
        </p>
      </motion.div>

      {/* Horizontal bar chart */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-1">
          Détail de vos abonnements actuels
        </h2>
        <p className="text-sm text-brown-light/70 mb-5">
          Chaque barre = le coût mensuel que vous allez arrêter de payer.
        </p>

        <div className="space-y-2.5">
          {selectedPlatforms
            .slice()
            .sort((a, b) => b.monthly_cost_eur - a.monthly_cost_eur)
            .map((p, i) => (
              <BarRow
                key={p.id}
                platform={p}
                maxCost={maxCost}
                index={i}
                reduced={reduced}
              />
            ))}
          <div className="h-[1px] bg-terracotta/20 my-3" />
          <div className="flex items-center justify-between font-[family-name:var(--font-display)] pt-2">
            <span className="text-lg font-bold text-brown">Total mensuel</span>
            <span className="text-2xl font-bold text-red tabular-nums">
              {monthlySaving.toLocaleString("fr-FR")} €
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({
  platform,
  maxCost,
  index,
  reduced,
}: {
  platform: Platform;
  maxCost: number;
  index: number;
  reduced: boolean;
}) {
  const pct =
    platform.monthly_cost_eur > 0
      ? Math.max(6, (platform.monthly_cost_eur / maxCost) * 100)
      : 2;

  return (
    <div className="grid grid-cols-[minmax(120px,180px)_1fr_auto] items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base" aria-hidden>
          {platform.icon}
        </span>
        <span className="text-sm font-semibold text-brown truncate">
          {platform.name}
        </span>
      </div>
      <div className="h-8 bg-terracotta/10 rounded-lg overflow-hidden relative">
        <motion.div
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: 0.7,
            delay: Math.min(index * 0.05, 0.4),
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full rounded-lg bg-gradient-to-r from-red/90 via-red to-terracotta"
          style={
            platform.brand_color
              ? {
                  background: `linear-gradient(90deg, ${platform.brand_color} 0%, ${platform.brand_color}dd 100%)`,
                }
              : undefined
          }
        />
      </div>
      <span className="text-sm font-bold text-red tabular-nums whitespace-nowrap">
        {platform.monthly_cost_eur > 0
          ? `${platform.monthly_cost_eur.toLocaleString("fr-FR")} €`
          : "—"}
      </span>
    </div>
  );
}
