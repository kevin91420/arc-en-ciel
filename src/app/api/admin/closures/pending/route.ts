/**
 * GET /api/admin/closures/pending
 *
 * Renvoie la dernière journée non-clôturée mais ayant eu de l'activité
 * (cherche jusqu'à 7 jours en arrière). Utilisé par le banner d'alerte
 * sur le dashboard admin.
 *
 * Renvoie `{ pending: null }` si tout est en règle.
 *
 * Protégé par cookie admin.
 */

import { NextResponse } from "next/server";
import { getLatestPendingClosure } from "@/lib/db/closures-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pending = await getLatestPendingClosure();
    return NextResponse.json({ pending });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
