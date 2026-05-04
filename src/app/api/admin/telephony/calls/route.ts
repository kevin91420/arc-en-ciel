/**
 * GET /api/admin/telephony/calls?callback_pending=1
 *
 * Liste les appels avec filtres (callback en attente, période).
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { listPhoneCalls } from "@/lib/db/phone-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const callbackPending = url.searchParams.get("callback_pending") === "1";
  const since = url.searchParams.get("since"); // ISO

  try {
    const calls = await listPhoneCalls({
      callbackPending,
      sinceISO: since || undefined,
      limit: 500,
    });
    return NextResponse.json({ calls, count: calls.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
