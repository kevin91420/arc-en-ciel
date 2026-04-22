/**
 * POST /api/staff/orders/[id]/items — add items to an existing order.
 *   Body: { items: [{ menu_item_id, menu_item_name, price_cents, quantity?,
 *                      modifiers?, notes?, station?, menu_item_category? }] }
 *   Returns the updated order (with items + recomputed totals).
 */

import { NextRequest, NextResponse } from "next/server";
import { addItemsToOrder } from "@/lib/db/pos-client";
import type { AddItemsPayload, Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const STATIONS: Station[] = ["main", "pizza", "grill", "cold", "dessert", "bar"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Partial<AddItemsPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items: tableau non vide requis" },
      { status: 400 }
    );
  }

  /* Validate each item. Keep the shape lightweight — the server decides the
   * station fallback and clamps quantities. */
  const items: AddItemsPayload["items"] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    if (typeof r.menu_item_id !== "string" || !r.menu_item_id) {
      return NextResponse.json(
        { error: "menu_item_id manquant sur un item" },
        { status: 400 }
      );
    }
    if (typeof r.menu_item_name !== "string" || !r.menu_item_name) {
      return NextResponse.json(
        { error: "menu_item_name manquant sur un item" },
        { status: 400 }
      );
    }
    if (
      typeof r.price_cents !== "number" ||
      !Number.isInteger(r.price_cents) ||
      r.price_cents < 0
    ) {
      return NextResponse.json(
        {
          error: `price_cents invalide pour ${r.menu_item_name} (entier positif attendu)`,
        },
        { status: 400 }
      );
    }

    const quantity =
      typeof r.quantity === "number" && r.quantity > 0
        ? Math.min(50, Math.floor(r.quantity))
        : 1;

    let station: Station = "main";
    if (typeof r.station === "string" && STATIONS.includes(r.station as Station)) {
      station = r.station as Station;
    }

    const modifiers =
      Array.isArray(r.modifiers) && r.modifiers.every((m) => typeof m === "string")
        ? (r.modifiers as string[])
        : undefined;

    items.push({
      menu_item_id: r.menu_item_id,
      menu_item_name: r.menu_item_name,
      menu_item_category:
        typeof r.menu_item_category === "string"
          ? r.menu_item_category
          : undefined,
      price_cents: r.price_cents,
      quantity,
      modifiers,
      notes: typeof r.notes === "string" ? r.notes : undefined,
      station,
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Aucun item valide à ajouter" },
      { status: 400 }
    );
  }

  try {
    const updated = await addItemsToOrder(id, { items });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to add items: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
