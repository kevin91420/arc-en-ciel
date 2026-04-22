/**
 * GET /api/admin/prospects/stats — Agrégats par statut + taux de conversion.
 */

import { NextResponse } from "next/server";
import { getProspectStats } from "@/lib/db/prospects-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getProspectStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to load prospect stats: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
