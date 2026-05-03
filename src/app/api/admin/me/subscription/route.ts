/**
 * GET /api/admin/me/subscription — Statut d'abonnement du tenant courant.
 *
 * Renvoie le strict minimum nécessaire au footer admin :
 *   - status (trial / active / past_due / canceled / expired)
 *   - trial_ends_at (date ISO ou null)
 *
 * Protégé par cookie admin (cf. proxy).
 */

import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenant = await getCurrentTenant();
    return NextResponse.json({
      status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
