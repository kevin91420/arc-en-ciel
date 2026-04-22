/**
 * GET /api/admin/loyalty — Liste toutes les cartes + stats (admin-only)
 */
import { NextResponse } from "next/server";
import { listAllCards, getLoyaltyStats } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cards, stats] = await Promise.all([listAllCards(), getLoyaltyStats()]);
    return NextResponse.json({ cards, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
