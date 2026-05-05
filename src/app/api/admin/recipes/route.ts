/**
 * GET /api/admin/recipes
 * Liste les menu_item_id qui ont au moins une recette définie.
 * Utile pour griser/badger les items dans la console stock.
 */

import { NextResponse } from "next/server";
import { listMenuItemsWithRecipe } from "@/lib/db/recipes-client";
import { withPermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await withPermission("menu.view");
  if (!guard.ok) return guard.response;

  try {
    const ids = await listMenuItemsWithRecipe();
    return NextResponse.json({ menu_item_ids: [...ids] });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
