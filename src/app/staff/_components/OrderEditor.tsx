"use client";

/**
 * OrderEditor — the core POS screen.
 *
 * Left pane  (60%): current order lines, totals, fire/print/pay actions.
 * Right pane (40%): menu browser with category tabs and a tactile item grid.
 *
 * Realtime: we subscribe to `order_items` + `orders` so when the kitchen flips
 * an item to `ready`, the dot becomes green without a refresh.
 */

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CARTE } from "@/data/carte";
import type { OrderItem, OrderWithItems, PaymentMethod } from "@/lib/db/pos-types";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import {
  toPosCatalog,
  type PosMenuItem,
} from "../_lib/menu";
import PaymentModal from "./PaymentModal";

const POS_CATALOG = toPosCatalog(CARTE);

/* Modifier hints per category — quick taps, no free-text typing. */
const QUICK_MODIFIERS: Record<string, string[]> = {
  pizzas: ["Sans oignons", "Extra fromage", "Bien cuite", "Pâte fine"],
  grillades: ["Bleue", "Saignant", "À point", "Bien cuite"],
  pates: ["Al dente", "Sans crème", "Peu salé"],
  entrees: ["Sans gluten", "Sans allergènes"],
  salades: ["Sans noix", "Vinaigrette à part"],
  desserts: ["Sans alcool", "Chaud"],
  boissons: ["Sans glace", "Avec citron"],
};

const DEFAULT_MODIFIERS = ["Sans gluten", "Sans porc", "Allergies : voir staff"];

function modifiersFor(categoryId: string): string[] {
  return QUICK_MODIFIERS[categoryId] ?? DEFAULT_MODIFIERS;
}

/* ═════════════════════════════════════════════════════════ */

type Props = {
  order: OrderWithItems;
  tableNumber?: number;
  onChange: (order: OrderWithItems) => void;
};

export default function OrderEditor({ order, tableNumber, onChange }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(POS_CATALOG[0].id);
  const [busy, setBusy] = useState(false);
  const [modifierTarget, setModifierTarget] = useState<OrderItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  /* Keep the server state fresh without thrash. */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/orders/${order.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const fresh = (await res.json()) as OrderWithItems;
      onChange(fresh);
    } catch {}
  }, [order.id, onChange]);

  useRealtimeTable(["orders", "order_items"], (change) => {
    const row =
      (change.newRow as { order_id?: string; id?: string } | undefined) ||
      (change.oldRow as { order_id?: string; id?: string } | undefined);
    if (!row) return;
    /* Only refresh if this event concerns *our* order. */
    if (change.table === "orders" && row.id === order.id) refresh();
    if (change.table === "order_items" && row.order_id === order.id) refresh();
  });

  const items = order.items;
  const activeCatalog =
    POS_CATALOG.find((c) => c.id === activeCategory) ?? POS_CATALOG[0];

  const totals = useMemo(() => {
    const subtotal = items
      .filter((i) => i.status !== "cancelled")
      .reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    const tax = Math.round(subtotal * 0.1);
    return { subtotal, tax, total: subtotal + tax };
  }, [items]);

  const hasPending = items.some((i) => i.status === "pending");
  const allDelivered =
    items.length > 0 &&
    items.every((i) => i.status === "served" || i.status === "ready");
  const canPay =
    items.length > 0 &&
    items.every((i) => i.status !== "pending" && i.status !== "cancelled");

  /* ─── Mutations ─────────────────────────────────── */

  async function addItem(menuItem: PosMenuItem) {
    if (busy || order.status === "paid") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/orders/${order.id}/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          items: [
            {
              menu_item_id: menuItem.id,
              menu_item_name: menuItem.name,
              menu_item_category: menuItem.category_id,
              price_cents: menuItem.price_cents,
              quantity: 1,
              station: menuItem.station,
            },
          ],
        }),
      });
      if (res.ok) {
        const fresh = (await res.json()) as OrderWithItems;
        onChange(fresh);
      }
    } finally {
      setBusy(false);
    }
  }

  async function bumpQuantity(item: OrderItem, delta: 1 | -1) {
    if (busy) return;
    setBusy(true);
    try {
      if (delta === 1 && item.status === "pending") {
        /* Shortcut: re-add the same item as a new pending line to preserve the
         * per-line status model. */
        await fetch(`/api/staff/orders/${order.id}/items`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            items: [
              {
                menu_item_id: item.menu_item_id,
                menu_item_name: item.menu_item_name,
                menu_item_category: item.menu_item_category || undefined,
                price_cents: item.price_cents,
                quantity: 1,
                station: item.station,
              },
            ],
          }),
        });
        await refresh();
      } else if (delta === -1 && item.status === "pending") {
        /* Remove a unit. If quantity > 1, we leave the DB to handle cents
         * recompute by PATCHing the quantity down — but the pos-client doesn't
         * expose that, so we simulate via DELETE + add when needed.
         * Simpler: just delete the whole line; the user can re-add if needed. */
        if (item.quantity > 1) {
          /* pos-client has no "update quantity" yet — we remove + re-add with
           * quantity - 1. */
          const newQty = item.quantity - 1;
          await fetch(
            `/api/staff/orders/${order.id}/items/${item.id}`,
            { method: "DELETE", credentials: "include", cache: "no-store" }
          );
          await fetch(`/api/staff/orders/${order.id}/items`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              items: [
                {
                  menu_item_id: item.menu_item_id,
                  menu_item_name: item.menu_item_name,
                  menu_item_category: item.menu_item_category || undefined,
                  price_cents: item.price_cents,
                  quantity: newQty,
                  modifiers: item.modifiers || undefined,
                  station: item.station,
                },
              ],
            }),
          });
          await refresh();
        } else {
          await removeItem(item);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: OrderItem) {
    if (busy) return;
    if (item.status !== "pending") return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/staff/orders/${order.id}/items/${item.id}`,
        { method: "DELETE", credentials: "include", cache: "no-store" }
      );
      if (res.ok) onChange(await res.json());
    } finally {
      setBusy(false);
    }
  }

  async function fireOrder() {
    if (busy || !hasPending) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/orders/${order.id}/fire`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) onChange(await res.json());
    } finally {
      setBusy(false);
    }
  }

  async function markAllServed() {
    if (busy) return;
    setBusy(true);
    try {
      const readies = items.filter((i) => i.status === "ready");
      for (const it of readies) {
        await fetch(`/api/staff/orders/${order.id}/items/${it.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ status: "served" }),
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function applyModifier(item: OrderItem, modifier: string) {
    if (busy || item.status !== "pending") return;
    setBusy(true);
    try {
      const current = item.modifiers || [];
      const next = current.includes(modifier)
        ? current.filter((m) => m !== modifier)
        : [...current, modifier];

      /* pos-client has no "update modifiers" endpoint — we DELETE + re-ADD
       * as a pending line. */
      await fetch(`/api/staff/orders/${order.id}/items/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      await fetch(`/api/staff/orders/${order.id}/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          items: [
            {
              menu_item_id: item.menu_item_id,
              menu_item_name: item.menu_item_name,
              menu_item_category: item.menu_item_category || undefined,
              price_cents: item.price_cents,
              quantity: item.quantity,
              modifiers: next,
              station: item.station,
            },
          ],
        }),
      });
      await refresh();
      /* Keep the modal open on the *replacement* item if we can find it. */
      setModifierTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function completePayment(
    method: PaymentMethod,
    tipCents: number
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/orders/${order.id}/pay`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ method, tip_cents: tipCents }),
      });
      if (res.ok) {
        setShowPayment(false);
        router.push("/staff/tables");
      }
    } finally {
      setBusy(false);
    }
  }

  const elapsed = formatDuration(minutesSince(order.created_at));

  /* ═════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* ─── Header ─────────────────────────────── */}
      <div className="px-4 md:px-6 py-3 border-b border-terracotta/30 bg-white-warm flex items-center gap-4 flex-wrap">
        <Link
          href="/staff/tables"
          className="inline-flex items-center gap-1.5 text-sm text-brown-light hover:text-gold transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Plan
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brown text-cream flex items-center justify-center font-[family-name:var(--font-display)] text-lg font-bold">
            {tableNumber ?? "EM"}
          </div>
          <div className="leading-tight">
            <p className="font-[family-name:var(--font-display)] text-lg text-brown font-semibold">
              {tableNumber ? `Table ${tableNumber}` : order.source === "delivery" ? "Livraison" : "À emporter"}
            </p>
            <p className="text-xs text-brown-light">
              {order.guest_count > 0 && `${order.guest_count} couvert${order.guest_count > 1 ? "s" : ""} · `}
              ouverte il y a {elapsed}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* ─── Split view ─────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] overflow-hidden">
        {/* Left: current order + totals + actions */}
        <section className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-terracotta/30 bg-cream">
          <div className="px-4 md:px-6 py-3 border-b border-terracotta/30 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-brown font-semibold">
              Commande en cours
              <span className="ml-2 text-sm text-brown-light font-normal">
                ({items.length} ligne{items.length > 1 ? "s" : ""})
              </span>
            </h2>
            {items.some((i) => i.status === "ready") && (
              <button
                onClick={markAllServed}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#6B8E23]/15 text-[#4a6518] hover:bg-[#6B8E23]/25 transition"
              >
                Marquer tout servi
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-brown-light">
                  La commande est vide. Tapez un plat dans le menu →
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <OrderLine
                      key={item.id}
                      item={item}
                      onBump={(d) => bumpQuantity(item, d)}
                      onOpenModifier={() => setModifierTarget(item)}
                      onRemove={() => removeItem(item)}
                      busy={busy}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {/* Totals + actions */}
          <div className="border-t border-terracotta/30 bg-white-warm px-4 md:px-6 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-brown-light">Sous-total</span>
              <span className="tabular-nums text-brown">{formatCents(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brown-light">TVA 10&nbsp;%</span>
              <span className="tabular-nums text-brown">{formatCents(totals.tax)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-terracotta/30">
              <span className="text-base font-semibold text-brown">Total</span>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                {formatCents(totals.total)}
              </span>
            </div>

            <button
              onClick={fireOrder}
              disabled={!hasPending || busy}
              className="w-full h-14 rounded-xl bg-red text-cream font-semibold text-base tracking-wide shadow-lg shadow-red/20 hover:bg-red-dark disabled:bg-brown-light/30 disabled:text-brown-light disabled:shadow-none transition flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M12 3c0 3-4 3-4 7a4 4 0 0 0 8 0c0-2-2-3-2-5 1 1 2 1 3 2a6 6 0 1 1-9 6c0-4 4-6 4-10z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              {hasPending
                ? `Envoyer en cuisine (${items.filter((i) => i.status === "pending").length})`
                : allDelivered
                  ? "Tout est servi"
                  : "Rien à envoyer"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/staff/addition/${order.id}`}
                className="h-11 rounded-xl bg-cream border border-terracotta/40 text-brown text-sm font-medium hover:bg-cream-dark transition flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path
                    d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 8h6M9 12h6M9 16h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Addition
              </Link>
              <button
                onClick={() => setShowPayment(true)}
                disabled={!canPay || busy}
                className="h-11 rounded-xl bg-brown text-cream text-sm font-semibold hover:bg-brown-light disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Encaisser
              </button>
            </div>
          </div>
        </section>

        {/* Right: menu browser */}
        <section className="flex flex-col min-h-0 bg-white-warm">
          <div className="px-3 md:px-4 py-3 border-b border-terracotta/30 overflow-x-auto">
            <div className="flex gap-1.5 min-w-max">
              {POS_CATALOG.map((cat) => {
                const active = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium tracking-wide transition whitespace-nowrap",
                      active
                        ? "bg-brown text-cream shadow-md"
                        : "bg-cream text-brown hover:bg-cream-dark",
                    ].join(" ")}
                  >
                    <span aria-hidden>{cat.icon}</span>
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {activeCatalog.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => addItem(it)}
                  disabled={busy}
                  className="group relative text-left bg-cream border border-terracotta/40 rounded-xl p-3 hover:border-gold hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition disabled:opacity-60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-brown leading-tight line-clamp-2">
                      {it.name}
                    </p>
                    {it.signature && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gold shrink-0">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-brown-light">
                      {it.station}
                    </span>
                    <span className="font-[family-name:var(--font-display)] font-bold text-brown tabular-nums">
                      {it.price_label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ─── Modifiers modal ─────────────────── */}
      <AnimatePresence>
        {modifierTarget && (
          <ModifierSheet
            item={modifierTarget}
            onClose={() => setModifierTarget(null)}
            onToggle={(m) => applyModifier(modifierTarget, m)}
            busy={busy}
          />
        )}
      </AnimatePresence>

      {/* ─── Payment modal ───────────────────── */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            totalCents={totals.total}
            guestCount={order.guest_count}
            onClose={() => setShowPayment(false)}
            onConfirm={completePayment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: OrderWithItems["status"] }) {
  const map: Record<OrderWithItems["status"], { label: string; bg: string; ink: string }> = {
    open: { label: "Ouverte", bg: "bg-gold/15", ink: "text-gold" },
    fired: { label: "En cuisine", bg: "bg-[#E67E22]/15", ink: "text-[#C56A19]" },
    ready: { label: "Prête à servir", bg: "bg-[#6B8E23]/15", ink: "text-[#4a6518]" },
    served: { label: "Servie", bg: "bg-brown/10", ink: "text-brown" },
    paid: { label: "Payée", bg: "bg-brown/10", ink: "text-brown-light" },
    cancelled: { label: "Annulée", bg: "bg-red/10", ink: "text-red" },
  };
  const s = map[status];
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${s.bg} ${s.ink}`}
    >
      {s.label}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════ */

const ITEM_STATUS_STYLES: Record<
  OrderItem["status"],
  { dot: string; text: string; label: string }
> = {
  pending: { dot: "bg-brown-light/40", text: "text-brown-light", label: "À envoyer" },
  cooking: { dot: "bg-[#E67E22]", text: "text-[#C56A19]", label: "En cuisson" },
  ready: { dot: "bg-[#6B8E23]", text: "text-[#4a6518]", label: "Prêt" },
  served: { dot: "bg-brown", text: "text-brown", label: "Servi" },
  cancelled: { dot: "bg-red", text: "text-red", label: "Annulé" },
};

function OrderLine({
  item,
  onBump,
  onOpenModifier,
  onRemove,
  busy,
}: {
  item: OrderItem;
  onBump: (delta: 1 | -1) => void;
  onOpenModifier: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const s = ITEM_STATUS_STYLES[item.status];
  const canEdit = item.status === "pending";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="bg-white-warm border border-terracotta/40 rounded-xl p-3"
    >
      <div className="flex items-start gap-3">
        <motion.span
          layout
          className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`}
          aria-hidden
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-[family-name:var(--font-display)] font-semibold text-brown truncate">
              {item.menu_item_name}
            </p>
            <p className="text-sm font-semibold text-brown tabular-nums shrink-0">
              {formatCents(item.price_cents * item.quantity)}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className={`font-semibold uppercase tracking-[0.15em] ${s.text}`}>
              {s.label}
            </span>
            <span className="text-brown-light/60">·</span>
            <span className="text-brown-light">
              {formatCents(item.price_cents)} / u
            </span>
            <span className="text-brown-light/60">·</span>
            <span className="text-brown-light uppercase tracking-wider">
              {item.station}
            </span>
          </div>

          {item.modifiers && item.modifiers.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.modifiers.map((m) => (
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

      {/* Actions row */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className={`flex items-center gap-1 bg-cream border border-terracotta/40 rounded-lg ${
            !canEdit ? "opacity-50" : ""
          }`}
        >
          <button
            aria-label="Retirer une unité"
            disabled={!canEdit || busy}
            onClick={() => onBump(-1)}
            className="w-8 h-8 rounded-lg hover:bg-brown/10 disabled:cursor-not-allowed text-brown-light transition"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-bold tabular-nums text-brown">
            {item.quantity}
          </span>
          <button
            aria-label="Ajouter une unité"
            disabled={!canEdit || busy}
            onClick={() => onBump(1)}
            className="w-8 h-8 rounded-lg hover:bg-brown/10 disabled:cursor-not-allowed text-brown-light transition"
          >
            +
          </button>
        </div>

        <button
          onClick={onOpenModifier}
          disabled={!canEdit || busy}
          className="px-2.5 h-8 rounded-lg bg-cream border border-terracotta/40 text-xs text-brown hover:border-gold disabled:opacity-50 transition"
        >
          Modifier
        </button>

        <div className="ml-auto">
          {canEdit ? (
            <button
              onClick={onRemove}
              disabled={busy}
              aria-label="Retirer cette ligne"
              className="w-8 h-8 rounded-lg text-brown-light hover:text-red hover:bg-red/10 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mx-auto">
                <path
                  d="M4 7h16M9 7V4h6v3M6 7l1.4 13a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L18 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="text-[10px] text-brown-light/60 uppercase tracking-wider">
              Verrouillé
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/* ═════════════════════════════════════════════════════════ */

function ModifierSheet({
  item,
  onClose,
  onToggle,
  busy,
}: {
  item: OrderItem;
  onClose: () => void;
  onToggle: (modifier: string) => void;
  busy: boolean;
}) {
  const cat = item.menu_item_category || "";
  const suggestions = modifiersFor(cat);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-brown/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white-warm rounded-2xl shadow-2xl border border-terracotta/40 p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brown-light">
              Modificateurs
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-brown font-semibold">
              {item.menu_item_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-brown/10 text-brown-light transition"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {suggestions.map((s) => {
            const active = (item.modifiers || []).includes(s);
            return (
              <button
                key={s}
                onClick={() => onToggle(s)}
                disabled={busy}
                className={[
                  "h-11 px-4 rounded-full text-sm font-medium border transition",
                  active
                    ? "bg-gold text-brown border-gold shadow-inner"
                    : "bg-cream border-terracotta/40 text-brown hover:border-gold",
                ].join(" ")}
              >
                {active ? "✓ " : ""}
                {s}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-brown-light">
          Les modificateurs apparaissent sur le ticket cuisine. La ligne sera
          remplacée (elle reste « à envoyer »).
        </p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="h-11 px-5 rounded-xl bg-brown text-cream font-medium hover:bg-brown-light transition"
          >
            Terminé
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
