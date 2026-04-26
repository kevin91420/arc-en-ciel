/**
 * GET /api/admin/menu/cards — list all cards (incl. inactive)
 * POST /api/admin/menu/cards — upsert a card (id required)
 *
 * Body POST:
 *   { id, name, active?, is_default?, schedule_start?, schedule_end?,
 *     schedule_days?, position? }
 */

import { NextRequest, NextResponse } from "next/server";
import type { MenuCardRow } from "@/lib/db/menu-types";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase non configuré");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function GET() {
  try {
    const cards = await sb<MenuCardRow[]>(
      `menu_cards?select=*&order=position.asc`
    );
    return NextResponse.json({ cards });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<MenuCardRow>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (body.id || "").trim();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) {
    return NextResponse.json(
      { error: 'id invalide (slug-style "a-z 0-9 -")' },
      { status: 400 }
    );
  }
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }

  const days = Array.isArray(body.schedule_days)
    ? (body.schedule_days as string[])
        .filter((d) =>
          ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(d)
        )
    : null;

  try {
    const [row] = await sb<MenuCardRow[]>(`menu_cards`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id,
        name: name.slice(0, 60),
        active: body.active !== false,
        is_default: Boolean(body.is_default),
        schedule_start: body.schedule_start || null,
        schedule_end: body.schedule_end || null,
        schedule_days: days,
        position: Number.isFinite(body.position)
          ? Math.max(0, Math.min(99, Math.floor(body.position as number)))
          : 0,
      }),
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
