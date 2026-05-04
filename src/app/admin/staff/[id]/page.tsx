"use client";

/**
 * /admin/staff/[id] — Détail d'un staff avec stats individuelles.
 *
 * Sprint 7b QW#11 — performance individuelle, gamification équipe.
 *
 * Demandé par retour terrain (boulangerie patronne d'Angelo) :
 * "Voir les prestations et CA, et NM clients total serveur mensuellement
 * et journalier de chaque serveur (certain resto font des challenges sur ça)".
 *
 * Sections :
 *   - Hero avec avatar + rôle + ancienneté
 *   - Sélecteur de période (jour / semaine / mois / année)
 *   - 6 stat cards (CA, commandes, couverts, panier moyen, pourboires, rang équipe)
 *   - Top 10 plats vendus par ce staff
 *   - Mini graph CA quotidien (si period = month)
 *   - Bouton "Modifier les infos" qui ouvre la modal d'édition
 */

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import { ROLE_META, type StaffRole } from "@/lib/auth/roles";
import type { StaffMember } from "@/lib/db/pos-types";
import type { StaffStatsPeriod, StaffStatsResult } from "@/lib/db/pos-client";

const PERIODS: { key: StaffStatsPeriod; label: string }[] = [
  { key: "day", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [stats, setStats] = useState<StaffStatsResult | null>(null);
  const [period, setPeriod] = useState<StaffStatsPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/staff/${id}/stats?period=${period}`,
        { credentials: "include", cache: "no-store" }
      );
      if (res.status === 404) {
        setError("Staff introuvable.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        staff: StaffMember;
        stats: StaffStatsResult;
      };
      setStaff(data.staff);
      setStats(data.stats);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !staff) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-brown-light">
        Chargement…
      </div>
    );
  }

  if (error && !staff) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-red-dark mb-4">{error}</p>
        <Link
          href="/admin/staff"
          className="text-brown font-semibold hover:text-gold"
        >
          ← Retour au personnel
        </Link>
      </div>
    );
  }

  if (!staff) return null;

  const role = (staff.role as StaffRole) ?? "server";
  const meta = ROLE_META[role];
  const initial = staff.name.charAt(0).toUpperCase();
  const hireDate = staff.created_at
    ? new Date(staff.created_at)
    : null;
  const monthsAgo = hireDate
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - hireDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        )
      )
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-1.5 text-xs text-brown-light/70 hover:text-brown font-semibold mb-4 transition"
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
          Retour au personnel
        </Link>
      </motion.div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white-warm border border-terracotta/20 rounded-2xl p-6 mb-6 flex items-start gap-5 flex-wrap"
      >
        {/* Avatar XL */}
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center font-[family-name:var(--font-display)] text-5xl font-bold text-cream flex-shrink-0 shadow-md"
          style={{ background: staff.color || "#B8922F" }}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-tight">
              {staff.name}
            </h1>
            <span
              className={[
                "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                meta.tone,
              ].join(" ")}
            >
              <span aria-hidden>{meta.icon}</span>
              {meta.label}
            </span>
            {!staff.active && (
              <span className="text-xs font-bold uppercase tracking-wider bg-brown-light/30 text-brown-light px-2 py-1 rounded-full">
                Inactif
              </span>
            )}
          </div>
          <p className="text-sm text-brown-light/80 mt-1">{meta.description}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-brown-light/80">
            <span className="font-mono">
              PIN&nbsp;:&nbsp;
              <span className="text-brown font-bold">{staff.pin_code}</span>
            </span>
            {hireDate && (
              <span>
                Embauché·e le{" "}
                {hireDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                ({monthsAgo} mois)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href={`/admin/staff?edit=${staff.id}`}
            className="h-10 px-4 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition active:scale-95 inline-flex items-center gap-2"
          >
            ✎ Modifier
          </Link>
        </div>
      </motion.section>

      {/* Period selector */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex items-center gap-2 flex-wrap"
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={[
              "h-10 px-4 rounded-full text-sm font-semibold transition active:scale-95",
              period === p.key
                ? "bg-brown text-cream shadow-md"
                : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
        {stats && (
          <span className="text-xs text-brown-light/70 ml-auto">
            {stats.period_label}
          </span>
        )}
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

      {!loading && stats && (
        <>
          {/* Empty state */}
          {stats.orders_count === 0 && (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30 mb-6">
              <div className="text-5xl mb-3" aria-hidden>
                🍽
              </div>
              <p className="text-brown-light max-w-md mx-auto px-4">
                Aucune commande sur cette période. Change de période ou
                attends qu&apos;il/elle prenne des commandes.
              </p>
            </div>
          )}

          {/* Stat cards */}
          {stats.orders_count > 0 && (
            <>
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6"
              >
                <StatCard
                  label="CA TTC"
                  value={formatCents(stats.revenue_ttc_cents)}
                  emphasis
                  tone="brown"
                />
                <StatCard
                  label="Commandes"
                  value={String(stats.orders_count)}
                />
                <StatCard
                  label="Couverts"
                  value={String(stats.guests_count)}
                />
                <StatCard
                  label="Panier moyen"
                  value={formatCents(stats.avg_ticket_cents)}
                />
                <StatCard
                  label="Par couvert"
                  value={formatCents(stats.avg_per_guest_cents)}
                />
                <StatCard
                  label="Pourboires"
                  value={
                    stats.tip_cents > 0
                      ? `${formatCents(stats.tip_cents)} (${stats.tip_pct.toFixed(1)}%)`
                      : "—"
                  }
                  tone="gold"
                />
              </motion.section>

              {/* Rank vs team */}
              {stats.rank_in_team !== null && stats.team_size > 1 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 rounded-2xl bg-gold/10 border border-gold/30 p-5 flex items-center gap-4"
                >
                  <div className="text-5xl flex-shrink-0" aria-hidden>
                    {stats.rank_in_team === 1
                      ? "🥇"
                      : stats.rank_in_team === 2
                        ? "🥈"
                        : stats.rank_in_team === 3
                          ? "🥉"
                          : "🏅"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                      Classement équipe ({stats.period_label})
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mt-0.5">
                      Rang {stats.rank_in_team}{" "}
                      <span className="text-brown-light/70 text-base font-normal">
                        / {stats.team_size}
                      </span>
                    </p>
                    <p className="text-xs text-brown-light/80 mt-1">
                      Moyenne équipe :{" "}
                      <strong className="tabular-nums text-brown">
                        {formatCents(stats.team_avg_revenue_cents)}
                      </strong>
                      {stats.revenue_ttc_cents >
                        stats.team_avg_revenue_cents && (
                        <span className="text-green-700 ml-2">
                          +
                          {formatCents(
                            stats.revenue_ttc_cents -
                              stats.team_avg_revenue_cents
                          )}{" "}
                          au-dessus 🚀
                        </span>
                      )}
                    </p>
                  </div>
                </motion.section>
              )}

              {/* Évolution journalière */}
              {stats.by_day.length > 1 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white-warm border border-terracotta/20 rounded-2xl p-5 mb-6"
                >
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
                    Évolution journalière
                  </h2>
                  <DayChart data={stats.by_day} />
                </motion.section>
              )}

              {/* Top items */}
              {stats.top_items.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white-warm border border-terracotta/20 rounded-2xl p-5"
                >
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
                    Top plats vendus
                  </h2>
                  <ul className="divide-y divide-terracotta/15">
                    {stats.top_items.map((item, i) => (
                      <li
                        key={item.menu_item_id}
                        className="py-2.5 flex items-baseline gap-3 text-sm"
                      >
                        <span className="w-6 text-center text-brown-light/60 font-bold tabular-nums flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-brown font-semibold truncate">
                          {item.menu_item_name}
                        </span>
                        <span className="text-brown-light tabular-nums text-xs">
                          ×{item.quantity}
                        </span>
                        <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums tracking-tight w-20 text-right">
                          {formatCents(item.revenue_cents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  emphasis,
  tone = "brown",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "brown" | "gold" | "green";
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    gold: "text-gold",
    green: "text-green-700",
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Day chart (mini bars)
   ═══════════════════════════════════════════════════════════ */

function DayChart({
  data,
}: {
  data: Array<{ date: string; orders: number; revenue_cents: number }>;
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue_cents), 1);

  return (
    <div>
      <div
        className="flex items-end gap-1 h-32 px-1"
        style={{ minWidth: `${data.length * 16}px` }}
      >
        {data.map((d) => {
          const pct = (d.revenue_cents / maxRevenue) * 100;
          return (
            <div
              key={d.date}
              className="flex-1 min-w-3 bg-gold/60 hover:bg-gold transition rounded-t-sm group relative"
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${d.date} — ${formatCents(d.revenue_cents)} · ${d.orders} cmd`}
            >
              <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-brown text-cream text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
                {formatCents(d.revenue_cents)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-brown-light/60 mt-2 px-1">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
