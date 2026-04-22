/**
 * GET  /api/staff/orders  — list all active (non-paid, non-cancelled) orders.
 * POST /api/staff/orders  — create a new order. Body:
 *                           { table_number?, source?, guest_count?, notes?, customer_id? }
 *                           staff_id is pulled from the cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrder, listActiveOrders } from "@/lib/db/pos-client";
import { STAFF_COOKIE } from "@/lib/staff-auth";
import type { CreateOrderPayload, OrderSource } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const ORDER_SOURCES: OrderSource[] = [
  "dine_in",
  "dine_in_qr",
  "takeaway",
  "delivery",
];

export async function GET() {
  try {
    const orders = await listActiveOrders();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list orders: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const staffId = req.cookies.get(STAFF_COOKIE)?.value;
  if (!staffId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<CreateOrderPayload>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  /* Validation — the DB is strict, user input might not be. */
  if (body.table_number !== undefined && body.table_number !== null) {
    if (
      typeof body.table_number !== "number" ||
      !Number.isInteger(body.table_number) ||
      body.table_number < 1 ||
      body.table_number > 50
    ) {
      return NextResponse.json(
        { error: "table_number doit être un entier entre 1 et 50" },
        { status: 400 }
      );
    }
  }

  if (body.source && !ORDER_SOURCES.includes(body.source)) {
    return NextResponse.json(
      { error: `source doit être parmi: ${ORDER_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }

  const guestCount =
    typeof body.guest_count === "number" && body.guest_count > 0
      ? Math.min(20, Math.floor(body.guest_count))
      : 1;

  try {
    const order = await createOrder({
      table_number: body.table_number ?? undefined,
      source: body.source || "dine_in",
      guest_count: guestCount,
      staff_id: staffId,
      customer_id: body.customer_id ?? undefined,
      notes: body.notes ?? undefined,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to create order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
