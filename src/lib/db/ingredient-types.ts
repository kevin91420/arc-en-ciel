/**
 * Types pour le stock Niveau 2 — ingrédients + recettes (BOM).
 *
 * Voir migration 0016_sprint7b_stock_ingredients.sql.
 */

/** Unités de mesure standard pour la gestion d'ingrédients en cuisine. */
export type IngredientUnit =
  | "g"
  | "kg"
  | "ml"
  | "L"
  | "unité"
  | "tranche"
  | "botte"
  | "cl";

/** Catégories pour grouper l'inventaire. */
export const INGREDIENT_CATEGORIES = [
  "Frais",
  "Sec",
  "Surgelé",
  "Boisson",
  "Conso",
  "Épicerie",
  "Autre",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface IngredientRow {
  id: string;
  restaurant_id: string;
  name: string;
  unit: IngredientUnit;
  category: IngredientCategory;
  stock_quantity: number;
  stock_threshold_low: number;
  stock_target: number | null;
  cost_per_unit_cents: number;
  supplier_name: string | null;
  supplier_ref: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Recette : composition d'un menu_item en ingrédients. */
export interface MenuItemRecipeRow {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_per_serving: number;
  variant_id: string | null;
  notes: string | null;
  created_at: string;
}

/** Recipe enrichie d'infos ingrédient pour l'affichage. */
export interface MenuItemRecipeWithIngredient extends MenuItemRecipeRow {
  ingredient_name: string;
  ingredient_unit: IngredientUnit;
  ingredient_cost_per_unit_cents: number;
  ingredient_stock_quantity: number;
  ingredient_threshold_low: number;
}

/** Mouvements ingrédients (audit trail). */
export type IngredientMovementKind =
  | "restock"
  | "consume"
  | "loss"
  | "adjustment"
  | "inventory";

export interface IngredientMovementRow {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  kind: IngredientMovementKind;
  delta: number;
  quantity_after: number;
  cost_per_unit_cents: number | null;
  order_id: string | null;
  menu_item_id: string | null;
  created_by_staff_id: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

/** Stats globales pour le dashboard. */
export interface IngredientStats {
  total_ingredients: number;
  active_ingredients: number;
  low_stock_count: number; // <= threshold
  out_of_stock_count: number; // == 0
  total_value_cents: number; // sum(quantity × cost_per_unit_cents)
}

/** Coût matière calculé d'un plat depuis sa recette. */
export interface RecipeCostBreakdown {
  menu_item_id: string;
  total_cost_cents: number;
  ingredients: {
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
    unit: IngredientUnit;
    cost_cents: number;
    in_stock: boolean;
  }[];
  /** True si tous les ingrédients de la recette ont du stock dispo */
  available: boolean;
}
