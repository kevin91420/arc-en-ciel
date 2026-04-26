/**
 * POST /api/admin/menu/items — upsert a menu item.
 *   Body : MenuItemRow shape (id required, slug-style)
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertItem } from "@/lib/db/menu-client";
import type { MenuItemRow, DietaryTag } from "@/lib/db/menu-types";

export const dynamic = "force-dynamic";

const VALID_TAGS: ReadonlySet<DietaryTag> = new Set([
  "halal",
  "vegetarien",
  "sans-gluten",
  "vegan",
  "epice",
]);

export async function POST(req: NextRequest) {
  let body: Partial<MenuItemRow>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (body.id || "").trim();
  if (!/^[a-z0-9-]{2,60}$/.test(id)) {
    return NextResponse.json(
      { error: 'id invalide (slug-style, "a-z 0-9 -")' },
      { status: 400 }
    );
  }
  const category_id = (body.category_id || "").trim();
  if (!category_id) {
    return NextResponse.json({ error: "category_id requis" }, { status: 400 });
  }
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }
  const price = Number(body.price_cents);
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    return NextResponse.json(
      { error: "price_cents invalide (0..100000)" },
      { status: 400 }
    );
  }

  const tags: DietaryTag[] = Array.isArray(body.tags)
    ? Array.from(
        new Set(
          (body.tags as unknown[])
            .filter((t): t is string => typeof t === "string")
            .filter((t): t is DietaryTag => VALID_TAGS.has(t as DietaryTag))
        )
      )
    : [];

  try {
    const row = await upsertItem({
      id,
      category_id,
      name: name.slice(0, 120),
      description: (body.description || "").toString().slice(0, 500),
      price_cents: Math.round(price),
      image_url: body.image_url?.toString().slice(0, 500) || null,
      signature: Boolean(body.signature),
      popular: Boolean(body.popular),
      chef: Boolean(body.chef),
      tags,
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
