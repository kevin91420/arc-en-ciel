/**
 * GET /api/staff/items/[itemId] — Fetch a single order_item plus its parent
 * order in one round-trip. Used by the runner ticket print view, which only
 * has the itemId in its URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrder, getOrderItem } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  if (!itemId) {
    return NextResponse.json({ error: "itemId requis" }, { status: 400 });
  }

  try {
    const item = await getOrderItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
    }
    const order = await getOrder(item.order_id);
    if (!order) {
      return NextResponse.json(
        { error: "Commande parente introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ item, order });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger l'item : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
