/**
 * PATCH  /api/staff/orders/[id]/items/[itemId] — update item status.
 *        Body: { status: "pending" | "cooking" | "ready" | "served" | "cancelled" }
 * DELETE /api/staff/orders/[id]/items/[itemId] — remove an item from the order
 *        (only sensible while pending; caller is expected to check first).
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrder, removeItem, updateItemStatus } from "@/lib/db/pos-client";
import type { OrderItemStatus } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const ITEM_STATUSES: OrderItemStatus[] = [
  "pending",
  "cooking",
  "ready",
  "served",
  "cancelled",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  if (!id || !itemId) {
    return NextResponse.json({ error: "id/itemId required" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.status !== "string" ||
    !ITEM_STATUSES.includes(body.status as OrderItemStatus)
  ) {
    return NextResponse.json(
      { error: `status doit être parmi: ${ITEM_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await updateItemStatus(itemId, body.status as OrderItemStatus);
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update item: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  if (!id || !itemId) {
    return NextResponse.json({ error: "id/itemId required" }, { status: 400 });
  }
  try {
    await removeItem(itemId);
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to remove item: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
