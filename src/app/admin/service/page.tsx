"use client";

/**
 * /admin/service — Live service dashboard for the manager.
 *
 * Shows:
 *   1. KPIs du jour (CA, couverts, ticket moyen, commandes payées, tables ouvertes)
 *   2. État temps réel (actives, en prépa, prêtes, oldest cooking)
 *   3. Top 5 plats du jour
 *   4. Commandes actives en direct
 *
 * Realtime via useRealtimeTable(["orders","order_items"]). Fallback poll 20s.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents, relativeFr } from "../_lib/format";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import type { OrderWithItems, ServiceStats } from "@/lib/db/pos-types";

const POLL_MS = 20_000;

type ServiceFeed = {
  stats: ServiceStats;
  activeOrders: OrderWithItems[];
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  open: { label: "Ouverte", tone: "bg-cream/60 text-brown" },
  fired: { label: "En cuisine", tone: "bg-gold/20 text-gold-dark" },
  ready: { label: "Prête", tone: "bg-green-100 text-green-700" },
  served: { label: "Servie", tone: "bg-terracotta/20 text-terracotta" },
  paid: { label: "Payée", tone: "bg-brown/10 text-brown/60" },
  cancelled: { label: "Annulée", tone: "bg-red/10 text-red-dark" },
};

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

export default function AdminServicePage() {
  const [feed, setFeed] = useState<ServiceFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/service-stats", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ServiceFeed = await res.json();
      setFeed(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  /* Tick for "il y a X min" labels. */
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { connected } = useRealtimeTable(
    useMemo(() => ["orders", "order_items"], []),
    load
  );

  if (firstLoad) return <ServiceSkeleton />;
  if (error && !feed) {
    return (
      <div className="bg-red/5 border border-red/20 text-red-dark rounded-lg p-6 max-w-lg">
        <p className="font-semibold">Impossible de charger le service</p>
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
  if (!feed) return null;

  const { stats, activeOrders } = feed;
  // Recompute minutes_since_fired using nowTick for live-feel.
  void nowTick;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
            Service en direct
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown">
            Service du jour
          </h1>
          <p className="text-brown-light/80 mt-1">
            Vue temps réel de la salle, de la cuisine et des encaissements.
          </p>
        </div>
        <div
          className={[
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] font-bold",
            connected
              ? "bg-green-100 text-green-700"
              : "bg-cream/30 text-brown/60",
          ].join(" ")}
          title={
            connected
              ? "Supabase Realtime connecté"
              : "Polling 20s (realtime déconnecté)"
          }
        >
          <span
            className={[
              "w-1.5 h-1.5 rounded-full",
              connected ? "bg-green-500 animate-pulse" : "bg-brown/40",
            ].join(" ")}
          />
          {connected ? "Live" : "Polling"}
        </div>
      </motion.div>

      {/* ═══ KPIs du jour ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>📈</span> KPIs du jour
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi
            label="Chiffre d'affaires"
            value={formatCents(stats.day.revenue_cents)}
            accent
          />
          <Kpi label="Couverts servis" value={String(stats.day.guests_count)} />
          <Kpi
            label="Ticket moyen"
            value={formatCents(stats.day.avg_ticket_cents)}
          />
          <Kpi
            label="Commandes payées"
            value={String(stats.day.orders_count)}
          />
          <Kpi label="Tables ouvertes" value={String(stats.day.open_tables)} />
        </div>
      </motion.section>

      {/* ═══ État temps réel ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> État temps réel
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LiveCard
            label="Commandes actives"
            value={stats.current.active_orders}
            icon="📋"
          />
          <LiveCard
            label="Plats en prépa"
            value={stats.current.items_cooking}
            icon="🔥"
            pulse="orange"
          />
          <LiveCard
            label="Plats prêts à servir"
            value={stats.current.items_ready}
            icon="✅"
            pulse="green"
          />
          <LiveCard
            label="Plus vieux en cuisine"
            value={`${stats.current.oldest_cooking_minutes} min`}
            icon="⏱"
            alert={stats.current.oldest_cooking_minutes > 15}
          />
        </div>
      </motion.section>

      {/* ═══ Two-column: Top items / Active orders ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Top items */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
            <span>🏆</span> Top 5 plats du jour
          </h2>
          <div className="rounded-2xl bg-white-warm border border-terracotta/20 overflow-hidden">
            {stats.top_items.length === 0 ? (
              <p className="p-6 text-brown-light/70 text-sm italic">
                Pas encore de plats aujourd&apos;hui.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-brown-light/60 border-b border-terracotta/15">
                    <th className="text-left px-4 py-2 font-bold">#</th>
                    <th className="text-left px-4 py-2 font-bold">Plat</th>
                    <th className="text-right px-4 py-2 font-bold">Qté</th>
                    <th className="text-right px-4 py-2 font-bold">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_items.map((it, i) => (
                    <tr
                      key={it.menu_item_name + i}
                      className="border-b border-terracotta/10 last:border-0 hover:bg-cream/30"
                    >
                      <td className="px-4 py-3 font-bold text-gold tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 text-brown font-semibold">
                        {it.menu_item_name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-brown-light">
                        {it.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-brown font-semibold">
                        {formatCents(it.revenue_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>

        {/* Active orders */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
            <span>🔔</span> Commandes actives · {activeOrders.length}
          </h2>
          <div className="rounded-2xl bg-white-warm border border-terracotta/20 overflow-hidden">
            {activeOrders.length === 0 ? (
              <p className="p-6 text-brown-light/70 text-sm italic">
                Aucune commande active.
              </p>
            ) : (
              <ul className="divide-y divide-terracotta/10">
                <AnimatePresence initial={false}>
                  {activeOrders.map((o) => (
                    <ActiveOrderRow key={o.id} order={o} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════════════════ */

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "p-4 rounded-2xl border",
        accent
          ? "bg-gradient-to-br from-gold/15 to-transparent border-gold/40"
          : "bg-white-warm border-terracotta/15",
      ].join(" ")}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light/70 font-bold">
        {label}
      </div>
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold text-brown leading-tight mt-1 tabular-nums",
          accent ? "text-3xl" : "text-2xl",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function LiveCard({
  label,
  value,
  icon,
  pulse,
  alert,
}: {
  label: string;
  value: number | string;
  icon: string;
  pulse?: "orange" | "green";
  alert?: boolean;
}) {
  const pulseDot =
    pulse === "orange"
      ? "bg-[#d97706]"
      : pulse === "green"
        ? "bg-green-500"
        : null;
  return (
    <div
      className={[
        "p-4 rounded-2xl border relative overflow-hidden",
        alert
          ? "bg-red/5 border-red/40"
          : "bg-white-warm border-terracotta/15",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light/70 font-bold">
          {label}
        </div>
        <span aria-hidden className="text-base leading-none">
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div
          className={[
            "font-[family-name:var(--font-display)] text-3xl font-bold leading-none tabular-nums",
            alert ? "text-red-dark" : "text-brown",
          ].join(" ")}
        >
          {value}
        </div>
        {pulseDot && (
          <span className={`w-2 h-2 rounded-full ${pulseDot} animate-pulse`} />
        )}
      </div>
    </div>
  );
}

function ActiveOrderRow({ order }: { order: OrderWithItems }) {
  const status = STATUS_LABELS[order.status] ?? {
    label: order.status,
    tone: "bg-cream/60 text-brown",
  };
  const fired = order.fired_at ?? order.created_at;
  const source = SOURCE_LABELS[order.source] ?? order.source;

  const href =
    typeof order.table_number === "number"
      ? `/staff/table/${order.table_number}`
      : `/staff/orders/${order.id}`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-3 hover:bg-cream/30 transition"
      >
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-[9px] uppercase tracking-[0.2em] text-brown-light/60 font-bold">
            Table
          </div>
          <div className="font-[family-name:var(--font-display)] text-xl font-bold text-brown leading-none">
            {order.table_number ?? "—"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${status.tone}`}
            >
              {status.label}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-brown-light/60">
              {source}
            </span>
            {order.staff_name && (
              <span className="text-xs text-brown-light truncate">
                · {order.staff_name}
              </span>
            )}
          </div>
          <div className="text-xs text-brown-light/70 mt-0.5 tabular-nums">
            {relativeFr(fired)} · {order.items.length} ligne
            {order.items.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums">
            {formatCents(order.total_cents)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-bold group-hover:text-gold">
            Ouvrir →
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

function ServiceSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="h-10 w-72 bg-cream rounded mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-white-warm rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white-warm rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-white-warm rounded-2xl" />
        <div className="h-80 bg-white-warm rounded-2xl" />
      </div>
    </div>
  );
}
