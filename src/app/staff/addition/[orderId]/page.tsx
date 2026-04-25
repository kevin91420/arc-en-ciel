"use client";

/**
 * /staff/addition/[orderId] — printable customer receipt.
 *
 * Simple, readable, print-friendly. The browser's native print dialog is
 * wired to window.print() and we ship a @media print style block inline so
 * only the receipt card prints (no header, no buttons).
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import type { OrderWithItems } from "@/lib/db/pos-types";

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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(1);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/staff/orders/${orderId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Commande introuvable");
        const data = (await res.json()) as OrderWithItems;
        if (!cancelled) {
          setOrder(data);
          /* Seed split count with the number of guests for dine-in. */
          setSplitCount(Math.max(1, data.guest_count || 1));
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

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

        {/* Split control */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream border border-terracotta/30 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-bold">
              Couverts
            </span>
            <button
              type="button"
              onClick={() =>
                setSplitCount((n) => Math.max(1, n - 1))
              }
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
              onClick={() =>
                setSplitCount((n) => Math.min(20, n + 1))
              }
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
        </div>
      </div>

      {/* Receipts — one card on screen if split=1, N stacked + page-break for print. */}
      {shares.map((shareCents, shareIdx) => (
      <div
        key={shareIdx}
        className="receipt max-w-md mx-auto my-6 md:my-10 bg-white-warm border border-terracotta/40 rounded-2xl shadow-xl shadow-brown/10 px-6 py-8 font-[family-name:var(--font-body)]"
      >
        {/* Header */}
        <div className="text-center">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-2xl leading-none">
            L&apos;Arc en Ciel
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-brown font-semibold">
            Pizzeria Méditerranéenne
          </h1>
          <p className="text-[11px] text-brown-light mt-1 leading-tight">
            12 rue des Oliviers · 91420 Morangis
            <br />
            01 23 45 67 89 · arc-en-ciel.fr
          </p>
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
            <span>TVA 10&nbsp;%</span>
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
            À bientôt chez L&apos;Arc en Ciel
          </p>
          <p className="mt-4 text-[9px] text-brown-light/60">
            TVA FR12 345 678 901 · SIRET 123 456 789 00012
          </p>
        </div>
      </div>
      ))}
    </div>
  );
}
