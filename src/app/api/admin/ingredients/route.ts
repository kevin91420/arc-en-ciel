/**
 * GET /api/admin/ingredients?filter=all|alerts&category=Frais
 * POST /api/admin/ingredients
 *
 * Liste / création des ingrédients (Niveau 2).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listIngredients,
  getIngredientStats,
  createIngredient,
} from "@/lib/db/ingredients-client";
import { withPermission } from "@/lib/auth/guards";
import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  type IngredientUnit,
} from "@/lib/db/ingredient-types";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const guard = await withPermission("menu.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";
  const category = url.searchParams.get("category") as IngredientCategory | null;

  try {
    const [ingredients, stats] = await Promise.all([
      listIngredients({
        onlyAlerts: filter === "alerts",
        category: category && INGREDIENT_CATEGORIES.includes(category)
          ? category
          : undefined,
      }),
      getIngredientStats(),
    ]);

    return NextResponse.json({
      ingredients,
      stats,
      count: ingredients.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const unit = body.unit as IngredientUnit;
  if (!VALID_UNITS.includes(unit)) {
    return NextResponse.json(
      { error: `Unité invalide. Valeurs : ${VALID_UNITS.join(", ")}` },
      { status: 400 }
    );
  }

  const category = (body.category as IngredientCategory) ?? "Autre";
  if (!INGREDIENT_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Catégorie invalide. Valeurs : ${INGREDIENT_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  const stockQ = Number(body.stock_quantity ?? 0);
  const thresholdLow = Number(body.stock_threshold_low ?? 0);
  const target =
    body.stock_target !== undefined && body.stock_target !== null
      ? Number(body.stock_target)
      : null;
  const cost = Math.max(0, Math.floor(Number(body.cost_per_unit_cents ?? 0)));

  if (!Number.isFinite(stockQ) || stockQ < 0) {
    return NextResponse.json({ error: "stock_quantity invalide" }, { status: 400 });
  }
  if (!Number.isFinite(thresholdLow) || thresholdLow < 0) {
    return NextResponse.json({ error: "stock_threshold_low invalide" }, { status: 400 });
  }

  try {
    const created = await createIngredient({
      name,
      unit,
      category,
      stock_quantity: stockQ,
      stock_threshold_low: thresholdLow,
      stock_target: target,
      cost_per_unit_cents: cost,
      supplier_name:
        typeof body.supplier_name === "string" ? body.supplier_name : null,
      supplier_ref:
        typeof body.supplier_ref === "string" ? body.supplier_ref : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    if (!created) {
      return NextResponse.json(
        { error: "Échec création ingrédient" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ingredient: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
