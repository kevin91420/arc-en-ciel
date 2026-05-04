/**
 * GET /api/admin/closures/calendar?year=2026&month=5
 *
 * Renvoie le statut journalier de tous les jours du mois (closed/open/empty).
 * Utilisé par la page /admin/cloture pour afficher le calendrier.
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { listDailyStatusesForMonth } from "@/lib/db/closures-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") || "0", 10);
  const month = parseInt(url.searchParams.get("month") || "0", 10);

  if (!year || year < 2020 || year > 2100) {
    return NextResponse.json(
      { error: "Paramètre 'year' invalide." },
      { status: 400 }
    );
  }
  if (!month || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Paramètre 'month' invalide (1-12)." },
      { status: 400 }
    );
  }

  try {
    const days = await listDailyStatusesForMonth(year, month);

    /* Stats agrégées du mois (rapide pour les badges) */
    const closed = days.filter((d) => d.status === "closed").length;
    const open = days.filter((d) => d.status === "open").length;
    const empty = days.filter((d) => d.status === "empty").length;

    return NextResponse.json({
      year,
      month,
      days,
      stats: { closed, open, empty, total: days.length },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
