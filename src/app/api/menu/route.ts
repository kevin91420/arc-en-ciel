/**
 * GET /api/menu — Public, cached read of the catalogue.
 *
 * Used by /carte (public site), /m/carte (QR menu), and the POS / KDS via
 * the useMenu hook. Falls back to the static CARTE constant when the DB is
 * empty so a fresh tenant never serves a blank page.
 *
 * Optional query : `?include_inactive=1` for admin previews.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMenu } from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("include_inactive") === "1";
  try {
    const menu = await getMenu({ includeInactive });
    return NextResponse.json(menu, {
      headers: includeInactive
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger le menu : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
