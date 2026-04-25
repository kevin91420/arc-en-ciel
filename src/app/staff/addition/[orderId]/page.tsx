"use client";

/**
 * /staff/addition/[orderId] — printable customer receipt.
 *
 * Simple, readable, print-friendly. The browser's native print dialog is
 * wired to window.print() and we ship a @media print style block inline so
 * only the receipt card prints (no header, no buttons).
 */

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import type {
  OrderItem,
  OrderPayment,
  OrderWithItems,
  PaymentMethod,
} from "@/lib/db/pos-types";
import {
  useRestaurantBranding,
  formatAddressLines,
  formatContactLine,
} from "@/lib/hooks/useRestaurantBranding";

type PaymentMode = "single" | "covers" | "items";

const PAYMENT_METHOD_OPTIONS: {
  key: PaymentMethod;
  label: string;
  icon: string;
}[] = [
  { key: "card", label: "Carte", icon: "💳" },
  { key: "cash", label: "Espèces", icon: "💵" },
  { key: "ticket_resto", label: "Ticket Resto", icon: "🎟" },
  { key: "other", label: "Autre", icon: "•" },
];

type PageProps = {
  params: Promise<{ orderId: string }>;
};

/**
 * Split a total into N equal shares (cents). When the total isn't perfectly
 * divisible, the first share absorbs the rounding remainder so the sum still
 * matches the original. Returns the per-share array.
 */
function computeSharesArray(totalCents: number, parts: number): number[] {
  if (parts <= 1) return [totalCents];
  const safeParts = Math.max(2, Math.min(20, Math.floor(parts)));
  const base = Math.floor(totalCents / safeParts);
  const remainder = totalCents - base * safeParts;
  return Array.from({ length: safeParts }, (_, i) =>
    i === 0 ? base + remainder : base
  );
}

function computePerShare(totalCents: number, parts: number): number {
  /* When the split isn't perfect, we display the *higher* share (the one that
   * absorbs the remainder) — clearer than rounding silently. */
  return computeSharesArray(totalCents, parts)[0];
}

export default function AdditionPage({ params }: PageProps) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(1);
  const [mode, setMode] = useState<PaymentMode>("single");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set()
  );
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMethodModal, setPaymentMethodModal] = useState<{
    amountCents: number;
    itemIds: string[];
  } | null>(null);
  const branding = useRestaurantBranding();
  const addressLines = formatAddressLines(branding);
  const contactLine = formatContactLine(branding);
  const taxRate = branding.tax_rate ?? 10;
  const legalLine = [
    branding.vat_number ? `TVA ${branding.vat_number}` : "",
    branding.siret ? `SIRET ${branding.siret}` : "",
    branding.legal_name || "",
  ]
    .filter(Boolean)
    .join(" · ");

  /** Fetch order + payments together so the addition + sums are coherent. */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/orders/${orderId}/payments`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Commande introuvable");
      const data = (await res.json()) as {
        order: OrderWithItems;
        payments: OrderPayment[];
      };
      setOrder(data.order);
      setPayments(data.payments ?? []);
      return data;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      const data = await refresh();
      if (cancelled) return;
      if (data?.order) {
        setSplitCount(Math.max(1, data.order.guest_count || 1));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, refresh]);

  /* ─── Payment helpers ───────────────────────────────────── */

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const requestPayment = useCallback(
    (amountCents: number, itemIds: string[]) => {
      if (amountCents <= 0) return;
      setPaymentMethodModal({ amountCents, itemIds });
    },
    []
  );

  const confirmPayment = useCallback(
    async (method: PaymentMethod, tipCents: number) => {
      if (!paymentMethodModal || paymentBusy) return;
      setPaymentBusy(true);
      try {
        const res = await fetch(`/api/staff/orders/${orderId}/payments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: paymentMethodModal.amountCents,
            tip_cents: tipCents,
            method,
            item_ids: paymentMethodModal.itemIds,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || `Erreur ${res.status}`);
          return;
        }
        await refresh();
        setSelectedItemIds(new Set());
        setPaymentMethodModal(null);
      } finally {
        setPaymentBusy(false);
      }
    },
    [orderId, paymentMethodModal, paymentBusy, refresh]
  );

  const removePayment = useCallback(
    async (paymentId: string) => {
      if (!confirm("Annuler ce paiement ?")) return;
      try {
        const res = await fetch(`/api/staff/payments/${paymentId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          alert("Annulation impossible.");
          return;
        }
        await refresh();
      } catch {
        alert("Erreur réseau lors de l'annulation.");
      }
    },
    [refresh]
  );

  if (loading) {
    return <div className="px-8 py-10 text-brown-light">Chargement…</div>;
  }

  if (err || !order) {
    return (
      <div className="px-8 py-10">
        <p className="text-red">{err || "Commande introuvable"}</p>
        <Link
          href="/staff/tables"
          className="text-gold underline mt-2 inline-block"
        >
          ← Plan de salle
        </Link>
      </div>
    );
  }

  const created = new Date(order.created_at);
  const dateLabel = created.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeLabel = created.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const activeItems = order.items.filter((i) => i.status !== "cancelled");
  const grandTotal = order.total_cents + order.tip_cents;
  const shares = computeSharesArray(grandTotal, splitCount);
  const totalPaidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
  const remainingCents = Math.max(0, order.total_cents - totalPaidCents);
  const fullyPaid = order.status === "paid" || remainingCents === 0;
  const paidItemIds = new Set<string>(
    payments.flatMap((p) => p.item_ids ?? [])
  );
  const itemFullPrice = (it: OrderItem) => it.price_cents * it.quantity;
  /* TVA-inclusive share for an item — consistent with the receipt total. */
  const itemDisplayCents = (it: OrderItem) => {
    if (order.subtotal_cents === 0) return itemFullPrice(it);
    const ratio = order.total_cents / order.subtotal_cents;
    return Math.round(itemFullPrice(it) * ratio);
  };
  const selectedItems = activeItems.filter((i) =>
    selectedItemIds.has(i.id) && !paidItemIds.has(i.id)
  );
  const selectedTotalCents = selectedItems.reduce(
    (s, it) => s + itemDisplayCents(it),
    0
  );
  const remainingItems = activeItems.filter(
    (i) => !paidItemIds.has(i.id)
  );
  const remainingItemsTotal = remainingItems.reduce(
    (s, it) => s + itemDisplayCents(it),
    0
  );
  const perShare = shares[0];
  const splitActive = splitCount > 1;
  const sharesEqual = shares.every((s) => s === shares[0]);

  return (
    <div className="min-h-[calc(100vh-57px)] bg-cream bg-noise">
      {/* Print styles — only the receipts print. */}
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .receipt + .receipt {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="no-print px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3 bg-white-warm border-b border-terracotta/30">
        <Link
          href={
            order.table_number
              ? `/staff/table/${order.table_number}`
              : `/staff/order/${order.id}`
          }
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
          Retour à la commande
        </Link>

        {/* Mode switcher */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-cream border border-terracotta/30">
          {(
            [
              { id: "single", label: "Une addition", icon: "🧾" },
              { id: "covers", label: "Par couverts", icon: "👥" },
              { id: "items", label: "Par items", icon: "🍽" },
            ] as { id: PaymentMode; label: string; icon: string }[]
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setMode(opt.id);
                  if (opt.id !== "covers") setSplitCount(1);
                  if (opt.id !== "items") setSelectedItemIds(new Set());
                }}
                className={[
                  "px-3 h-8 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5",
                  active
                    ? "bg-brown text-cream shadow"
                    : "text-brown-light hover:text-brown",
                ].join(" ")}
              >
                <span aria-hidden>{opt.icon}</span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Right cluster — context dependent on mode */}
        <div className="flex items-center gap-3 flex-wrap">
          {mode === "covers" && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-cream border border-terracotta/30 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
                  Couverts
                </span>
                <button
                  type="button"
                  onClick={() => setSplitCount((n) => Math.max(1, n - 1))}
                  disabled={splitCount <= 1}
                  aria-label="Diminuer le nombre de parts"
                  className="w-7 h-7 rounded-full text-brown font-bold hover:bg-brown/10 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center text-base font-bold text-brown tabular-nums">
                  {splitCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSplitCount((n) => Math.min(20, n + 1))}
                  aria-label="Augmenter le nombre de parts"
                  className="w-7 h-7 rounded-full text-brown font-bold hover:bg-brown/10"
                >
                  +
                </button>
              </div>

              {splitActive && (
                <div className="inline-flex items-baseline gap-2 px-4 py-2 rounded-xl bg-gold/15 border border-gold/30">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
                    Par personne
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-xl font-bold text-brown tabular-nums">
                    {formatCents(perShare)}
                  </span>
                </div>
              )}
            </>
          )}

          {mode !== "items" && (
            <button
              onClick={() => window.print()}
              className="h-10 px-4 rounded-lg bg-brown text-cream text-sm font-semibold hover:bg-brown-light transition inline-flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path
                  d="M6 9V4h12v5M6 18H4v-7h16v7h-2M8 14h8v6H8z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {splitActive
                ? `Imprimer ${splitCount} additions`
                : "Imprimer"}
            </button>
          )}
        </div>
      </div>

      {/* Payment summary banner — visible in all modes when payments exist. */}
      {(payments.length > 0 || fullyPaid) && (
        <div className="no-print max-w-3xl mx-auto px-4 md:px-0 mt-6">
          <div
            className={[
              "rounded-2xl p-5 border-2",
              fullyPaid
                ? "bg-green-50 border-green-400"
                : "bg-cream border-gold/40",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brown-light font-bold">
                  {fullyPaid ? "Commande soldée" : "Encaissement en cours"}
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mt-1">
                  {fullyPaid ? "✅ Tout est payé" : `Payé ${formatCents(totalPaidCents)} / ${formatCents(order.total_cents)}`}
                </p>
              </div>
              {!fullyPaid && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
                    Restant
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-red tabular-nums">
                    {formatCents(remainingCents)}
                  </p>
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {payments.map((p) => {
                  const opt = PAYMENT_METHOD_OPTIONS.find(
                    (m) => m.key === p.method
                  );
                  const linked = p.item_ids?.length
                    ? `${p.item_ids.length} item${p.item_ids.length > 1 ? "s" : ""}`
                    : "Tout";
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-xs bg-white-warm/60 px-3 py-2 rounded-lg border border-terracotta/20"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden>{opt?.icon ?? "•"}</span>
                        <span className="font-semibold text-brown">
                          {opt?.label ?? p.method}
                        </span>
                        <span className="text-brown-light/70">
                          · {linked}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-3">
                        <span className="tabular-nums font-bold text-brown">
                          {formatCents(p.amount_cents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePayment(p.id)}
                          className="text-[10px] uppercase tracking-wider text-brown-light hover:text-red transition"
                        >
                          Annuler
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ─── Mode "items" panel ─────────────────────────────── */}
      {mode === "items" && !fullyPaid && (
        <section className="no-print max-w-3xl mx-auto px-4 md:px-0 mt-6">
          <div className="rounded-2xl bg-white-warm border border-terracotta/30 p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brown-light font-bold">
                  Encaissement par items
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mt-0.5">
                  Sélectionne ce qui est payé maintenant
                </h2>
              </div>
              <p className="text-xs text-brown-light max-w-sm">
                Coche les plats & boissons d&apos;un client → encaisse sa part →
                recommence pour le suivant.
              </p>
            </div>

            <ul className="divide-y divide-terracotta/15 mb-4">
              {activeItems.map((it) => {
                const isPaid = paidItemIds.has(it.id);
                const isSelected = selectedItemIds.has(it.id);
                return (
                  <li
                    key={it.id}
                    className={[
                      "flex items-center gap-3 py-2.5",
                      isPaid ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isPaid || paymentBusy}
                        checked={isSelected && !isPaid}
                        onChange={() => toggleItemSelection(it.id)}
                        className="w-5 h-5 rounded border-2 border-terracotta/40 text-gold focus:ring-gold/30"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-brown leading-tight">
                          {it.quantity}× {it.menu_item_name}
                          {isPaid && (
                            <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              Payé
                            </span>
                          )}
                        </span>
                        {it.modifiers && it.modifiers.length > 0 && (
                          <span className="block text-[11px] italic text-brown-light/80">
                            {it.modifiers.join(" · ")}
                          </span>
                        )}
                      </span>
                    </label>
                    <span className="tabular-nums font-bold text-brown text-sm">
                      {formatCents(itemDisplayCents(it))}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-4 flex-wrap pt-3 border-t border-terracotta/20">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
                  Sélection ({selectedItems.length} item
                  {selectedItems.length > 1 ? "s" : ""})
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {formatCents(selectedTotalCents)}
                </p>
                {selectedItems.length === 0 && remainingItems.length > 0 && (
                  <p className="text-[11px] text-brown-light mt-1">
                    Restant à encaisser :{" "}
                    <span className="font-bold text-brown">
                      {formatCents(remainingItemsTotal)}
                    </span>{" "}
                    sur {remainingItems.length} item
                    {remainingItems.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItemIds(new Set())}
                    className="h-11 px-3 rounded-xl text-xs font-semibold text-brown-light hover:text-brown transition"
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedItems.length === 0 || paymentBusy}
                  onClick={() =>
                    requestPayment(
                      selectedTotalCents,
                      selectedItems.map((it) => it.id)
                    )
                  }
                  className="h-11 px-5 rounded-xl bg-brown text-cream font-bold text-sm hover:bg-brown-light disabled:opacity-40 transition active:scale-95 inline-flex items-center gap-2"
                >
                  💳 Encaisser cette part
                </button>
              </div>
            </div>

            {remainingItems.length === 1 && selectedItems.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  requestPayment(
                    remainingCents,
                    remainingItems.map((it) => it.id)
                  )
                }
                className="mt-3 w-full h-11 rounded-xl bg-gold/20 border border-gold/40 text-brown font-bold text-sm hover:bg-gold/30 transition inline-flex items-center justify-center gap-2"
              >
                Encaisser le dernier item · {formatCents(remainingCents)}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Receipts — one card on screen if split=1, N stacked + page-break for print. */}
      {shares.map((shareCents, shareIdx) => (
      <div
        key={shareIdx}
        className="receipt max-w-md mx-auto my-6 md:my-10 bg-white-warm border border-terracotta/40 rounded-2xl shadow-xl shadow-brown/10 px-6 py-8 font-[family-name:var(--font-body)]"
      >
        {/* Header */}
        <div className="text-center">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-2xl leading-none">
            {branding.name}
          </p>
          {branding.tagline && (
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-brown font-semibold">
              {branding.tagline}
            </h1>
          )}
          {(addressLines.length > 0 || contactLine) && (
            <p className="text-[11px] text-brown-light mt-1 leading-tight">
              {addressLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {(i < addressLines.length - 1 || contactLine) && <br />}
                </span>
              ))}
              {contactLine && <span>{contactLine}</span>}
            </p>
          )}
          {splitActive && (
            <p className="mt-3 inline-block text-[10px] uppercase tracking-[0.22em] font-bold bg-brown text-cream px-3 py-1 rounded-full">
              Part {shareIdx + 1} / {splitCount}
            </p>
          )}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-terracotta-deep to-transparent" />
        </div>

        {/* Metadata */}
        <dl className="grid grid-cols-2 gap-y-1 text-xs text-brown">
          <dt className="text-brown-light">Date</dt>
          <dd className="text-right tabular-nums">
            {dateLabel} · {timeLabel}
          </dd>
          <dt className="text-brown-light">
            {order.table_number ? "Table" : "Type"}
          </dt>
          <dd className="text-right">
            {order.table_number
              ? `N° ${order.table_number} · ${order.guest_count} couvert${order.guest_count > 1 ? "s" : ""}`
              : order.source === "delivery"
                ? "Livraison"
                : "À emporter"}
          </dd>
          {order.staff_name && (
            <>
              <dt className="text-brown-light">Serveur</dt>
              <dd className="text-right">{order.staff_name}</dd>
            </>
          )}
          <dt className="text-brown-light">Durée</dt>
          <dd className="text-right tabular-nums">
            {formatDuration(minutesSince(order.created_at))}
          </dd>
          <dt className="text-brown-light">Commande</dt>
          <dd className="text-right font-mono text-[10px]">
            #{order.id.slice(0, 8).toUpperCase()}
          </dd>
        </dl>

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-terracotta-deep to-transparent" />

        {/* Items */}
        <ul className="space-y-2 text-sm">
          {activeItems.map((i) => (
            <li key={i.id} className="flex items-start gap-3">
              <span className="tabular-nums text-brown-light w-6 shrink-0">
                {i.quantity}×
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-brown leading-snug">{i.menu_item_name}</p>
                {i.modifiers && i.modifiers.length > 0 && (
                  <p className="text-[10px] text-brown-light italic leading-snug">
                    {i.modifiers.join(" · ")}
                  </p>
                )}
              </div>
              <span className="tabular-nums text-brown font-semibold shrink-0">
                {formatCents(i.price_cents * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-terracotta-deep to-transparent" />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-brown-light">
            <span>Sous-total HT</span>
            <span className="tabular-nums">
              {formatCents(order.subtotal_cents)}
            </span>
          </div>
          <div className="flex justify-between text-brown-light">
            <span>TVA {taxRate}&nbsp;%</span>
            <span className="tabular-nums">{formatCents(order.tax_cents)}</span>
          </div>
          {order.tip_cents > 0 && (
            <div className="flex justify-between text-brown-light">
              <span>Pourboire</span>
              <span className="tabular-nums">
                {formatCents(order.tip_cents)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-terracotta/40">
            <span className="text-brown font-semibold">Total TTC</span>
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
              {formatCents(order.total_cents + order.tip_cents)}
            </span>
          </div>

          {splitActive && (
            <div className="mt-3 rounded-xl bg-gold/10 border border-gold/30 px-4 py-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
                  Votre part ({shareIdx + 1} / {splitCount})
                </span>
                <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {formatCents(shareCents)}
                </span>
              </div>
              {!sharesEqual && (
                <p className="mt-1 text-[10px] text-brown-light/80 italic leading-snug">
                  Le total se partageant en {splitCount} parts non strictement
                  égales, la première absorbe l&apos;arrondi (différence ≤ 1 ct
                  par part).
                </p>
              )}
            </div>
          )}

          {order.payment_method && (
            <p className="text-xs text-brown-light text-right mt-1">
              Payée en{" "}
              {order.payment_method === "card"
                ? "CB"
                : order.payment_method === "cash"
                  ? "espèces"
                  : order.payment_method === "ticket_resto"
                    ? "ticket resto"
                    : "autre"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="h-px bg-gradient-to-r from-transparent via-terracotta-deep to-transparent" />
          <p className="mt-4 font-[family-name:var(--font-script)] text-gold text-xl">
            Merci de votre visite
          </p>
          <p className="mt-1 text-[10px] text-brown-light tracking-wide">
            À bientôt chez {branding.name}
          </p>
          {legalLine && (
            <p className="mt-4 text-[9px] text-brown-light/60">{legalLine}</p>
          )}
        </div>
      </div>
      ))}

      {/* ─── Payment method modal (mode items + ad hoc partial payments) ── */}
      <AnimatePresence>
        {paymentMethodModal && (
          <PaymentMethodModal
            amountCents={paymentMethodModal.amountCents}
            busy={paymentBusy}
            onCancel={() => setPaymentMethodModal(null)}
            onConfirm={confirmPayment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAYMENT METHOD MODAL — Espèces / CB / Ticket Resto / Autre
   ════════════════════════════════════════════════════════════ */
function PaymentMethodModal({
  amountCents,
  busy,
  onCancel,
  onConfirm,
}: {
  amountCents: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (method: PaymentMethod, tipCents: number) => void;
}) {
  const [tipPct, setTipPct] = useState<0 | 5 | 10 | 15>(0);
  const tipCents = useMemo(
    () => Math.round((amountCents * tipPct) / 100),
    [amountCents, tipPct]
  );
  const grand = amountCents + tipCents;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full z-50"
        role="dialog"
        aria-modal
      >
        <div className="bg-white-warm rounded-3xl shadow-2xl border border-terracotta/30 p-6">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-brown-light font-bold">
              Encaissement
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown mt-1 tabular-nums">
              {formatCents(grand)}
            </p>
            {tipPct > 0 && (
              <p className="text-xs text-brown-light mt-1">
                {formatCents(amountCents)} + {formatCents(tipCents)} pourboire
              </p>
            )}
          </div>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold mb-2">
              Pourboire
            </p>
            <div className="flex items-center gap-1.5">
              {([0, 5, 10, 15] as const).map((pct) => {
                const active = tipPct === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipPct(pct)}
                    className={[
                      "flex-1 h-10 rounded-lg text-xs font-bold transition border",
                      active
                        ? "bg-gold text-brown border-gold shadow"
                        : "bg-cream text-brown-light border-terracotta/30 hover:border-terracotta/60",
                    ].join(" ")}
                  >
                    {pct === 0 ? "Sans" : `+${pct}%`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold mb-2">
              Méthode
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onConfirm(opt.key, tipCents)}
                  disabled={busy}
                  className="h-14 rounded-xl bg-cream border-2 border-terracotta/30 hover:border-gold hover:bg-gold/10 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2 text-brown font-semibold"
                >
                  <span aria-hidden className="text-xl">
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-5 h-10 rounded-lg text-sm text-brown-light hover:text-brown transition"
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </>
  );
}
