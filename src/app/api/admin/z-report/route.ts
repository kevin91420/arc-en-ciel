/**
 * GET /api/admin/z-report?date=YYYY-MM-DD
 *
 * Z de fin de service — rapport quotidien complet :
 *   - Totals : CA HT/TTC, TVA, pourboires, ticket moyen
 *   - Ventilation par méthode de paiement
 *   - Performance par serveur
 *   - Top plats vendus
 *   - Heatmap par heure
 *   - Sessions de caisse + écart
 *   - Annulations / remboursements
 */

import { NextRequest, NextResponse } from "next/server";
import { getZReport } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const isoDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : todayISO();

  try {
    const report = await getZReport(isoDate);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
