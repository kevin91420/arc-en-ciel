/**
 * GET /api/admin/staff/leaderboard?period=month
 *
 * Top 10 des staffs par CA pour la période demandée. Utilisé pour la
 * section "Classement du mois" sur /admin/staff (gamification équipe).
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStaffLeaderboard,
  type StaffStatsPeriod,
} from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

const VALID_PERIODS: ReadonlySet<StaffStatsPeriod> = new Set([
  "day",
  "week",
  "month",
  "year",
]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ||
    "month") as StaffStatsPeriod;

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: "period invalide" },
      { status: 400 }
    );
  }

  try {
    const leaderboard = await getStaffLeaderboard(period);
    return NextResponse.json({
      period,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
