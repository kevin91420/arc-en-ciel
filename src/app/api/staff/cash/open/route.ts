/**
 * POST /api/staff/cash/open
 *   Body : { opening_amount_cents: number, notes?: string }
 *
 * Refuses if a session is already open.
 */

import { NextRequest, NextResponse } from "next/server";
import { openCashSession } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.opening_amount_cents);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_00) {
    return NextResponse.json(
      { error: "opening_amount_cents invalide (0..100000000)" },
      { status: 400 }
    );
  }

  try {
    const session = await openCashSession({
      opening_amount_cents: Math.round(amount),
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 200) || undefined
          : undefined,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 409 }
    );
  }
}
