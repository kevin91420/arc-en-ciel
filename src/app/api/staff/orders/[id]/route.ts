/**
 * GET    /api/staff/orders/[id] — full order with items.
 * PATCH  /api/staff/orders/[id] — update status (fired, ready, served, cancelled)
 *                                 or notes/customer_id.
 * DELETE /api/staff/orders/[id] — cancel (soft).
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/db/pos-client";
import type { OrderStatus } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: OrderStatus[] = [
  "open",
  "fired",
  "ready",
  "served",
  "paid",
  "cancelled",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.status || typeof body.status !== "string") {
    return NextResponse.json(
      { error: "status est requis" },
      { status: 400 }
    );
  }
  if (!ALLOWED_STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json(
      { error: `status doit être parmi: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await updateOrderStatus(id, body.status as OrderStatus);
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    await updateOrderStatus(id, "cancelled");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to cancel order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
