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
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CARTE } from "@/data/carte";
import type {
  OrderItem,
  OrderWithItems,
  OrderFlag,
} from "@/lib/db/pos-types";
import { ORDER_FLAGS_META } from "@/lib/db/pos-types";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { useEightySixList } from "@/lib/hooks/useEightySixList";
import { useRestaurantBranding } from "@/lib/hooks/useRestaurantBranding";
import { useMenu } from "@/lib/hooks/useMenu";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import {
  COURSE_ICONS,
  COURSE_LABELS,
  COURSES,
  type Course,
  courseForCategory,
} from "@/lib/courses";
import {
  toPosCatalog,
  toPosCatalogFromDb,
  type PosMenuItem,
} from "../_lib/menu";

/** Static fallback used when the DB hasn't been seeded yet. */
const FALLBACK_POS_CATALOG = toPosCatalog(CARTE);

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

/* ─── Merge logic ──────────────────────────────────────────
 *
 * When a server taps a menu item, we'd rather bump the quantity on an existing
 * line than pile on duplicate rows. But a merge is only safe if the line is
 * still malleable AND carries no customisation that would be lost:
 *
 *   - status === "pending"      (chef hasn't touched it yet)
 *   - no modifiers              (re-tapping "Margherita" must NOT merge into
 *                                "Margherita, sans oignons")
 *   - no notes                  (same reason — free-form annotations are
 *                                caller intent we mustn't swallow)
 *   - same menu_item_id         (obviously)
 *   - same price_cents          (protects against happy-hour / menu edits)
 *
 * Anything else → caller should POST a fresh line.
 * ─────────────────────────────────────────────────────────── */
export function findMergeableItem(
  items: readonly OrderItem[],
  menuItem: Pick<PosMenuItem, "id" | "price_cents">
): OrderItem | null {
  for (const item of items) {
    if (item.status !== "pending") continue;
    if (item.menu_item_id !== menuItem.id) continue;
    if (item.price_cents !== menuItem.price_cents) continue;
    if (item.modifiers && item.modifiers.length > 0) continue;
    if (item.notes && item.notes.trim().length > 0) continue;
    return item;
  }
  return null;
}

/* ═════════════════════════════════════════════════════════ */

type Props = {
  order: OrderWithItems;
  tableNumber?: number;
  onChange: (order: OrderWithItems) => void;
};

export default function OrderEditor({ order, tableNumber, onChange }: Props) {
  const router = useRouter();
  void router; /* kept for future inline navigations */
  const { menu } = useMenu();
  /* DB-driven catalogue → editable from /admin/menu without touching code.
   * Falls back to the static CARTE while the DB seeds. */
  const POS_CATALOG = useMemo(() => {
    const fromDb = toPosCatalogFromDb(menu);
    return fromDb.length > 0 ? fromDb : FALLBACK_POS_CATALOG;
  }, [menu]);
  /* Lookup id → image, recomputed when the catalogue changes. */
  const MENU_IMAGE_BY_ID = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const cat of POS_CATALOG) {
      for (const item of cat.items) {
        map[item.id] = item.image;
      }
    }
    return map;
  }, [POS_CATALOG]);
  const [activeCategory, setActiveCategory] = useState<string>(
    POS_CATALOG[0]?.id ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [modifierTarget, setModifierTarget] = useState<OrderItem | null>(null);
  /* Item id + monotonic tick — each merge bump flashes the row. Using a counter
   * instead of a boolean so back-to-back taps each re-trigger the pulse. */
  const [pulseTarget, setPulseTarget] = useState<{ id: string; tick: number } | null>(
    null
  );
  const pulseTick = useRef(0);
  const eightySixSet = useEightySixList();
  const branding = useRestaurantBranding();
  const flagsEnabled = branding.feature_special_flags !== false;
  const activeFlags = (order.flags ?? []) as OrderFlag[];

  /* Keep activeCategory in sync if the menu catalogue changes (admin edit,
   * category renamed/disabled). Falls back to the first available category. */
  useEffect(() => {
    if (POS_CATALOG.length === 0) return;
    if (!POS_CATALOG.find((c) => c.id === activeCategory)) {
      setActiveCategory(POS_CATALOG[0].id);
    }
  }, [POS_CATALOG, activeCategory]);

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

  /* Pending count per course — drives the "Lancer les entrées / plats" CTAs. */
  const pendingByCourse = useMemo(() => {
    const m: Record<Course, number> = {
      entree: 0,
      plat: 0,
      dessert: 0,
      boisson: 0,
    };
    for (const it of items) {
      if (it.status !== "pending") continue;
      m[courseForCategory(it.menu_item_category)] += it.quantity;
    }
    return m;
  }, [items]);

  const coursesWithPending = useMemo(
    () => COURSES.filter((c) => pendingByCourse[c] > 0),
    [pendingByCourse]
  );

  /* ─── Mutations ─────────────────────────────────── */

  /* Flash the existing line so the server sees the quantity tick up instead of
   * wondering "did my tap register?". Monotonic tick forces the effect to
   * retrigger on every merge, even if the id is the same. */
  function triggerPulse(itemId: string) {
    pulseTick.current += 1;
    setPulseTarget({ id: itemId, tick: pulseTick.current });
  }

  async function addItem(menuItem: PosMenuItem) {
    if (busy || order.status === "paid") return;

    /* Merge path: if there's already a pending line for the same dish with no
     * customisation, bump its quantity instead of duplicating the row. */
    const mergeTarget = findMergeableItem(items, menuItem);
    if (mergeTarget) {
      setBusy(true);
      /* Optimistic: show the new quantity + pulse immediately. The realtime
       * subscription will reconcile once the server confirms. */
      const nextQty = mergeTarget.quantity + 1;
      const optimistic: OrderWithItems = {
        ...order,
        items: items.map((it) =>
          it.id === mergeTarget.id ? { ...it, quantity: nextQty } : it
        ),
      };
      onChange(optimistic);
      triggerPulse(mergeTarget.id);

      try {
        const res = await fetch(
          `/api/staff/orders/${order.id}/items/${mergeTarget.id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ quantity: nextQty }),
          }
        );
        if (res.ok) {
          onChange((await res.json()) as OrderWithItems);
        } else if (res.status === 409) {
          /* The item raced to `cooking` between our check and the PATCH —
           * fall back to adding a fresh line so we don't drop the tap. */
          await postNewItem(menuItem);
        } else {
          /* Revert optimistic update on any other error. */
          await refresh();
        }
      } catch {
        await refresh();
      } finally {
        setBusy(false);
      }
      return;
    }

    /* No mergeable line — add a new one. */
    setBusy(true);
    try {
      await postNewItem(menuItem);
    } finally {
      setBusy(false);
    }
  }

  async function postNewItem(menuItem: PosMenuItem) {
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
  }

  async function bumpQuantity(item: OrderItem, delta: 1 | -1) {
    if (busy) return;
    if (item.status !== "pending") return;

    const nextQty = item.quantity + delta;

    if (nextQty < 1) {
      /* Down past zero → remove the line entirely. */
      await removeItem(item);
      return;
    }

    setBusy(true);
    /* Optimistic bump for instant feedback on touch. */
    const optimistic: OrderWithItems = {
      ...order,
      items: items.map((it) =>
        it.id === item.id ? { ...it, quantity: nextQty } : it
      ),
    };
    onChange(optimistic);
    if (delta === 1) triggerPulse(item.id);

    try {
      const res = await fetch(
        `/api/staff/orders/${order.id}/items/${item.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ quantity: nextQty }),
        }
      );
      if (res.ok) {
        onChange((await res.json()) as OrderWithItems);
      } else {
        await refresh();
      }
    } catch {
      await refresh();
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

  /** Toggle a special flag (Rush / Allergy / Birthday / VIP). Optimistic
   * update so the chip pops instantly under the server's thumb. */
  async function toggleFlag(flag: OrderFlag) {
    if (busy) return;
    const has = activeFlags.includes(flag);
    const next = has
      ? activeFlags.filter((f) => f !== flag)
      : [...activeFlags, flag];
    /* Optimistic */
    onChange({ ...order, flags: next });
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/orders/${order.id}/flags`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flags: next }),
      });
      if (res.ok) {
        onChange((await res.json()) as OrderWithItems);
      } else {
        /* Roll back. */
        onChange({ ...order, flags: activeFlags });
      }
    } catch {
      onChange({ ...order, flags: activeFlags });
    } finally {
      setBusy(false);
    }
  }

  async function ackItem(item: OrderItem) {
    if (busy) return;
    if (item.status !== "ready") return;
    setBusy(true);
    /* Optimistic — paint the row as acknowledged immediately. */
    const optimistic: OrderWithItems = {
      ...order,
      items: items.map((it) =>
        it.id === item.id
          ? { ...it, acknowledged_at: new Date().toISOString() }
          : it
      ),
    };
    onChange(optimistic);
    try {
      const res = await fetch(
        `/api/staff/orders/${order.id}/items/${item.id}/ack`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        }
      );
      if (res.ok) onChange(await res.json());
      else await refresh();
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function fireCourse(course: Course) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/orders/${order.id}/fire-course`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course }),
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

        {flagsEnabled && (
          <div className="flex items-center gap-1 ml-1">
            {(Object.entries(ORDER_FLAGS_META) as [OrderFlag, typeof ORDER_FLAGS_META[OrderFlag]][]).map(
              ([flag, meta]) => {
                const active = activeFlags.includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    disabled={busy}
                    title={meta.description}
                    aria-label={`Marquer ${meta.label}`}
                    aria-pressed={active}
                    className={[
                      "h-9 w-9 rounded-full border text-base flex items-center justify-center transition active:scale-95",
                      active
                        ? "border-transparent shadow-md text-white"
                        : "border-terracotta/35 text-brown-light/70 hover:text-brown hover:border-terracotta/70 bg-cream",
                      busy ? "opacity-60" : "",
                    ].join(" ")}
                    style={
                      active
                        ? {
                            backgroundColor: meta.tone,
                            boxShadow: `0 0 0 2px ${meta.tone}33`,
                          }
                        : undefined
                    }
                  >
                    <span aria-hidden>{meta.icon}</span>
                  </button>
                );
              }
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {order.fired_at && order.status !== "paid" && order.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => {
                window.open(
                  `/kitchen/ticket/${order.id}`,
                  "_blank",
                  "noopener,noreferrer,width=420,height=720"
                );
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-terracotta/40 bg-cream text-brown text-xs font-semibold hover:border-gold hover:text-gold transition active:scale-95"
              title="Réimprimer le ticket cuisine"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                <path
                  d="M6 9V3h12v6M6 18h12v3H6zM6 14h12M4 9h16v9H4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Refaire
            </button>
          )}
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

          {flagsEnabled && activeFlags.length > 0 && (
            <div className="px-4 md:px-6 py-2 border-b border-terracotta/20 bg-cream-dark/40 flex flex-wrap items-center gap-1.5">
              {activeFlags.map((flag) => {
                const meta = ORDER_FLAGS_META[flag];
                return (
                  <span
                    key={flag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white shadow-sm"
                    style={{ backgroundColor: meta.tone }}
                  >
                    <span aria-hidden>{meta.icon}</span>
                    {meta.label}
                  </span>
                );
              })}
            </div>
          )}

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
                      fromCustomer={
                        order.source === "dine_in_qr" &&
                        item.status === "pending"
                      }
                      onBump={(d) => bumpQuantity(item, d)}
                      onOpenModifier={() => setModifierTarget(item)}
                      onRemove={() => removeItem(item)}
                      onAck={() => ackItem(item)}
                      busy={busy}
                      pulseTick={
                        pulseTarget && pulseTarget.id === item.id
                          ? pulseTarget.tick
                          : 0
                      }
                      thumb={MENU_IMAGE_BY_ID[item.menu_item_id]}
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

            {/* Main "fire all" button — kept as the primary affordance. */}
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
                ? `Envoyer tout en cuisine (${items.filter((i) => i.status === "pending").length})`
                : allDelivered
                  ? "Tout est servi"
                  : "Rien à envoyer"}
            </button>

            {/* Per-course fire — only shown when at least 2 courses are waiting,
             * otherwise "tout envoyer" is equivalent and the noise hurts.  */}
            {coursesWithPending.length >= 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {coursesWithPending.map((course) => (
                  <button
                    key={course}
                    onClick={() => fireCourse(course)}
                    disabled={busy}
                    className="relative h-11 rounded-xl bg-cream border border-terracotta/40 text-brown text-xs font-bold hover:border-red hover:text-red disabled:opacity-50 transition inline-flex items-center justify-center gap-1.5"
                    title={`Envoyer uniquement les ${COURSE_LABELS[course].toLowerCase()} (${pendingByCourse[course]} plat${pendingByCourse[course] > 1 ? "s" : ""})`}
                  >
                    <span aria-hidden>{COURSE_ICONS[course]}</span>
                    <span>Lancer les {COURSE_LABELS[course].toLowerCase()}</span>
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-black rounded-full bg-red text-cream">
                      {pendingByCourse[course]}
                    </span>
                  </button>
                ))}
              </div>
            )}

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
              <Link
                href={`/staff/addition/${order.id}`}
                aria-disabled={!canPay || busy}
                onClick={(e) => {
                  if (!canPay || busy) e.preventDefault();
                }}
                className={[
                  "h-11 rounded-xl bg-brown text-cream text-sm font-semibold hover:bg-brown-light transition flex items-center justify-center gap-2",
                  !canPay || busy ? "opacity-40 pointer-events-none" : "",
                ].join(" ")}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Encaisser
              </Link>
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
              {activeCatalog.items.map((it) => {
                const out = eightySixSet.has(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      if (out) return;
                      addItem(it);
                    }}
                    disabled={busy || out}
                    className={[
                      "group relative text-left rounded-xl overflow-hidden transition",
                      out
                        ? "bg-brown/5 border border-brown/15 opacity-60 cursor-not-allowed"
                        : "bg-cream border border-terracotta/40 hover:border-gold hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60",
                    ].join(" ")}
                  >
                    {it.image && (
                      <div className="relative w-full aspect-[4/3] bg-brown/5">
                        <Image
                          src={it.image}
                          alt={it.name}
                          fill
                          sizes="(max-width:640px) 50vw, 220px"
                          className={[
                            "object-cover transition",
                            out ? "grayscale opacity-70" : "group-hover:scale-[1.03]",
                          ].join(" ")}
                        />
                        {out && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider bg-red text-cream px-2 py-0.5 rounded-full shadow">
                            86
                          </span>
                        )}
                        {it.signature && !out && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider bg-brown/90 text-gold-light px-2 py-0.5 rounded-full shadow backdrop-blur">
                            ★ Signature
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={[
                            "text-[13px] font-[family-name:var(--font-display)] font-semibold leading-tight line-clamp-2",
                            out ? "text-brown/60 line-through" : "text-brown",
                          ].join(" ")}
                        >
                          {it.name}
                        </p>
                        {!it.image && it.signature && !out && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gold shrink-0">
                            ★
                          </span>
                        )}
                        {!it.image && out && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-red text-cream px-1.5 py-0.5 rounded shrink-0">
                            86
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={[
                            "text-[10px] uppercase tracking-[0.15em]",
                            out ? "text-brown/40" : "text-brown-light",
                          ].join(" ")}
                        >
                          {out ? "Épuisé" : it.station}
                        </span>
                        <span
                          className={[
                            "font-[family-name:var(--font-display)] font-bold tabular-nums",
                            out ? "text-brown/50" : "text-brown",
                          ].join(" ")}
                        >
                          {it.price_label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
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
  fromCustomer,
  onBump,
  onOpenModifier,
  onRemove,
  onAck,
  busy,
  pulseTick,
  thumb,
}: {
  item: OrderItem;
  /** True when this line was submitted by the customer via the QR menu and
   * hasn't been validated by a server yet. Drives the "📱 Client" badge. */
  fromCustomer: boolean;
  onBump: (delta: 1 | -1) => void;
  onOpenModifier: () => void;
  onRemove: () => void;
  onAck: () => void;
  busy: boolean;
  /* Monotonic counter incremented by the parent each time this row's quantity
   * was bumped via a merge. Zero means "no pulse queued". */
  pulseTick: number;
  thumb?: string;
}) {
  const s = ITEM_STATUS_STYLES[item.status];
  const canEdit = item.status === "pending";
  const isReadyNotAck = item.status === "ready" && !item.acknowledged_at;
  const isAcked = item.status === "ready" && Boolean(item.acknowledged_at);

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

        {thumb && (
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-brown/5 shrink-0 hidden sm:block">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
              <p className="font-[family-name:var(--font-display)] font-semibold text-brown truncate">
                {item.menu_item_name}
              </p>
              {fromCustomer && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30"
                  title="Ligne envoyée par le client via le QR menu"
                >
                  <span aria-hidden>📱</span>
                  <span>Client</span>
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-brown tabular-nums shrink-0">
              {formatCents(item.price_cents * item.quantity)}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] flex-wrap">
            <span className={`font-semibold uppercase tracking-[0.15em] ${s.text}`}>
              {isAcked ? "Pris" : s.label}
            </span>
            <span className="text-brown-light/60">·</span>
            <span className="text-brown-light">
              {formatCents(item.price_cents)} / u
            </span>
            <span className="text-brown-light/60">·</span>
            <span className="text-brown-light uppercase tracking-wider">
              {item.station}
            </span>
            {isAcked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#6B8E23]/15 text-[#4a6518] font-bold uppercase tracking-wider text-[9px]">
                ✓ Parti en salle
              </span>
            )}
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
          {/* The quantity is the signal the server tracks most closely — pulse
           * it on each merge so the tap registers visually even when the row
           * stays in place. `key` bumps on every merge tick to retrigger.
           * Gold flash → brown rest mirrors the brand palette. */}
          <motion.span
            key={pulseTick}
            initial={
              pulseTick > 0
                ? { scale: 1.35, color: "var(--color-gold)" }
                : false
            }
            animate={{ scale: 1, color: "var(--color-brown)" }}
            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
            className="w-6 text-center text-sm font-bold tabular-nums text-brown"
          >
            {item.quantity}
          </motion.span>
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

        {isReadyNotAck && (
          <button
            onClick={onAck}
            disabled={busy}
            className="px-3 h-8 rounded-lg bg-[#6B8E23] text-cream text-xs font-bold hover:bg-[#5a7a1d] disabled:opacity-60 transition active:scale-95 inline-flex items-center gap-1.5"
            title="Marquer comme pris (entre cuisine et table)"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Pris
          </button>
        )}

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
