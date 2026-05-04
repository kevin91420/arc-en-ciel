/**
 * GET  /api/staff/orders/[id]/discounts — liste les remises de la commande
 * POST /api/staff/orders/[id]/discounts — applique une nouvelle remise
 *
 * Body POST :
 *   { kind: 'percentage' | 'fixed', value_pct?: number, amount_cents?: number,
 *     reason: DiscountReason, notes?: string, applied_by_staff_id?: string }
 *
 * Protégé par cookie staff (cf. proxy).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  addOrderDiscount,
  getOrder,
  listDiscountsForOrder,
} from "@/lib/db/pos-client";
import { withPermission } from "@/lib/auth/guards";
import type { DiscountKind, DiscountReason } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_REASONS: ReadonlySet<DiscountReason> = new Set([
  "fidelite",
  "reclamation",
  "invitation",
  "happy_hour",
  "menu",
  "partenariat",
  "erreur",
  "autre",
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
    const discounts = await listDiscountsForOrder(id);
    return NextResponse.json({ discounts, count: discounts.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  /* Sprint 7b QW#9 — appliquer une remise nécessite la perm 'order.discount.apply'.
   * Manager + Server l'ont. Chef ne l'a pas. Permet d'enregistrer staff_id
   * pour audit (qui a appliqué la remise). */
  const guard = await withPermission("order.discount.apply");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const kind = body.kind as DiscountKind;
  if (kind !== "percentage" && kind !== "fixed") {
    return NextResponse.json(
      { error: "kind doit être 'percentage' ou 'fixed'" },
      { status: 400 }
    );
  }

  const reason = body.reason as DiscountReason;
  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json(
      { error: `reason invalide` },
      { status: 400 }
    );
  }

  /* Validation kind-specific */
  if (kind === "percentage") {
    const pct = Number(body.value_pct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json(
        { error: "value_pct doit être entre 0 et 100 (exclu pour 0)" },
        { status: 400 }
      );
    }
  } else {
    const cents = Number(body.amount_cents);
    if (!Number.isFinite(cents) || cents <= 0 || cents > 1_000_000) {
      return NextResponse.json(
        { error: "amount_cents doit être > 0" },
        { status: 400 }
      );
    }
  }

  try {
    /* Vérifie que la commande existe (auth via tenant) */
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    /* Refuse les remises sur commandes payées (immutable au-delà) */
    if (order.status === "paid") {
      return NextResponse.json(
        {
          error:
            "Impossible d'appliquer une remise sur une commande déjà payée.",
        },
        { status: 409 }
      );
    }

    const discount = await addOrderDiscount(id, {
      kind,
      value_pct:
        kind === "percentage" ? Number(body.value_pct) : undefined,
      amount_cents:
        kind === "fixed" ? Math.round(Number(body.amount_cents)) : undefined,
      reason,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 200) || undefined
          : undefined,
      /* Force le staff connecté comme auteur de la remise — empêche
       * un client mal-intentionné de mettre un autre staff_id dans le body. */
      applied_by_staff_id: guard.staff.id,
    });

    /* Re-fetch order pour renvoyer les nouveaux totaux */
    const refreshed = await getOrder(id);
    return NextResponse.json(
      { discount, order: refreshed },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
