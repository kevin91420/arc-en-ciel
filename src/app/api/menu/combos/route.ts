/**
 * GET /api/menu/combos?card_id=… — Public read of combos for the given card.
 *
 * Used by the QR menu and the POS to surface formulas. Active only.
 */

import { NextRequest, NextResponse } from "next/server";
import { listCombos } from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cardId = url.searchParams.get("card_id") || undefined;
  try {
    const combos = await listCombos({ cardId, includeInactive: false });
    return NextResponse.json(
      { combos },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
