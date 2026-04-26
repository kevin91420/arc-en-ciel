/**
 * PATCH  /api/admin/menu/items/[id] — partial update
 * DELETE /api/admin/menu/items/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteItem, updateItem } from "@/lib/db/menu-client";
import type { DietaryTag } from "@/lib/db/menu-types";

export const dynamic = "force-dynamic";

const VALID_TAGS: ReadonlySet<DietaryTag> = new Set([
  "halal",
  "vegetarien",
  "sans-gluten",
  "vegan",
  "epice",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (body.description !== undefined)
    patch.description =
      typeof body.description === "string"
        ? body.description.slice(0, 500)
        : "";
  if (body.price_cents !== undefined) {
    const p = Number(body.price_cents);
    if (Number.isFinite(p) && p >= 0 && p <= 100_000) {
      patch.price_cents = Math.round(p);
    }
  }
  if (body.image_url !== undefined) {
    patch.image_url =
      typeof body.image_url === "string"
        ? body.image_url.slice(0, 500)
        : null;
  }
  if (typeof body.signature === "boolean") patch.signature = body.signature;
  if (typeof body.popular === "boolean") patch.popular = body.popular;
  if (typeof body.chef === "boolean") patch.chef = body.chef;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Array.isArray(body.tags)) {
    patch.tags = Array.from(
      new Set(
        (body.tags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .filter((t): t is DietaryTag => VALID_TAGS.has(t as DietaryTag))
      )
    );
  }
  if (typeof body.position === "number") {
    patch.position = Math.max(0, Math.min(999, Math.floor(body.position)));
  }
  if (typeof body.category_id === "string" && body.category_id.trim()) {
    patch.category_id = body.category_id.trim();
  }

  try {
    const row = await updateItem(id, patch);
    if (!row) {
      return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
