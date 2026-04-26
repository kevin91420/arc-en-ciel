"use client";

/**
 * Reusable "paid orders for a day" view.
 *
 * Used by both /staff/historique (server PIN auth) and /admin/historique
 * (admin password auth). Each consumer passes its own endpoint URL. The view
 * itself stays dumb : fetch → render KPI cards + table list.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatCents, formatDuration } from "@/lib/format";

interface HistoryEntry {
  order_id: string;
  table_number: number | null;
  source: string;
  guest_count: number;
  staff_name?: string;
  total_cents: number;
  tip_cents: number;
  payment_method?: string | null;
  items_count: number;
  paid_at: string;
  duration_minutes: number;
  flags?: string[];
}

interface HistoryPayload {
  date: string;
  orders: HistoryEntry[];
  summary: {
    orders_count: number;
    guests_count: number;
    revenue_cents: number;
    avg_ticket_cents: number;
    avg_per_guest_cents: number;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "Salle · QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "💳 Carte",
  cash: "💵 Espèces",
  ticket_resto: "🎟 Ticket Resto",
  other: "• Autre",
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDay(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function frenchDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  /** Endpoint that returns HistoryPayload — staff or admin variant. */
  endpoint: string;
  /** Where the addition page lives (server view goes to /staff/addition, admin
   * could either link to /staff/addition or stay on a read-only modal). */
  additionBaseHref?: string;
  /** Header title. */
  title?: string;
}

export default function OrderHistoryView({
  endpoint,
  additionBaseHref = "/staff/addition",
  title = "Historique des tables",
}: Props) {
  const [date, setDate] = useState<string>(todayISO());
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${endpoint}?date=${date}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HistoryPayload) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, endpoint]);

  const summary = data?.summary;
  const orders = data?.orders ?? [];
  const isToday = date === todayISO();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-bold">
            Service
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown font-semibold mt-1">
            {title}
          </h1>
          <p className="mt-1 text-sm text-brown-light capitalize">
            {frenchDate(date)}
            {isToday && (
              <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                En direct
              </span>
            )}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-white-warm border border-terracotta/30 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDay(d, -1))}
            className="w-8 h-8 rounded-full text-brown-light hover:bg-cream hover:text-brown transition flex items-center justify-center"
            aria-label="Jour précédent"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm text-brown font-semibold border-0 focus:outline-none focus:ring-0 tabular-nums"
          />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDay(d, 1))}
            disabled={isToday}
            className="w-8 h-8 rounded-full text-brown-light hover:bg-cream hover:text-brown transition flex items-center justify-center disabled:opacity-30"
            aria-label="Jour suivant"
          >
            ›
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayISO())}
              className="ml-1 text-[10px] uppercase tracking-wider font-bold text-brown px-2 py-1 rounded hover:bg-cream"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Commandes"
          value={summary ? String(summary.orders_count) : "…"}
          icon="🧾"
        />
        <KpiCard
          label="Couverts"
          value={summary ? String(summary.guests_count) : "…"}
          icon="👥"
        />
        <KpiCard
          label="Chiffre d'affaires"
          value={summary ? formatCents(summary.revenue_cents) : "…"}
          icon="💶"
          big
        />
        <KpiCard
          label="Ticket moyen"
          value={summary ? formatCents(summary.avg_ticket_cents) : "…"}
          icon="📊"
        />
        <KpiCard
          label="Par couvert"
          value={summary ? formatCents(summary.avg_per_guest_cents) : "…"}
          icon="🍽"
        />
      </div>

      {/* List */}
      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}
      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-4 text-red-dark text-sm">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/40">
          <div className="text-5xl mb-3" aria-hidden>
            📭
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            Aucune commande payée ce jour-là. Les tables soldées apparaîtront
            ici dès que le serveur les encaisse.
          </p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white-warm border border-terracotta/20">
          <div className="hidden md:grid grid-cols-[100px_1fr_auto_auto_auto_auto_auto] items-center px-5 py-3 bg-cream/60 text-[10px] uppercase tracking-widest text-brown-light/70 font-bold">
            <span>Heure</span>
            <span>Table / Source</span>
            <span className="text-center">Couverts</span>
            <span className="text-center">Items</span>
            <span className="text-center">Durée</span>
            <span className="text-center">Méthode</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-terracotta/10">
            {orders.map((o, i) => (
              <motion.li
                key={o.order_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-2 md:grid-cols-[100px_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3 hover:bg-cream/40 transition"
              >
                <span className="text-xs text-brown-light tabular-nums md:order-none order-first">
                  {timeOf(o.paid_at)}
                </span>
                <Link
                  href={`${additionBaseHref}/${o.order_id}`}
                  className="text-sm font-semibold text-brown hover:text-gold transition min-w-0 truncate inline-flex items-center gap-2"
                >
                  {o.table_number != null ? (
                    <>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brown text-cream text-xs font-bold">
                        {o.table_number}
                      </span>
                      <span>Table {o.table_number}</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-brown">
                      <span aria-hidden>📦</span>
                      {SOURCE_LABELS[o.source] ?? o.source}
                    </span>
                  )}
                  {o.staff_name && (
                    <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold">
                      · {o.staff_name}
                    </span>
                  )}
                </Link>
                <span className="text-xs text-brown md:text-center font-semibold tabular-nums">
                  <span className="md:hidden text-brown-light/60 mr-1">
                    👥
                  </span>
                  {o.guest_count}
                </span>
                <span className="text-xs text-brown-light md:text-center tabular-nums">
                  <span className="md:hidden text-brown-light/60 mr-1">
                    🍽
                  </span>
                  {o.items_count}
                </span>
                <span className="text-xs text-brown-light md:text-center tabular-nums">
                  <span className="md:hidden text-brown-light/60 mr-1">
                    ⏱
                  </span>
                  {formatDuration(o.duration_minutes)}
                </span>
                <span className="text-xs text-brown-light md:text-center">
                  {o.payment_method
                    ? PAYMENT_LABELS[o.payment_method] ?? o.payment_method
                    : "—"}
                </span>
                <span className="text-sm font-bold text-brown md:text-right tabular-nums">
                  {formatCents(o.total_cents + o.tip_cents)}
                  {o.tip_cents > 0 && (
                    <span className="ml-1 text-[10px] text-gold font-semibold">
                      +pourb.
                    </span>
                  )}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  big,
}: {
  label: string;
  value: string;
  icon: string;
  big?: boolean;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white-warm border border-terracotta/20">
      <div className="text-xl mb-1" aria-hidden>
        {icon}
      </div>
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold text-brown leading-none tabular-nums",
          big ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
        {label}
      </div>
    </div>
  );
}
