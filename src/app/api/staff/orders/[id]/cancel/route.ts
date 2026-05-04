/**
 * POST /api/staff/orders/[id]/cancel — Annulation / remboursement.
 *
 * Body :
 *   {
 *     reason: 'error' | 'refused' | 'gesture' | 'other',
 *     notes?: string,
 *     refund_method?: 'cash' | 'card' | 'voucher' | 'none',
 *     refund_amount_cents?: number
 *   }
 *
 * Effets :
 *   - écrit une ligne d'audit dans order_cancellations
 *   - flippe orders.status à 'cancelled' (paid_at = null)
 *   - flippe order_items.status à 'cancelled' pour les lignes actives
 *   - si refund_method = cash/card → enregistre un paiement négatif
 *     pour réconcilier la caisse
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/lib/db/pos-client";
import { withPermission } from "@/lib/auth/guards";
import type {
  CancellationReason,
  RefundMethod,
} from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_REASONS: ReadonlySet<CancellationReason> = new Set([
  "error",
  "refused",
  "gesture",
  "other",
]);

const VALID_REFUNDS: ReadonlySet<RefundMethod> = new Set([
  "cash",
  "card",
  "voucher",
  "none",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  /* Sprint 7b QW#9 — Annulation = manager-only. Le serveur peut juste
   * supprimer un item pending, pas annuler une commande entière. */
  const guard = await withPermission("order.cancel");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reason = (body.reason as string)?.trim();
  if (!VALID_REASONS.has(reason as CancellationReason)) {
    return NextResponse.json(
      { error: 'reason requis : "error" | "refused" | "gesture" | "other"' },
      { status: 400 }
    );
  }
  const refundMethod =
    typeof body.refund_method === "string" &&
    VALID_REFUNDS.has(body.refund_method as RefundMethod)
      ? (body.refund_method as RefundMethod)
      : "none";

  const refundAmount = Number(body.refund_amount_cents ?? 0);
  if (!Number.isFinite(refundAmount) || refundAmount < 0) {
    return NextResponse.json(
      { error: "refund_amount_cents invalide" },
      { status: 400 }
    );
  }

  try {
    const cancellation = await cancelOrder(id, {
      reason: reason as CancellationReason,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 300) || undefined
          : undefined,
      refund_method: refundMethod,
      refund_amount_cents: Math.round(refundAmount),
      /* Audit : on enregistre qui a annulé pour traçabilité NF525 */
      staff_id: guard.staff.id,
    });
    return NextResponse.json(cancellation);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Annulation impossible : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
