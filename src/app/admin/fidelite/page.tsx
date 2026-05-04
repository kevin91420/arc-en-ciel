"use client";

/**
 * /admin/fidelite — Dashboard fidélité
 * KPIs, table des cartes, top clients, drawer détail avec ajout tampon manuel.
 * Auto-refresh toutes les 15 s.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  LoyaltyCardFull,
  LoyaltyStats,
  LoyaltyTransaction,
} from "@/lib/db/loyalty-types";
import { formatFrenchDateTime, relativeFr } from "../_lib/format";

type Payload = { cards: LoyaltyCardFull[]; stats: LoyaltyStats };

export default function FidelitePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LoyaltyCardFull | null>(null);
  const [stampsRequired, setStampsRequired] = useState(5);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/loyalty", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload: Payload = await res.json();
      setData(payload);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Fetch config once to know stamps_required (for progress display) */
  useEffect(() => {
    fetch("/api/admin/loyalty/config", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c?.stamps_required) setStampsRequired(c.stamps_required);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const cards = useMemo(() => data?.cards ?? [], [data]);
  const stats = data?.stats;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      return (
        c.card_number.toLowerCase().includes(q) ||
        (c.customer_name || "").toLowerCase().includes(q) ||
        (c.customer_phone || "").toLowerCase().includes(q)
      );
    });
  }, [cards, query]);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* ─── Header ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Programme fidélité
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Fidélité
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {cards.length} cartes · {stats?.active_cards ?? 0} actives sur 90
            jours
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/fidelite/scanner"
            className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream font-semibold px-4 py-2.5 rounded-lg text-sm transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M14 14h3v3h-3zM20 14v3M14 20h7" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Scanner un QR
          </Link>
          <Link
            href="/admin/fidelite/anniversaires"
            className="inline-flex items-center gap-2 bg-gold/15 hover:bg-gold/25 border border-gold/40 text-brown font-semibold px-4 py-2.5 rounded-lg text-sm transition active:scale-95"
          >
            <span aria-hidden>🎂</span>
            Anniversaires du mois
          </Link>
          <Link
            href="/admin/fidelite/config"
            className="inline-flex items-center gap-2 bg-white-warm hover:bg-cream border border-terracotta/30 text-brown font-semibold px-4 py-2.5 rounded-lg text-sm transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            Configurer
          </Link>
        </div>
      </motion.div>

      {/* ─── KPIs ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Cartes actives"
          value={stats?.active_cards ?? 0}
          sub="90 derniers jours"
          delay={0}
          tone="gold"
        />
        <KpiCard
          label="Tampons donnés"
          value={stats?.total_stamps_given ?? 0}
          sub="depuis le lancement"
          delay={0.05}
          tone="brown"
        />
        <KpiCard
          label="Récompenses offertes"
          value={stats?.total_rewards_claimed ?? 0}
          sub="pizzas / réductions"
          delay={0.1}
          tone="red"
        />
        <KpiCard
          label="Moyenne tampons/carte"
          value={stats ? stats.avg_stamps_per_card.toFixed(1) : "0.0"}
          sub="fidélité moyenne"
          delay={0.15}
          tone="terracotta"
        />
      </div>

      {/* ─── Top customers ────────────────────── */}
      {stats && stats.top_customers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl bg-gradient-to-br from-brown to-[#3d2418] text-cream p-5 md:p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gold" aria-hidden>
              <path
                d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Top 5 clients fidèles
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stats.top_customers.map((t, i) => (
              <motion.li
                key={t.card_number}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="rounded-xl bg-black/25 p-3 border border-cream/10"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={[
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                      i === 0
                        ? "bg-gold text-brown"
                        : i === 1
                          ? "bg-cream/80 text-brown"
                          : i === 2
                            ? "bg-terracotta text-cream"
                            : "bg-cream/15 text-cream",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-[10px] text-gold-light">
                    {t.card_number}
                  </span>
                </div>
                <p className="text-sm font-semibold truncate">
                  {t.customer_name}
                </p>
                <p className="text-xs text-cream/70 mt-0.5">
                  {t.total_stamps} tampons cumulés
                </p>
              </motion.li>
            ))}
          </ol>
        </motion.section>
      )}

      {/* ─── Search ───────────────────────────── */}
      <div className="max-w-md">
        <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
          Rechercher
        </label>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Numéro de carte ou nom client"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-light/60"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ─── Cards list ───────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-brown-light">
          Chargement…
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red-dark text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={!!query} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl bg-white-warm border border-terracotta/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream/50 text-[10px] uppercase tracking-widest text-brown-light">
                <tr>
                  <th className="px-4 py-3 text-left">Carte</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Téléphone</th>
                  <th className="px-4 py-3 text-center">Progrès</th>
                  <th className="px-4 py-3 text-center">Total vie</th>
                  <th className="px-4 py-3 text-center">Récompenses</th>
                  <th className="px-4 py-3 text-right">Dernière visite</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => setSelected(c)}
                      className="border-t border-terracotta/10 hover:bg-gold/5 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-brown">
                          {c.card_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brown">
                        {c.customer_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-brown-light">
                        {c.customer_phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StampProgress
                          current={c.current_stamps}
                          required={stampsRequired}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-brown">
                        {c.total_stamps_earned}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.rewards_claimed > 0 ? (
                          <span className="inline-flex items-center gap-1 text-gold-dark font-semibold">
                            {c.rewards_claimed}
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-3.5 h-3.5"
                              aria-hidden
                            >
                              <path d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-brown-light/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-brown-light">
                        {c.last_stamp_at ? relativeFr(c.last_stamp_at) : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
                <motion.button
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => setSelected(c)}
                  className="w-full text-left rounded-2xl bg-white-warm border border-terracotta/20 p-4 active:scale-[0.99] transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-brown">
                        {c.card_number}
                      </p>
                      <p className="text-brown font-semibold mt-0.5">
                        {c.customer_name || "—"}
                      </p>
                      <p className="text-xs text-brown-light mt-0.5">
                        {c.customer_phone || "—"}
                      </p>
                    </div>
                    {c.rewards_claimed > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 bg-gold/15 text-gold-dark text-xs font-bold px-2 py-1 rounded-full">
                        {c.rewards_claimed}
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" aria-hidden>
                          <path d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <StampProgress
                    current={c.current_stamps}
                    required={stampsRequired}
                  />
                  <div className="mt-3 flex items-center justify-between text-xs text-brown-light">
                    <span>{c.total_stamps_earned} tampons cumulés</span>
                    <span>
                      {c.last_stamp_at ? relativeFr(c.last_stamp_at) : "jamais"}
                    </span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ─── Drawer ────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <CardDrawer
            card={selected}
            stampsRequired={stampsRequired}
            onClose={() => setSelected(null)}
            onStamped={() => {
              load();
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  delay,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  delay: number;
  tone: "gold" | "brown" | "red" | "terracotta";
}) {
  const toneMap = {
    gold: "border-gold/30 bg-gradient-to-br from-gold/10 to-transparent",
    brown: "border-brown/20 bg-gradient-to-br from-brown/5 to-transparent",
    red: "border-red/25 bg-gradient-to-br from-red/10 to-transparent",
    terracotta:
      "border-terracotta/30 bg-gradient-to-br from-terracotta/15 to-transparent",
  };
  const valueTone = {
    gold: "text-gold-dark",
    brown: "text-brown",
    red: "text-red-dark",
    terracotta: "text-brown",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-2xl border bg-white-warm p-4 md:p-5 ${toneMap[tone]}`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-semibold">
        {label}
      </p>
      <p
        className={`mt-2 font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold ${valueTone[tone]}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-brown-light/80">{sub}</p>
    </motion.div>
  );
}

function StampProgress({
  current,
  required,
}: {
  current: number;
  required: number;
}) {
  const pct = Math.min(100, Math.round((current / required) * 100));
  return (
    <div className="flex items-center gap-2 justify-center min-w-[120px]">
      <div className="flex-1 max-w-[120px] h-2 rounded-full bg-cream overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-gold to-gold-dark"
        />
      </div>
      <span className="text-[11px] font-mono font-semibold text-brown whitespace-nowrap">
        {current}/{required}
      </span>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-2xl bg-white-warm border border-dashed border-terracotta/30 p-10 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-gold/15 items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-gold" aria-hidden>
          <path
            d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-brown font-semibold">
        {hasQuery ? "Aucun résultat" : "Aucune carte pour l'instant"}
      </p>
      <p className="text-sm text-brown-light mt-1">
        {hasQuery
          ? "Essayez un autre numéro ou nom."
          : "Les clients s'inscrivent via le menu ou le QR fidélité."}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────
   Drawer
   ──────────────────────────────────────────── */

function CardDrawer({
  card,
  stampsRequired,
  onClose,
  onStamped,
}: {
  card: LoyaltyCardFull;
  stampsRequired: number;
  onClose: () => void;
  onStamped: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<LoyaltyCardFull | null>(null);

  /* Fetch transactions on open */
  useEffect(() => {
    fetch(`/api/loyalty/card/${encodeURIComponent(card.card_number)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.card) setDetail(d.card);
      })
      .catch(() => {});
  }, [card.card_number]);

  /* ESC closes */
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const transactions: LoyaltyTransaction[] = detail?.transactions || [];

  async function addStamp() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/loyalty/stamp", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: card.card_number,
          staff_member: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg(
        data.rewardEarned
          ? "Récompense débloquée !"
          : "Tampon ajouté avec succès"
      );
      setTimeout(() => onStamped(), 900);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-brown/60 backdrop-blur-sm z-40"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white-warm shadow-2xl flex flex-col"
      >
        <header className="p-5 border-b border-terracotta/20 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-gold font-bold tracking-wider">
              {card.card_number}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mt-0.5">
              {card.customer_name || "Client"}
            </h3>
            <p className="text-xs text-brown-light mt-1">
              Inscrit{" "}
              {new Date(card.enrolled_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stamp card preview */}
          <div className="rounded-2xl bg-gradient-to-br from-brown to-[#3d2418] text-cream p-5 shadow-lg">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold-light font-bold">
              Progression
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: stampsRequired }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={[
                    "aspect-square rounded-full flex items-center justify-center border-2 text-xs font-bold",
                    i < card.current_stamps
                      ? "bg-gold text-brown border-gold shadow-[0_0_12px_rgba(184,146,47,0.4)]"
                      : "bg-transparent text-cream/30 border-cream/20",
                  ].join(" ")}
                >
                  {i < card.current_stamps ? "★" : ""}
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs text-cream/70">
              {card.current_stamps} / {stampsRequired} tampons avant la
              prochaine récompense
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total vie" value={card.total_stamps_earned} />
            <MiniStat label="Récompenses" value={card.rewards_claimed} />
            <MiniStat
              label="Dernière"
              value={
                card.last_stamp_at
                  ? relativeFr(card.last_stamp_at)
                  : "jamais"
              }
              small
            />
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-cream/60 p-4 space-y-1 text-sm">
            <p className="text-[10px] uppercase tracking-widest text-brown-light font-semibold">
              Contact
            </p>
            <p className="text-brown">
              <span className="text-brown-light">Téléphone · </span>
              {card.customer_phone || "—"}
            </p>
            <p className="text-brown truncate">
              <span className="text-brown-light">Email · </span>
              {card.customer_email || "—"}
            </p>
          </div>

          {/* Transactions */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-brown-light font-semibold mb-2">
              Historique récent
            </p>
            {transactions.length === 0 ? (
              <p className="text-sm text-brown-light/70 italic">
                Aucune transaction enregistrée.
              </p>
            ) : (
              <ul className="space-y-2">
                {transactions.slice(0, 10).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 text-sm py-1.5"
                  >
                    <TxIcon type={t.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-brown font-medium">
                        {txLabel(t.type)}
                        {t.amount ? ` · +${t.amount}` : ""}
                      </p>
                      {t.note && (
                        <p className="text-xs text-brown-light truncate">
                          {t.note}
                        </p>
                      )}
                      <p className="text-[11px] text-brown-light/70 mt-0.5">
                        {formatFrenchDateTime(
                          t.created_at.slice(0, 10),
                          t.created_at.slice(11, 16)
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <footer className="p-4 border-t border-terracotta/20 bg-cream/40">
          {msg && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg"
            >
              {msg}
            </motion.p>
          )}
          {err && (
            <p className="mb-2 text-sm text-red-dark bg-red/10 border border-red/30 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}
          <button
            onClick={addStamp}
            disabled={busy}
            className="w-full bg-gold hover:bg-gold-dark text-brown font-bold py-3 rounded-lg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            {busy ? "Ajout en cours…" : "Ajouter un tampon manuellement"}
          </button>
        </footer>
      </motion.aside>
    </>
  );
}

function MiniStat({
  label,
  value,
  small,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl bg-cream/60 p-3 text-center">
      <p className="text-[9px] uppercase tracking-widest text-brown-light font-semibold">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] font-bold text-brown ${
          small ? "text-sm" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TxIcon({ type }: { type: LoyaltyTransaction["type"] }) {
  const common = "w-4 h-4";
  if (type === "stamp_earned")
    return (
      <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-gold/20 text-gold-dark flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z" />
        </svg>
      </span>
    );
  if (type === "reward_claimed")
    return (
      <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-red/15 text-red-dark flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M20 12v9H4v-9M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  if (type === "enrollment")
    return (
      <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-terracotta/25 text-brown flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  return (
    <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-brown/10 text-brown flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M12 8v4l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

function txLabel(type: LoyaltyTransaction["type"]): string {
  switch (type) {
    case "stamp_earned":
      return "Tampon gagné";
    case "reward_claimed":
      return "Récompense réclamée";
    case "stamp_adjusted":
      return "Ajustement manuel";
    case "enrollment":
      return "Inscription";
    default:
      return type;
  }
}
