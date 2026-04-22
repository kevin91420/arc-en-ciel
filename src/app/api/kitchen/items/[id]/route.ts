/**
 * PATCH /api/kitchen/items/[id] — Update a single order_item status from the
 * kitchen display.
 *
 * Body: { status: "cooking" | "ready" | "served" | "pending" | "cancelled" }
 *
 * Protection: staff cookie (arc_staff_auth) — enforced in src/proxy.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { updateItemStatus } from "@/lib/db/pos-client";
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
