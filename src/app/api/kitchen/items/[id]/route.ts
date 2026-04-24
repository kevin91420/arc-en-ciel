/**
 * PATCH /api/kitchen/items/[id] — Update a single order_item status from the
 * kitchen display.
 *
 * Body: { status: "cooking" | "ready" | "served" | "pending" | "cancelled" }
 *
 * Station guard:
 *   If the request carries an `X-Station` header with a station other than
 *   "all", the server fetches the item and refuses the update unless the
 *   item's station matches. This is the server-side counterpart to the
 *   station-specific KDS pages and makes it impossible for e.g. the Pizza
 *   screen to mark a grill plate as ready even if the client is tampered
 *   with.
 *
 * Protection: staff cookie (arc_staff_auth) — enforced in src/proxy.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrderItem, updateItemStatus } from "@/lib/db/pos-client";
import type { OrderItemStatus, Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const ITEM_STATUSES: OrderItemStatus[] = [
  "pending",
  "cooking",
  "ready",
  "served",
  "cancelled",
];

const STATIONS: Station[] = ["main", "pizza", "grill", "cold", "dessert", "bar"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const status = body?.status;
  if (
    typeof status !== "string" ||
    !ITEM_STATUSES.includes(status as OrderItemStatus)
  ) {
    return NextResponse.json(
      {
        error: `status must be one of: ${ITEM_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  /* ── Station guard ────────────────────────────────────────
   * When the client is locked to a single station (X-Station header set to
   * anything other than "all"), we fetch the item and refuse updates that
   * cross station boundaries. Missing header = legacy `/kitchen` (all).
   */
  const stationHeader = req.headers.get("x-station");
  if (stationHeader && stationHeader !== "all") {
    if (!STATIONS.includes(stationHeader as Station)) {
      return NextResponse.json(
        { error: `Invalid X-Station header: ${stationHeader}` },
        { status: 400 }
      );
    }
    const item = await getOrderItem(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.station !== stationHeader) {
      return NextResponse.json(
        {
          error: `Station mismatch — this item belongs to ${item.station}, not ${stationHeader}.`,
        },
        { status: 403 }
      );
    }
  }

  try {
    await updateItemStatus(id, status as OrderItemStatus);
    return NextResponse.json({ ok: true, id, status }, { status: 200 });
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
