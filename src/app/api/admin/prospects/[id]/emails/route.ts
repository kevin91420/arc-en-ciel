/**
 * GET /api/admin/prospects/[id]/emails — Historique des emails envoyés
 * à ce prospect (depuis la table prospect_emails).
 */

import { NextRequest, NextResponse } from "next/server";
import { listProspectEmails } from "@/lib/db/prospects-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const rows = await listProspectEmails(id);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list prospect emails: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
