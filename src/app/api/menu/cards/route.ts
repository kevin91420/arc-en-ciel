/**
 * GET /api/menu/cards — Public read of the active cards list.
 *
 * Used by the admin / staff UIs to know which menu sub-cards exist
 * (Midi / Soir / Weekend) and decide which one to display.
 */

import { NextResponse } from "next/server";
import type { MenuCardRow } from "@/lib/db/menu-types";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchCards(): Promise<MenuCardRow[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return [
      {
        id: "default",
        name: "Carte principale",
        active: true,
        is_default: true,
        position: 0,
      } as MenuCardRow,
    ];
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_cards?select=*&active=eq.true&order=position.asc`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  return res.json() as Promise<MenuCardRow[]>;
}

export async function GET() {
  try {
    const cards = await fetchCards();
    /* Always include "default" so consumers can rely on it. */
    if (!cards.find((c) => c.id === "default")) {
      cards.unshift({
        id: "default",
        name: "Carte principale",
        active: true,
        is_default: true,
        position: 0,
      } as MenuCardRow);
    }
    return NextResponse.json(
      { cards },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
