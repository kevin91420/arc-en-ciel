/**
 * POST /api/staff/orders/[id]/fire — fire all pending items to the kitchen.
 *   Moves each `pending` item to `cooking` and bumps the order to `fired`.
 *   Returns the updated order (with items).
 */

import { NextRequest, NextResponse } from "next/server";
import { fireOrder } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const updated = await fireOrder(id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fire order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
