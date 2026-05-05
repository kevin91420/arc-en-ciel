/**
 * RECIPES CLIENT — Sprint 7b Stock Niveau 2.
 *
 * Gère la composition d'un menu_item en ingrédients (BOM).
 * Permet aussi de calculer le coût matière d'un plat et de
 * décrémenter automatiquement les ingrédients lors d'une vente.
 */

import type {
  IngredientRow,
  IngredientUnit,
  MenuItemRecipeRow,
  MenuItemRecipeWithIngredient,
  RecipeCostBreakdown,
} from "./ingredient-types";
import { applyIngredientMovement } from "./ingredients-client";
import { getCurrentTenantId } from "./tenant";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!USE_SUPABASE) throw new Error("Supabase not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY!}`,
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

async function resolveTenantId(explicit?: string): Promise<string> {
  return explicit ?? (await getCurrentTenantId());
}

function tc(tenantId: string): string {
  return `&restaurant_id=eq.${encodeURIComponent(tenantId)}`;
}

/* ═══════════════════════════════════════════════════════════
   READ
   ═══════════════════════════════════════════════════════════ */

/** Liste les ingrédients composant un plat (recipe), enrichi des infos ingrédient. */
export async function getRecipeForItem(
  menuItemId: string,
  tenantId?: string
): Promise<MenuItemRecipeWithIngredient[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);

  const recipes = await sb<MenuItemRecipeRow[]>(
    `menu_item_recipes?select=*&menu_item_id=eq.${encodeURIComponent(menuItemId)}${tc(tid)}&order=created_at.asc`
  );
  if (recipes.length === 0) return [];

  const ingredientIds = [...new Set(recipes.map((r) => r.ingredient_id))];
  const ingredients = await sb<IngredientRow[]>(
    `ingredients?select=*&id=in.(${ingredientIds.map((i) => `"${i}"`).join(",")})${tc(tid)}`
  );
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  return recipes.map((r) => {
    const ing = byId.get(r.ingredient_id);
    return {
      ...r,
      ingredient_name: ing?.name ?? "(supprimé)",
      ingredient_unit: (ing?.unit ?? "unité") as IngredientUnit,
      ingredient_cost_per_unit_cents: ing?.cost_per_unit_cents ?? 0,
      ingredient_stock_quantity: Number(ing?.stock_quantity ?? 0),
      ingredient_threshold_low: Number(ing?.stock_threshold_low ?? 0),
    };
  });
}

/** Compte le nombre d'items qui ont une recette définie. */
export async function countItemsWithRecipe(tenantId?: string): Promise<number> {
  if (!USE_SUPABASE) return 0;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<{ menu_item_id: string }[]>(
    `menu_item_recipes?select=menu_item_id${tc(tid)}`
  );
  return new Set(rows.map((r) => r.menu_item_id)).size;
}

/** Liste les menu_item_id qui ont au moins un ingrédient configuré. */
export async function listMenuItemsWithRecipe(
  tenantId?: string
): Promise<Set<string>> {
  if (!USE_SUPABASE) return new Set();
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<{ menu_item_id: string }[]>(
    `menu_item_recipes?select=menu_item_id${tc(tid)}`
  );
  return new Set(rows.map((r) => r.menu_item_id));
}

/** Calcule le coût matière d'un plat depuis sa recette + état stock. */
export async function getRecipeCostBreakdown(
  menuItemId: string,
  tenantId?: string
): Promise<RecipeCostBreakdown> {
  const recipe = await getRecipeForItem(menuItemId, tenantId);

  let total = 0;
  let allAvailable = true;
  const items = recipe.map((r) => {
    const cost = Math.round(
      Number(r.quantity_per_serving) * r.ingredient_cost_per_unit_cents
    );
    total += cost;
    const inStock =
      r.ingredient_stock_quantity >= Number(r.quantity_per_serving);
    if (!inStock) allAvailable = false;
    return {
      ingredient_id: r.ingredient_id,
      ingredient_name: r.ingredient_name,
      quantity: Number(r.quantity_per_serving),
      unit: r.ingredient_unit,
      cost_cents: cost,
      in_stock: inStock,
    };
  });

  return {
    menu_item_id: menuItemId,
    total_cost_cents: total,
    ingredients: items,
    available: allAvailable,
  };
}

/* ═══════════════════════════════════════════════════════════
   WRITE — gestion de la recette
   ═══════════════════════════════════════════════════════════ */

/**
 * Remplace intégralement la recette d'un plat (atomic-ish).
 * Plus simple que diff/upsert pour l'UI (qui poste l'état complet).
 */
export async function replaceRecipeForItem(
  menuItemId: string,
  ingredients: { ingredient_id: string; quantity_per_serving: number; notes?: string | null }[],
  tenantId?: string
): Promise<MenuItemRecipeRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);

  /* 1. Delete existant */
  await sb<MenuItemRecipeRow[]>(
    `menu_item_recipes?menu_item_id=eq.${encodeURIComponent(menuItemId)}${tc(tid)}`,
    { method: "DELETE" }
  );

  if (ingredients.length === 0) return [];

  /* 2. Insert nouveau */
  const payload = ingredients.map((i) => ({
    restaurant_id: tid,
    menu_item_id: menuItemId,
    ingredient_id: i.ingredient_id,
    quantity_per_serving: Math.max(0, i.quantity_per_serving),
    variant_id: null,
    notes: i.notes ?? null,
  }));

  return sb<MenuItemRecipeRow[]>("menu_item_recipes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRecipeIngredient(
  recipeId: string,
  tenantId?: string
): Promise<boolean> {
  if (!USE_SUPABASE) return false;
  const tid = await resolveTenantId(tenantId);
  await sb(
    `menu_item_recipes?id=eq.${encodeURIComponent(recipeId)}${tc(tid)}`,
    { method: "DELETE" }
  );
  return true;
}

/* ═══════════════════════════════════════════════════════════
   AUTO-DECREMENT — branché sur fireOrder
   ═══════════════════════════════════════════════════════════ */

/**
 * Décrémente les ingrédients de tous les plats vendus dans une commande.
 * Best-effort : si un ingrédient manque, on log mais on continue.
 *
 * @param menuItemIds Liste des menu_item_id (un par portion, doublons OK)
 */
export async function decrementIngredientsForOrderItems(
  orderId: string,
  menuItemIds: string[],
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE || menuItemIds.length === 0) return;
  const tid = await resolveTenantId(tenantId);

  /* Group portions par item */
  const portionCounts = new Map<string, number>();
  for (const id of menuItemIds) {
    portionCounts.set(id, (portionCounts.get(id) ?? 0) + 1);
  }

  /* Charge toutes les recettes des items concernés en un seul appel */
  const itemList = [...portionCounts.keys()];
  const recipes = await sb<MenuItemRecipeRow[]>(
    `menu_item_recipes?select=*&menu_item_id=in.(${itemList.map((i) => `"${i}"`).join(",")})${tc(tid)}`
  ).catch(() => [] as MenuItemRecipeRow[]);

  if (recipes.length === 0) return;

  /* Aggrégate consommation par ingredient_id */
  const consumeByIngredient = new Map<
    string,
    { qty: number; menuItemId: string }
  >();
  for (const r of recipes) {
    const portions = portionCounts.get(r.menu_item_id) ?? 0;
    if (portions === 0) continue;
    const totalQty = portions * Number(r.quantity_per_serving);
    const existing = consumeByIngredient.get(r.ingredient_id);
    if (existing) {
      existing.qty += totalQty;
    } else {
      consumeByIngredient.set(r.ingredient_id, {
        qty: totalQty,
        menuItemId: r.menu_item_id,
      });
    }
  }

  /* Apply mouvements */
  for (const [ingredientId, { qty, menuItemId }] of consumeByIngredient.entries()) {
    await applyIngredientMovement(ingredientId, -qty, "consume", {
      orderId,
      menuItemId,
      tenantId: tid,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[ingredients] consume failed for ${ingredientId}:`,
        (err as Error).message
      );
    });
  }
}

/**
 * Recrédit les ingrédients lors d'un cancel order (équivalent return).
 */
export async function recreditIngredientsForOrderItems(
  orderId: string,
  menuItemIds: string[],
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE || menuItemIds.length === 0) return;
  const tid = await resolveTenantId(tenantId);

  const portionCounts = new Map<string, number>();
  for (const id of menuItemIds) {
    portionCounts.set(id, (portionCounts.get(id) ?? 0) + 1);
  }

  const itemList = [...portionCounts.keys()];
  const recipes = await sb<MenuItemRecipeRow[]>(
    `menu_item_recipes?select=*&menu_item_id=in.(${itemList.map((i) => `"${i}"`).join(",")})${tc(tid)}`
  ).catch(() => [] as MenuItemRecipeRow[]);

  if (recipes.length === 0) return;

  const recreditByIngredient = new Map<
    string,
    { qty: number; menuItemId: string }
  >();
  for (const r of recipes) {
    const portions = portionCounts.get(r.menu_item_id) ?? 0;
    if (portions === 0) continue;
    const totalQty = portions * Number(r.quantity_per_serving);
    const existing = recreditByIngredient.get(r.ingredient_id);
    if (existing) {
      existing.qty += totalQty;
    } else {
      recreditByIngredient.set(r.ingredient_id, {
        qty: totalQty,
        menuItemId: r.menu_item_id,
      });
    }
  }

  for (const [ingredientId, { qty, menuItemId }] of recreditByIngredient.entries()) {
    await applyIngredientMovement(ingredientId, qty, "adjustment", {
      orderId,
      menuItemId,
      notes: "Recrédit suite annulation commande",
      tenantId: tid,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[ingredients] recredit failed for ${ingredientId}:`,
        (err as Error).message
      );
    });
  }
}
