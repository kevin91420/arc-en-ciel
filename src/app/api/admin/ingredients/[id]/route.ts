/**
 * GET    /api/admin/ingredients/[id]  → ingrédient + 50 derniers mouvements
 * PATCH  /api/admin/ingredients/[id]  → update (sans toucher au stock_quantity)
 * DELETE /api/admin/ingredients/[id]  → soft-delete (active=false)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getIngredient,
  updateIngredient,
  archiveIngredient,
  listIngredientMovements,
} from "@/lib/db/ingredients-client";
import { withPermission } from "@/lib/auth/guards";
import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  type IngredientUnit,
} from "@/lib/db/ingredient-types";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const VALID_UNITS: IngredientUnit[] = [
  "g",
  "kg",
  "ml",
  "L",
  "unité",
  "tranche",
  "botte",
  "cl",
];

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.view");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  try {
    const [ingredient, movements] = await Promise.all([
      getIngredient(id),
      listIngredientMovements(id, 50),
    ]);
    if (!ingredient) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ingredient, movements });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const patch: Parameters<typeof updateIngredient>[1] = {};

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.unit === "string" && VALID_UNITS.includes(body.unit as IngredientUnit)) {
    patch.unit = body.unit as IngredientUnit;
  }
  if (
    typeof body.category === "string" &&
    INGREDIENT_CATEGORIES.includes(body.category as IngredientCategory)
  ) {
    patch.category = body.category as IngredientCategory;
  }
  if (body.stock_threshold_low !== undefined) {
    const n = Number(body.stock_threshold_low);
    if (Number.isFinite(n) && n >= 0) patch.stock_threshold_low = n;
  }
  if (body.stock_target !== undefined) {
    if (body.stock_target === null) patch.stock_target = null;
    else {
      const n = Number(body.stock_target);
      if (Number.isFinite(n) && n >= 0) patch.stock_target = n;
    }
  }
  if (body.cost_per_unit_cents !== undefined) {
    const n = Math.floor(Number(body.cost_per_unit_cents));
    if (Number.isFinite(n) && n >= 0) patch.cost_per_unit_cents = n;
  }
  if (body.supplier_name !== undefined) {
    patch.supplier_name =
      typeof body.supplier_name === "string" ? body.supplier_name : null;
  }
  if (body.supplier_ref !== undefined) {
    patch.supplier_ref =
      typeof body.supplier_ref === "string" ? body.supplier_ref : null;
  }
  if (body.notes !== undefined) {
    patch.notes = typeof body.notes === "string" ? body.notes : null;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  try {
    const updated = await updateIngredient(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ingredient: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  try {
    const ok = await archiveIngredient(id);
    if (!ok) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
