/**
 * POST /api/staff/orders/[id]/items/[itemId]/ack
 *
 * Marks a `ready` item as picked up by the server (sets acknowledged_at).
 * The chef sees "parti en salle" without forcing the row into "served"
 * — that final status remains explicit (the customer might flag a problem
 * before the cycle closes).
 */

import { NextRequest, NextResponse } from "next/server";
import { acknowledgeItem, getOrder } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  if (!id || !itemId) {
    return NextResponse.json(
      { error: "id et itemId requis" },
      { status: 400 }
    );
  }

  try {
    const updatedItem = await acknowledgeItem(itemId);
    if (!updatedItem) {
      return NextResponse.json(
        { error: "Item introuvable" },
        { status: 404 }
      );
    }
    /* Return the full order so the POS / KDS can sync in one round-trip. */
    const order = await getOrder(id);
    return NextResponse.json(order ?? { item: updatedItem });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de confirmer le plat : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
