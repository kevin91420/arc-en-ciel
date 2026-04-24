/**
 * PATCH  /api/staff/orders/[id]/items/[itemId] — update an order item.
 *        Body: {
 *          status?:    "pending" | "cooking" | "ready" | "served" | "cancelled",
 *          quantity?:  integer 1..50,   // only while pending
 *          modifiers?: string[],        // only while pending
 *          notes?:     string | null,   // only while pending
 *        }
 *        Returns the updated order (with items + recomputed totals).
 *        409 Conflict if the caller tries to edit quantity/modifiers/notes on
 *        an item whose status has already advanced past `pending`.
 *
 * DELETE /api/staff/orders/[id]/items/[itemId] — remove an item from the order
 *        (only sensible while pending; caller is expected to check first).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  ItemNotPendingError,
  removeItem,
  updateItem,
  type UpdateItemPayload,
} from "@/lib/db/pos-client";
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

  let body: {
    status?: unknown;
    quantity?: unknown;
    modifiers?: unknown;
    notes?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: UpdateItemPayload = {};

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !ITEM_STATUSES.includes(body.status as OrderItemStatus)
    ) {
      return NextResponse.json(
        { error: `status doit être parmi: ${ITEM_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = body.status as OrderItemStatus;
  }

  if (body.quantity !== undefined) {
    if (
      typeof body.quantity !== "number" ||
      !Number.isFinite(body.quantity) ||
      !Number.isInteger(body.quantity) ||
      body.quantity < 1 ||
      body.quantity > 50
    ) {
      return NextResponse.json(
        { error: "quantity doit être un entier entre 1 et 50" },
        { status: 400 }
      );
    }
    updates.quantity = body.quantity;
  }

  if (body.modifiers !== undefined) {
    if (
      !Array.isArray(body.modifiers) ||
      !body.modifiers.every((m) => typeof m === "string")
    ) {
      return NextResponse.json(
        { error: "modifiers doit être un tableau de strings" },
        { status: 400 }
      );
    }
    updates.modifiers = body.modifiers as string[];
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { error: "notes doit être une string ou null" },
        { status: 400 }
      );
    }
    updates.notes = body.notes as string | null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour (status, quantity, modifiers, notes)" },
      { status: 400 }
    );
  }

  try {
    await updateItem(itemId, updates);
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof ItemNotPendingError) {
      return NextResponse.json(
        {
          error:
            "L'item n'est plus modifiable — le chef a déjà commencé. Ajoutez une nouvelle ligne.",
          code: "ITEM_NOT_PENDING",
          current_status: err.currentStatus,
        },
        { status: 409 }
      );
    }
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
