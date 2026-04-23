"use client";

/**
 * /staff/tables — Plan de salle.
 *
 * Grid 5×2 of tables 1..10 + a "Emporter / Livraison" button top-right.
 * Each tile reflects the live state of the underlying order (libre / open /
 * fired / ready) and taps through to /staff/table/[number]. Realtime is piped
 * from the `orders` and `order_items` tables — any chef or other server who
 * changes something refreshes every tablet at once.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import type { OrderWithItems } from "@/lib/db/pos-types";

const TABLE_COUNT = 10;
const TABLE_NUMBERS = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1);

type TileState =
  | "libre"
  | "occupee" /* open, nothing fired yet */
  | "cuisine" /* fired, items cooking */
  | "prete" /* at least one item ready */
  | "servie"; /* all items served, awaiting payment */

function deriveTileState(order: OrderWithItems | undefined): TileState {
  if (!order) return "libre";
  if (order.status === "ready") return "prete";
  if (order.items.some((i) => i.status === "ready")) return "prete";
  if (order.status === "fired") return "cuisine";
  if (order.status === "served") return "servie";
  return "occupee";
}

const TILE_STYLES: Record<
  TileState,
  {
    bg: string;
    border: string;
    ink: string;
    accent: string;
    label: string;
    pulse?: boolean;
  }
> = {
  libre: {
    bg: "bg-white-warm",
    border: "border-terracotta/40",
    ink: "text-brown",
    accent: "text-brown-light/70",
    label: "Libre",
  },
  occupee: {
    bg: "bg-gold/10",
    border: "border-gold/50",
    ink: "text-brown",
    accent: "text-gold",
    label: "Commande en cours",
  },
  cuisine: {
    bg: "bg-[#F2A65A]/15",
    border: "border-[#E67E22]/60",
    ink: "text-brown",
    accent: "text-[#E67E22]",
    label: "En cuisine",
  },
  prete: {
    bg: "bg-green-100",
    border: "border-green-500",
    ink: "text-brown",
    accent: "text-green-700",
    label: "🍽 À SERVIR MAINTENANT",
    pulse: true,
  },
  servie: {
    bg: "bg-brown/5",
    border: "border-brown-light/40",
    ink: "text-brown",
    accent: "text-brown-light",
    label: "À encaisser",
  },
};

export default function TablesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTakeaway, setCreatingTakeaway] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) router.push("/staff/login");
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      /* Silently retry on next realtime tick. */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeTable(["orders", "order_items"], refresh);

  /* Group active orders by table number (latest wins). */
  const orderByTable = useMemo(() => {
    const m = new Map<number, OrderWithItems>();
    for (const o of orders) {
      if (o.table_number == null) continue;
      /* listActiveOrders is already sorted by created_at desc. */
      if (!m.has(o.table_number)) m.set(o.table_number, o);
    }
    return m;
  }, [orders]);

  const takeawayOrders = useMemo(
    () => orders.filter((o) => o.table_number == null),
    [orders]
  );

  async function createTakeaway() {
    if (creatingTakeaway) return;
    setCreatingTakeaway(true);
    try {
      const res = await fetch("/api/staff/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ source: "takeaway", guest_count: 1 }),
      });
      if (!res.ok) return;
      const order = (await res.json()) as { id: string };
      router.push(`/staff/order/${order.id}`);
    } finally {
      setCreatingTakeaway(false);
    }
  }

  const busyCount = orderByTable.size;

  return (
    <div className="px-4 md:px-8 py-6">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown font-semibold leading-tight">
            Plan de salle
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {loading ? (
              "Chargement du service…"
            ) : busyCount === 0 ? (
              <>Toutes les tables sont libres. Bon service&nbsp;!</>
            ) : (
              <>
                {busyCount} / {TABLE_COUNT} tables occupées
                {takeawayOrders.length > 0 && (
                  <> · {takeawayOrders.length} à emporter</>
                )}
              </>
            )}
          </p>
        </div>

        <button
          onClick={createTakeaway}
          disabled={creatingTakeaway}
          className="group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brown text-cream text-sm font-semibold tracking-wide shadow-lg shadow-brown/20 hover:bg-brown-light disabled:opacity-60 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path
              d="M3 7h18l-1.5 12a2 2 0 0 1-2 1.75H6.5A2 2 0 0 1 4.5 19L3 7z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M8 7V5a4 4 0 0 1 8 0v2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>Emporter / Livraison</span>
        </button>
      </div>

      {/* ─── Tables grid ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {TABLE_NUMBERS.map((n) => {
          const order = orderByTable.get(n);
          const state = deriveTileState(order);
          return (
            <TableTile
              key={n}
              number={n}
              state={state}
              order={order}
              onClick={() => router.push(`/staff/table/${n}`)}
            />
          );
        })}
      </div>

      {/* ─── Takeaway / delivery list ──────────────── */}
      {takeawayOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold mb-3">
            Commandes à emporter / livraison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence initial={false}>
              {takeawayOrders.map((o) => (
                <motion.button
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/staff/order/${o.id}`)}
                  className="text-left bg-white-warm border border-terracotta/40 rounded-xl p-4 hover:border-gold transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-brown-light">
                      {o.source === "delivery" ? "Livraison" : "Emporter"}
                    </span>
                    <span className="text-xs text-brown-light tabular-nums">
                      {formatDuration(minutesSince(o.created_at))}
                    </span>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-brown font-semibold">
                    {o.items.length} article{o.items.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-brown-light">
                    {formatCents(o.total_cents)}
                  </p>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function TableTile({
  number,
  state,
  order,
  onClick,
}: {
  number: number;
  state: TileState;
  order?: OrderWithItems;
  onClick: () => void;
}) {
  const s = TILE_STYLES[state];
  const elapsed = order ? formatDuration(minutesSince(order.created_at)) : null;
  const pulse = state === "prete";

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={[
        "relative aspect-square min-h-[150px] md:min-h-[180px] rounded-2xl border-2 p-4 text-left",
        "transition-colors flex flex-col",
        s.bg,
        s.border,
        s.ink,
      ].join(" ")}
    >
      {pulse && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-2xl ring-4 ring-green-500/60 pointer-events-none"
          animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.02, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-brown-light/70">
          Table
        </span>
        <span
          className={[
            "text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded",
            state === "libre"
              ? "bg-brown/5 text-brown-light/70"
              : state === "occupee"
                ? "bg-gold/20 text-gold"
                : state === "cuisine"
                  ? "bg-[#E67E22]/15 text-[#C56A19]"
                  : state === "prete"
                    ? "bg-green-500 text-white"
                    : "bg-brown/10 text-brown-light",
          ].join(" ")}
        >
          {s.label}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <span className="font-[family-name:var(--font-display)] text-5xl md:text-6xl font-bold leading-none">
          {number}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 min-h-[2.4rem]">
        {order ? (
          <>
            <p className={`text-xs font-semibold ${s.accent}`}>
              {order.guest_count} couvert{order.guest_count > 1 ? "s" : ""} ·{" "}
              {elapsed}
            </p>
            {state === "prete" && (() => {
              const ready = order.items.filter((i) => i.status === "ready").length;
              const total = order.items.filter((i) => i.status !== "cancelled" && i.status !== "served").length;
              return (
                <p className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded inline-block">
                  ✓ {ready}/{total} plat{total > 1 ? "s" : ""} prêt{ready > 1 ? "s" : ""}
                </p>
              );
            })()}
            {state === "cuisine" && (() => {
              const cooking = order.items.filter((i) => i.status === "cooking").length;
              const ready = order.items.filter((i) => i.status === "ready").length;
              return (
                <p className="text-[11px] font-medium text-[#C56A19]">
                  🔥 {cooking} en prépa{ready > 0 ? ` · ✓ ${ready} prêt${ready > 1 ? "s" : ""}` : ""}
                </p>
              );
            })()}
            <p className="text-sm text-brown font-semibold tabular-nums">
              {formatCents(order.total_cents)}
            </p>
          </>
        ) : (
          <p className="text-xs text-brown-light/60">Toucher pour ouvrir</p>
        )}
      </div>
    </motion.button>
  );
}
