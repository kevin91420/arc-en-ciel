/**
 * DELETE /api/staff/orders/[id]/discounts/[discountId]
 *
 * Retire une remise d'une commande. Recalcule les totaux.
 * Refuse si la commande est déjà payée.
 *
 * Protégé par cookie staff.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  removeOrderDiscount,
} from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string; discountId: string }>;
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id, discountId } = await ctx.params;
  if (!id || !discountId) {
    return NextResponse.json(
      { error: "id et discountId requis" },
      { status: 400 }
    );
  }

  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }
    if (order.status === "paid") {
      return NextResponse.json(
        {
          error: "Impossible de modifier une remise sur une commande payée.",
        },
        { status: 409 }
      );
    }

    const result = await removeOrderDiscount(discountId);
    if (!result) {
      return NextResponse.json(
        { error: "Remise introuvable" },
        { status: 404 }
      );
    }

    const refreshed = await getOrder(id);
    return NextResponse.json({ ok: true, order: refreshed });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
