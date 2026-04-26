/**
 * GET /api/staff/cash/current
 *
 * Returns the open cash session (if any) plus the live takings since it
 * opened — used by /staff/caisse to show "expected cash" before closing.
 */

import { NextResponse } from "next/server";
import {
  computeCashTakingsSinceOpen,
  getCurrentCashSession,
} from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentCashSession();
    if (!session) return NextResponse.json({ session: null });
    const takings = await computeCashTakingsSinceOpen(session.opened_at);
    return NextResponse.json({
      session,
      takings_cents: takings,
      expected_cents: session.opening_amount_cents + takings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
