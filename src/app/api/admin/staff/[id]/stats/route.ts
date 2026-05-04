/**
 * GET /api/admin/staff/[id]/stats?period=day|week|month|year
 *
 * Renvoie les stats individuelles d'un staff sur la période demandée.
 * Inclut : CA, commandes, couverts, panier moyen, pourboires, top items,
 * évolution journalière, classement vs équipe.
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStaffById,
  getStaffStats,
  type StaffStatsPeriod,
} from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

const VALID_PERIODS: ReadonlySet<StaffStatsPeriod> = new Set([
  "day",
  "week",
  "month",
  "year",
]);

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ||
    "month") as StaffStatsPeriod;

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: "period invalide (day|week|month|year)" },
      { status: 400 }
    );
  }

  try {
    /* Vérifie que le staff existe (404 propre si pas trouvé). */
    const staff = await getStaffById(id);
    if (!staff) {
      return NextResponse.json(
        { error: "Staff introuvable" },
        { status: 404 }
      );
    }

    const stats = await getStaffStats(id, period);
    return NextResponse.json({ staff, stats });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
