"use client";

/**
 * /admin/telephone/historique — Historique des appels téléphoniques.
 *
 * Sprint 7b QW#10. Affiche tous les appels enregistrés (humains + IA),
 * avec filtre par état (callbacks en attente, IA, humains), stats sur 30j,
 * et drill-down sur le transcript de chaque appel.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  PhoneCallOutcome,
  PhoneCallRow,
  PhoneCallStats,
} from "@/lib/db/phone-types";

const OUTCOME_META: Record<
  PhoneCallOutcome,
  { label: string; icon: string; tone: string }
> = {
  ai_answered: {
    label: "IA",
    icon: "🤖",
    tone: "bg-gold/15 text-brown",
  },
  staff_answered: {
    label: "Humain",
    icon: "👤",
    tone: "bg-green-100 text-green-800",
  },
  voicemail: {
    label: "Message",
    icon: "📝",
    tone: "bg-blue-100 text-blue-800",
  },
  no_answer: {
    label: "Manqué",
    icon: "📵",
    tone: "bg-amber-100 text-amber-900",
  },
  transferred_to_human: {
    label: "Transféré",
    icon: "🔄",
    tone: "bg-purple-100 text-purple-800",
  },
  unknown: { label: "—", icon: "?", tone: "bg-brown/10 text-brown-light" },
};

const INTENT_LABELS: Record<string, string> = {
  reservation: "📅 Réservation",
  hours: "🕐 Horaires",
  menu: "📖 Menu",
  address: "📍 Adresse",
  complaint: "🥲 Réclamation",
  callback: "📝 Rappel",
  other: "• Autre",
};

export default function PhoneHistoryPage() {
  const [calls, setCalls] = useState<PhoneCallRow[]>([]);
  const [stats, setStats] = useState<(PhoneCallStats & { days: number }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "ai" | "staff" | "callback_pending"
  >("all");
  const [selected, setSelected] = useState<PhoneCallRow | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [callsRes, statsRes] = await Promise.all([
        fetch("/api/admin/telephony/calls", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/telephony/stats?days=30", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!callsRes.ok) throw new Error("Erreur chargement appels");
      const c = (await callsRes.json()) as { calls: PhoneCallRow[] };
      const s = statsRes.ok
        ? ((await statsRes.json()) as PhoneCallStats & { days: number })
        : null;
      setCalls(c.calls);
      setStats(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "ai":
        return calls.filter((c) => c.outcome === "ai_answered");
      case "staff":
        return calls.filter((c) => c.outcome === "staff_answered");
      case "callback_pending":
        return calls.filter((c) => c.callback_requested);
      default:
        return calls;
    }
  }, [calls, filter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link
          href="/admin/telephone"
          className="inline-flex items-center gap-1.5 text-xs text-brown-light/70 hover:text-brown font-semibold mb-3 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour à la téléphonie
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Historique des appels
        </h1>
        <p className="text-brown-light/80">
          Tous les appels reçus, avec transcripts IA et stats sur 30 jours.
        </p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          <StatCard
            label="Total appels"
            value={String(stats.total_count)}
            sub={`${stats.days} derniers jours`}
            tone="brown"
            emphasis
          />
          <StatCard
            label="Pris par l'IA"
            value={String(stats.ai_answered_count)}
            sub={
              stats.total_count > 0
                ? `${Math.round((stats.ai_answered_count / stats.total_count) * 100)}%`
                : "—"
            }
            tone="gold"
          />
          <StatCard
            label="Pris humain"
            value={String(stats.staff_answered_count)}
            tone="green"
          />
          <StatCard
            label="Résa créées"
            value={String(stats.reservations_via_ai_count)}
            sub="par l'IA"
            tone="blue"
          />
          <StatCard
            label="Rappels en attente"
            value={String(stats.callback_pending_count)}
            tone={
              stats.callback_pending_count > 0 ? "amber" : "muted"
            }
            emphasis={stats.callback_pending_count > 0}
          />
        </motion.section>
      )}

      {/* Filters */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex items-center gap-1.5 flex-wrap"
      >
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Tous"
          count={calls.length}
        />
        <FilterPill
          active={filter === "ai"}
          onClick={() => setFilter("ai")}
          label="IA"
          icon="🤖"
          count={calls.filter((c) => c.outcome === "ai_answered").length}
        />
        <FilterPill
          active={filter === "staff"}
          onClick={() => setFilter("staff")}
          label="Humains"
          icon="👤"
          count={calls.filter((c) => c.outcome === "staff_answered").length}
        />
        <FilterPill
          active={filter === "callback_pending"}
          onClick={() => setFilter("callback_pending")}
          label="Rappels"
          icon="📝"
          count={calls.filter((c) => c.callback_requested).length}
        />
      </motion.section>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            📞
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            {filter === "all"
              ? "Aucun appel pour le moment. Une fois Vapi configuré, les appels apparaîtront ici en temps réel."
              : "Aucun appel correspondant à ce filtre."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <CallCard
              key={c.id}
              call={c}
              onClick={() => setSelected(c)}
            />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {selected && (
          <CallDetailModal
            call={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Call card
   ═══════════════════════════════════════════════════════════ */

function CallCard({
  call: c,
  onClick,
}: {
  call: PhoneCallRow;
  onClick: () => void;
}) {
  const meta = OUTCOME_META[c.outcome] ?? OUTCOME_META.unknown;
  const intent = c.detected_intent
    ? INTENT_LABELS[c.detected_intent] ?? c.detected_intent
    : null;
  const duration = c.duration_seconds
    ? formatDuration(c.duration_seconds)
    : "—";

  return (
    <motion.li layout>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-xl bg-white-warm border border-terracotta/20 p-4 hover:border-gold transition active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          {/* Outcome avatar */}
          <div
            className={[
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
              meta.tone,
            ].join(" ")}
          >
            {meta.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown leading-tight">
                {c.caller_name || c.caller_number || "Numéro masqué"}
              </h3>
              <span
                className={[
                  "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  meta.tone,
                ].join(" ")}
              >
                {meta.label}
              </span>
              {c.callback_requested && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  📞 À rappeler
                </span>
              )}
              {c.reservation_id && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  📅 Résa créée
                </span>
              )}
            </div>

            <p className="text-xs text-brown-light/80 mt-0.5">
              {new Date(c.started_at).toLocaleString("fr-FR")} · {duration}
              {intent && (
                <>
                  <span className="mx-1.5 text-brown-light/30">·</span>
                  {intent}
                </>
              )}
            </p>

            {c.transcript && (
              <p className="text-[11px] text-brown-light/70 italic mt-2 line-clamp-2">
                « {c.transcript.slice(0, 200)}
                {c.transcript.length > 200 ? "…" : ""} »
              </p>
            )}
          </div>

          {c.cost_cents != null && (
            <span className="text-[10px] text-brown-light/60 tabular-nums flex-shrink-0">
              {(c.cost_cents / 100).toFixed(2)}€
            </span>
          )}
        </div>
      </button>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card / Filter pill
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  sub,
  tone = "brown",
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "brown" | "gold" | "green" | "blue" | "amber" | "muted";
  emphasis?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    gold: "text-gold",
    green: "text-green-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    muted: "text-brown-light",
  };
  return (
    <div
      className={[
        "rounded-2xl bg-white-warm border p-4",
        emphasis ? "border-gold/40 bg-gold/5" : "border-terracotta/20",
      ].join(" ")}
    >
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold leading-none tabular-nums",
          emphasis ? "text-3xl" : "text-2xl",
          tones[tone],
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-2">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-brown-light/60 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95",
        active
          ? "bg-brown text-cream"
          : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
      ].join(" ")}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
      <span
        className={[
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
          active ? "bg-cream/20 text-cream" : "bg-cream text-brown-light",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Detail modal — transcript complet
   ═══════════════════════════════════════════════════════════ */

function CallDetailModal({
  call: c,
  onClose,
}: {
  call: PhoneCallRow;
  onClose: () => void;
}) {
  const meta = OUTCOME_META[c.outcome] ?? OUTCOME_META.unknown;
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
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-[calc(100vw-2rem)] sm:max-h-[90vh] z-50 flex"
        role="dialog"
        aria-modal
      >
        <div className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 h-full w-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-terracotta/20 flex-shrink-0 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                {c.caller_name || c.caller_number || "Appel anonyme"}
              </h2>
              <p className="text-xs text-brown-light/80 mt-0.5">
                {new Date(c.started_at).toLocaleString("fr-FR")} ·{" "}
                {c.duration_seconds
                  ? formatDuration(c.duration_seconds)
                  : "Durée inconnue"}
              </p>
              <span
                className={[
                  "inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  meta.tone,
                ].join(" ")}
              >
                <span aria-hidden>{meta.icon}</span>
                {meta.label}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-brown-light hover:text-brown w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Intent + résa link */}
            {c.detected_intent && (
              <div className="rounded-lg bg-cream p-3 text-sm flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
                  Intent détecté :
                </span>
                <span className="text-brown font-semibold">
                  {INTENT_LABELS[c.detected_intent] ?? c.detected_intent}
                </span>
              </div>
            )}

            {c.reservation_id && (
              <Link
                href="/admin/reservations"
                className="block rounded-lg bg-green-50 border border-green-300 p-3 text-sm hover:bg-green-100 transition"
              >
                <p className="font-bold text-green-800">
                  ✓ Réservation créée par l&apos;IA
                </p>
                <p className="text-xs text-green-800/80 mt-0.5">
                  Voir la résa →
                </p>
              </Link>
            )}

            {c.callback_requested && (
              <div className="rounded-lg bg-amber-50 border border-amber-300 p-3 text-sm">
                <p className="font-bold text-amber-900">📞 Rappel demandé</p>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  {c.callback_phone || "Numéro non capté"}
                </p>
                {c.callback_notes && (
                  <p className="text-xs text-amber-900/80 italic mt-1">
                    « {c.callback_notes} »
                  </p>
                )}
              </div>
            )}

            {/* Transcript */}
            {c.transcript ? (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                  Transcription
                </h3>
                <div className="rounded-lg bg-cream/50 border border-terracotta/15 p-4 text-sm text-brown leading-relaxed whitespace-pre-wrap">
                  {c.transcript}
                </div>
              </div>
            ) : (
              <p className="text-sm text-brown-light/70 italic text-center py-4">
                Pas de transcription disponible.
              </p>
            )}

            {/* Audio */}
            {c.audio_url && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                  Enregistrement
                </h3>
                <audio controls className="w-full">
                  <source src={c.audio_url} />
                </audio>
              </div>
            )}

            {/* Cost */}
            {c.cost_cents != null && (
              <p className="text-[11px] text-brown-light/60 italic text-right">
                Coût de l&apos;appel : {(c.cost_cents / 100).toFixed(2)}€
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m${s.toString().padStart(2, "0")}`;
}
