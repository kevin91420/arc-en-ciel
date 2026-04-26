/**
 * POST /api/staff/cash/[id]/close
 *   Body : { actual_cash_cents: number, notes?: string }
 *
 * Computes expected cash (open + takings) and the variance, then locks the
 * session. Used by /staff/caisse "Fermer la caisse" button.
 */

import { NextRequest, NextResponse } from "next/server";
import { closeCashSession } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const actual = Number(body.actual_cash_cents);
  if (!Number.isFinite(actual) || actual < 0) {
    return NextResponse.json(
      { error: "actual_cash_cents invalide" },
      { status: 400 }
    );
  }

  try {
    const session = await closeCashSession(id, {
      actual_cash_cents: Math.round(actual),
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 200) || undefined
          : undefined,
    });
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
