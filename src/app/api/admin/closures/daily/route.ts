/**
 * GET  /api/admin/closures/daily?date=YYYY-MM-DD — récupère le statut/clôture
 * POST /api/admin/closures/daily                  — clôture une journée (manager)
 *
 * Le POST capture le snapshot Z à l'instant T et le fige en JSONB pour audit.
 *
 * Protégé par cookie admin (cf. proxy).
 * Le POST ajoute un guard "stats.z_report" — manager only via permissions.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createDailyClosure,
  getDailyStatus,
  listRecentClosures,
} from "@/lib/db/closures-client";
import { withPermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const recent = url.searchParams.get("recent");

  try {
    if (recent === "1") {
      const closures = await listRecentClosures(30);
      return NextResponse.json({ closures, count: closures.length });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Paramètre 'date' requis (format YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const status = await getDailyStatus(date);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  /* Sprint 7b — Clôturer une journée nécessite la perm 'stats.z_report'.
   * Manager only. Le staff_id du manager est auto-injecté pour audit. */
  const guard = await withPermission("stats.z_report");
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const date = String(body.service_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "service_date requis (format YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  /* Pas de clôture future */
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) {
    return NextResponse.json(
      { error: "Impossible de clôturer une date future." },
      { status: 400 }
    );
  }

  try {
    const closure = await createDailyClosure({
      service_date: date,
      closed_by_staff_id: guard.staff.id,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 500) || undefined
          : undefined,
    });
    return NextResponse.json({ closure }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || "Erreur";
    /* Cas spécial : déjà clôturé → 409 */
    if (msg.toLowerCase().includes("déjà clôturée")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
