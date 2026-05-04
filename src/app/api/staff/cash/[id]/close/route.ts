/**
 * POST /api/staff/cash/[id]/close
 *   Body : {
 *     actual_cash_cents: number,
 *     notes?: string,
 *     cash_breakdown?: CashBreakdown   // Sprint 7b QW#5 — comptage détaillé
 *   }
 *
 * Computes expected cash (open + takings) and the variance, then locks the
 * session. Used by /staff/caisse "Fermer la caisse" button.
 *
 * Si `cash_breakdown` est fourni, le total est recalculé côté serveur depuis
 * le détail des dénominations (override de actual_cash_cents pour cohérence).
 */

import { NextRequest, NextResponse } from "next/server";
import { closeCashSession } from "@/lib/db/pos-client";
import { withPermission } from "@/lib/auth/guards";
import type { CashBreakdown } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  /* Sprint 7b QW#9 — Fermer la caisse implique réconciliation comptable.
   * Manager + Server peuvent (les serveurs gèrent leur fond). Chef non. */
  const guard = await withPermission("cash.close");
  if (!guard.ok) return guard.response;

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

  /* Validation soft du breakdown — le sanitize côté pos-client fera le reste. */
  let breakdown: CashBreakdown | undefined;
  if (body.cash_breakdown && typeof body.cash_breakdown === "object") {
    breakdown = body.cash_breakdown as CashBreakdown;
  }

  try {
    const session = await closeCashSession(id, {
      actual_cash_cents: Math.round(actual),
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 200) || undefined
          : undefined,
      cash_breakdown: breakdown,
    });
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
