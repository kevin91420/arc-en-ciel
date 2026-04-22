/**
 * POST /api/staff/orders/[id]/pay — mark an order paid.
 *   Body: { method: "cash" | "card" | "ticket_resto" | "other", tip_cents?: number }
 *   Returns the final order (status = "paid").
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrder, payOrder } from "@/lib/db/pos-client";
import type { PaymentMethod } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const METHODS: PaymentMethod[] = ["cash", "card", "ticket_resto", "other"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { method?: unknown; tip_cents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.method !== "string" ||
    !METHODS.includes(body.method as PaymentMethod)
  ) {
    return NextResponse.json(
      { error: `method doit être parmi: ${METHODS.join(", ")}` },
      { status: 400 }
    );
  }

  let tipCents = 0;
  if (body.tip_cents !== undefined && body.tip_cents !== null) {
    if (
      typeof body.tip_cents !== "number" ||
      !Number.isFinite(body.tip_cents) ||
      body.tip_cents < 0 ||
      body.tip_cents > 100_000
    ) {
      return NextResponse.json(
        { error: "tip_cents invalide (0 à 100000)" },
        { status: 400 }
      );
    }
    tipCents = Math.round(body.tip_cents);
  }

  try {
    await payOrder(id, body.method as PaymentMethod, tipCents);
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to pay order: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
