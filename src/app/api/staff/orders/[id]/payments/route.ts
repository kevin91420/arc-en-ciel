/**
 * GET  /api/staff/orders/[id]/payments — list payments for the order.
 * POST /api/staff/orders/[id]/payments — record a new partial payment.
 *
 * The Supabase trigger auto-finalizes the parent order when the cumulative
 * payment amount covers `orders.total_cents`. The API just records rows.
 *
 * Body for POST :
 *   {
 *     amount_cents: number,
 *     method: 'cash' | 'card' | 'ticket_resto' | 'other',
 *     tip_cents?: number,
 *     item_ids?: string[],   // soft link to which items this payment covered
 *     notes?: string,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  addPayment,
  getOrder,
  listPaymentsForOrder,
} from "@/lib/db/pos-client";
import type { PaymentMethod } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_METHODS: ReadonlySet<PaymentMethod> = new Set([
  "cash",
  "card",
  "ticket_resto",
  "other",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  try {
    const [order, payments] = await Promise.all([
      getOrder(id),
      listPaymentsForOrder(id),
    ]);
    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }
    const totalPaidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
    return NextResponse.json({
      order,
      payments,
      total_paid_cents: totalPaidCents,
      remaining_cents: Math.max(0, order.total_cents - totalPaidCents),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger les paiements : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  let body: {
    amount_cents?: unknown;
    tip_cents?: unknown;
    method?: unknown;
    item_ids?: unknown;
    notes?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount_cents);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json(
      { error: "amount_cents invalide (entier > 0 attendu)" },
      { status: 400 }
    );
  }

  const method =
    typeof body.method === "string"
      ? (body.method as PaymentMethod)
      : ("other" as PaymentMethod);
  if (!VALID_METHODS.has(method)) {
    return NextResponse.json(
      { error: `method doit être : cash, card, ticket_resto, other` },
      { status: 400 }
    );
  }

  const tip = Number(body.tip_cents ?? 0);
  const tipCents =
    Number.isFinite(tip) && tip >= 0 && tip < 100_000 ? Math.round(tip) : 0;

  const itemIds =
    Array.isArray(body.item_ids) &&
    body.item_ids.every((x: unknown) => typeof x === "string")
      ? (body.item_ids as string[]).slice(0, 200)
      : [];

  const notes =
    typeof body.notes === "string" ? body.notes.slice(0, 200) : undefined;

  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }
    /* Sanity: don't allow paying more than what's left. */
    const existing = await listPaymentsForOrder(id);
    const alreadyPaid = existing.reduce((s, p) => s + p.amount_cents, 0);
    const remaining = Math.max(0, order.total_cents - alreadyPaid);
    if (Math.round(amount) > remaining) {
      return NextResponse.json(
        {
          error: `Le montant dépasse le restant dû (${(remaining / 100).toFixed(2)} €).`,
          remaining_cents: remaining,
        },
        { status: 409 }
      );
    }

    const payment = await addPayment(id, {
      amount_cents: Math.round(amount),
      tip_cents: tipCents,
      method,
      item_ids: itemIds,
      notes,
    });

    /* Re-fetch order after the trigger has had a chance to finalize it. */
    const refreshed = await getOrder(id);
    const allPayments = await listPaymentsForOrder(id);
    const totalPaid = allPayments.reduce((s, p) => s + p.amount_cents, 0);
    return NextResponse.json({
      payment,
      order: refreshed,
      payments: allPayments,
      total_paid_cents: totalPaid,
      remaining_cents: Math.max(
        0,
        (refreshed?.total_cents ?? 0) - totalPaid
      ),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer le paiement : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
