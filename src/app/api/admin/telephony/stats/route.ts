/**
 * GET /api/admin/telephony/stats?days=30
 * Renvoie les stats agrégées sur les N derniers jours (défaut 30).
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPhoneCallStats } from "@/lib/db/phone-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.max(
    1,
    Math.min(365, Number(url.searchParams.get("days")) || 30)
  );
  const sinceISO = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const stats = await getPhoneCallStats({ sinceISO });
    return NextResponse.json({ ...stats, days });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
