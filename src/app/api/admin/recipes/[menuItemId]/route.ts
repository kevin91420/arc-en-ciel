/**
 * GET /api/admin/recipes/[menuItemId]
 *   → recette (ingrédients + quantités) + cost breakdown
 *
 * PUT /api/admin/recipes/[menuItemId]
 *   Body : { ingredients: [{ ingredient_id, quantity_per_serving, notes? }] }
 *   → remplace la recette intégralement (atomic-ish)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRecipeForItem,
  getRecipeCostBreakdown,
  replaceRecipeForItem,
} from "@/lib/db/recipes-client";
import { withPermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ menuItemId: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.view");
  if (!guard.ok) return guard.response;
  const { menuItemId } = await ctx.params;
  if (!menuItemId) {
    return NextResponse.json({ error: "menuItemId requis" }, { status: 400 });
  }

  try {
    const [recipe, breakdown] = await Promise.all([
      getRecipeForItem(menuItemId),
      getRecipeCostBreakdown(menuItemId),
    ]);
    return NextResponse.json({
      menu_item_id: menuItemId,
      recipe,
      breakdown,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;
  const { menuItemId } = await ctx.params;
  if (!menuItemId) {
    return NextResponse.json({ error: "menuItemId requis" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const raw = body.ingredients;
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "ingredients[] requis" },
      { status: 400 }
    );
  }

  const ingredients: {
    ingredient_id: string;
    quantity_per_serving: number;
    notes?: string | null;
  }[] = [];

  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = (r as Record<string, unknown>).ingredient_id;
    const qty = Number((r as Record<string, unknown>).quantity_per_serving);
    if (typeof id !== "string" || !id) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const notes = (r as Record<string, unknown>).notes;
    ingredients.push({
      ingredient_id: id,
      quantity_per_serving: qty,
      notes: typeof notes === "string" ? notes : null,
    });
  }

  try {
    const recipe = await replaceRecipeForItem(menuItemId, ingredients);
    const breakdown = await getRecipeCostBreakdown(menuItemId);
    return NextResponse.json({ recipe, breakdown });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
