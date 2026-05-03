/**
 * GET /api/admin/vouchers/stats — Stats globales pour le dashboard avoirs.
 * Protégé par cookie admin.
 */

import { NextResponse } from "next/server";
import { getVoucherStats } from "@/lib/db/vouchers-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getVoucherStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
