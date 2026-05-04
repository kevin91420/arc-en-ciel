/**
 * POST /api/admin/telephony/busy
 * Body : { active: boolean, duration_minutes?: number }
 *
 * Toggle live "Busy mode" — quand activé, l'IA prend tous les appels.
 * Auto-reset après duration_minutes (default 120 = 2h, pour pas qu'on
 * oublie de désactiver).
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { setBusyOverride } from "@/lib/db/phone-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { active?: unknown; duration_minutes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const active = Boolean(body.active);
  const durationMinutes = Math.max(
    5,
    Math.min(720, Number(body.duration_minutes) || 120)
  );

  try {
    const result = await setBusyOverride(active, durationMinutes);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
