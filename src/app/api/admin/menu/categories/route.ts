/**
 * GET    /api/admin/menu/categories — list (incl. inactive)
 * POST   /api/admin/menu/categories — upsert (id required, slug-style)
 *
 * Auth : admin cookie (proxy.ts gates /api/admin/*).
 */

import { NextRequest, NextResponse } from "next/server";
import { getMenu, upsertCategory } from "@/lib/db/menu-client";
import type { MenuCategoryRow } from "@/lib/db/menu-types";
import type { Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_STATIONS: Station[] = [
  "main",
  "pizza",
  "grill",
  "cold",
  "dessert",
  "bar",
];

export async function GET() {
  try {
    const menu = await getMenu({ includeInactive: true });
    const categories = menu.map(({ items: _items, modifiers: _mods, ...cat }) => {
      void _items;
      void _mods;
      return cat;
    });
    return NextResponse.json({ categories });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<MenuCategoryRow>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (body.id || "").trim();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) {
    return NextResponse.json(
      {
        error: 'id invalide ("a-z 0-9 -", 2-40 caractères, ex. "pizzas")',
      },
      { status: 400 }
    );
  }
  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "title requis" }, { status: 400 });
  }
  const station: Station = VALID_STATIONS.includes(body.station as Station)
    ? (body.station as Station)
    : "main";

  try {
    const row = await upsertCategory({
      id,
      number: (body.number || "01").toString().slice(0, 4),
      title: title.slice(0, 80),
      subtitle: body.subtitle?.toString().slice(0, 120) || null,
      intro: body.intro?.toString().slice(0, 500) || null,
      icon: (body.icon || "🍽").toString().slice(0, 8),
      station,
      position: Number.isFinite(body.position)
        ? Math.max(0, Math.min(999, Math.floor(body.position as number)))
        : 0,
      active: body.active !== false,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
