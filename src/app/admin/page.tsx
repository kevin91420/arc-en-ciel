"use client";

/**
 * Admin dashboard. Polls /api/stats every 15s (quiet refresh — doesn't reset
 * animations on re-fetch). "Mark resolved" calls PATCH /api/waiter/[id].
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardStats } from "@/lib/db/types";
import { formatCents, formatFrenchDateTime, relativeFr } from "./_lib/format";
import StaffStatsWidget from "@/components/StaffStatsWidget";
import PendingClosureBanner from "./_components/PendingClosureBanner";
import LowStockBanner from "./_components/LowStockBanner";

const REFRESH_MS = 15_000;

export default function AdminHomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardStats = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  async function resolveCall(id: string) {
    setResolving((s) => new Set(s).add(id));
    try {
      await fetch(`/api/waiter/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      await load();
    } finally {
      setResolving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  if (firstLoad) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="bg-red/5 border border-red/20 text-red-dark rounded-lg p-6 max-w-lg">
        <p className="font-semibold">Impossible de charger le tableau de bord</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 bg-red text-cream rounded text-sm font-semibold hover:bg-red-dark"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const pendingCalls = stats.recent_calls.filter((c) => c.status === "pending");

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
          Vue d&apos;ensemble
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
          Aujourd&apos;hui au restaurant
        </h1>
      </div>

      {/* Banner clôture en attente (Sprint 7b QW#10) */}
      <PendingClosureBanner />

      {/* Banner stock bas (Sprint 7b QW#12) */}
      <LowStockBanner />

      {/* Live staff performance — picks up from /api/admin/z-report. */}
      <StaffStatsWidget />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Résas aujourd'hui"
          value={stats.today.reservations}
          accent="brown"
          index={0}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="Couverts aujourd'hui"
          value={stats.today.guests}
          accent="gold"
          index={1}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M7 3v8a3 3 0 003 3v7M13 3l-.5 5a2.5 2.5 0 002.5 2.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="Demandes en attente"
          value={stats.today.pending_calls}
          accent={stats.today.pending_calls > 0 ? "red" : "terracotta"}
          pulse={stats.today.pending_calls > 0}
          index={2}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M12 3a7 7 0 017 7v3l1.5 3h-17L5 13v-3a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 19a3 3 0 006 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="Nouveaux clients (7j)"
          value={stats.week.new_customers}
          accent="terracotta"
          index={3}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming reservations */}
        <Panel
          title="Prochaines réservations"
          subtitle={`${stats.upcoming_reservations.length} à venir`}
          action={
            <Link
              href="/admin/reservations"
              className="text-xs font-semibold text-gold hover:text-brown transition underline underline-offset-4"
            >
              Toutes →
            </Link>
          }
          className="lg:col-span-2"
        >
          {stats.upcoming_reservations.length === 0 ? (
            <EmptyState label="Aucune réservation à venir." />
          ) : (
            <ul className="divide-y divide-terracotta/30">
              {stats.upcoming_reservations.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="py-3 flex items-start gap-3"
                >
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-xl font-[family-name:var(--font-display)] text-brown font-semibold leading-none">
                      {r.time}
                    </p>
                    <p className="text-[10px] tracking-wider uppercase text-brown-light mt-1">
                      {r.guests} pers.
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brown truncate">
                      {r.customer_name}
                    </p>
                    <p className="text-xs text-brown-light truncate">
                      {formatFrenchDateTime(r.date, r.time)} · {r.customer_phone}
                    </p>
                    {r.special_occasion && (
                      <span className="inline-block mt-1 text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-gold/15 text-gold font-semibold">
                        {r.special_occasion}
                      </span>
                    )}
                  </div>
                  <StatusPill status={r.status} />
                </motion.li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Pending waiter calls */}
        <Panel
          title="Demandes serveur"
          subtitle={pendingCalls.length > 0 ? `${pendingCalls.length} en attente` : "Tout est calme"}
          action={
            <Link
              href="/admin/demandes"
              className="text-xs font-semibold text-gold hover:text-brown transition underline underline-offset-4"
            >
              Voir →
            </Link>
          }
        >
          {pendingCalls.length === 0 ? (
            <EmptyState label="Aucune demande." />
          ) : (
            <ul className="space-y-3">
              {pendingCalls.map((c, i) => {
                const urgent = new Date(c.created_at).getTime() < Date.now() - 3 * 60_000;
                const isResolving = resolving.has(c.id);
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={[
                      "border rounded-lg p-3 flex items-center gap-3",
                      urgent
                        ? "bg-red/5 border-red/30"
                        : "bg-cream border-terracotta/40",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-12 h-12 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-bold shrink-0",
                        urgent ? "bg-red text-cream" : "bg-brown text-gold-light",
                      ].join(" ")}
                    >
                      {c.table_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brown truncate">
                        {c.request_type}
                      </p>
                      <p className={urgent ? "text-xs text-red font-semibold" : "text-xs text-brown-light"}>
                        {relativeFr(c.created_at)}
                        {urgent && " · Urgent"}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveCall(c.id)}
                      disabled={isResolving}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded bg-brown text-cream hover:bg-brown-light disabled:opacity-50 transition"
                    >
                      {isResolving ? "…" : "Résolu"}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Top customers */}
      <Panel title="Top clients" subtitle="Les plus fidèles">
        {stats.top_customers.length === 0 ? (
          <EmptyState label="Pas encore de données clients." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.top_customers.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-cream rounded-lg border border-terracotta/40 p-3 relative overflow-hidden"
              >
                {c.vip && (
                  <span className="absolute top-2 right-2 text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-gold text-brown font-bold">
                    VIP
                  </span>
                )}
                <p className="font-semibold text-brown text-sm truncate pr-8">
                  {c.name}
                </p>
                <p className="text-xs text-brown-light mt-0.5">
                  {c.visits_count} visite{c.visits_count > 1 ? "s" : ""}
                </p>
                <p className="text-sm font-[family-name:var(--font-display)] text-gold font-semibold mt-2">
                  {formatCents(c.total_spent_cents)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ─── sub-components ──────────────────────────── */

function KpiCard({
  label,
  value,
  icon,
  accent,
  pulse,
  index,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: "brown" | "gold" | "red" | "terracotta";
  pulse?: boolean;
  index: number;
}) {
  const accentMap: Record<string, string> = {
    brown: "from-brown to-brown-light text-cream",
    gold: "from-gold to-gold-light text-brown",
    red: "from-red to-red-dark text-cream",
    terracotta: "from-terracotta-deep to-terracotta text-brown",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${accentMap[accent]} p-4 md:p-5 shadow-sm`}
    >
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cream opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cream" />
        </span>
      )}
      <div className="flex items-center gap-2 opacity-80">
        {icon}
        <p className="text-[10px] md:text-xs tracking-[0.15em] uppercase font-semibold">
          {label}
        </p>
      </div>
      <p className="mt-3 text-3xl md:text-4xl font-[family-name:var(--font-display)] font-semibold leading-none">
        {value}
      </p>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white-warm rounded-xl border border-terracotta/30 p-5 md:p-6 ${className ?? ""}`}
    >
      <header className="flex items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-lg md:text-xl font-semibold text-brown">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-brown-light mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-brown-light/70 italic">
      {label}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "bg-gold/15", fg: "text-gold", label: "En attente" },
    confirmed: { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Confirmée" },
    cancelled: { bg: "bg-red/10", fg: "text-red", label: "Annulée" },
    completed: { bg: "bg-brown/10", fg: "text-brown", label: "Terminée" },
    no_show: { bg: "bg-neutral-200", fg: "text-neutral-600", label: "No-show" },
  };
  const s = map[status] ?? { bg: "bg-neutral-100", fg: "text-neutral-700", label: status };
  return (
    <span className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl animate-pulse">
      <div>
        <div className="h-3 w-32 bg-terracotta/40 rounded" />
        <div className="h-8 w-72 bg-terracotta/30 rounded mt-3" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white-warm border border-terracotta/30 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-white-warm border border-terracotta/30 rounded-xl" />
        <div className="h-64 bg-white-warm border border-terracotta/30 rounded-xl" />
      </div>
    </div>
  );
}
