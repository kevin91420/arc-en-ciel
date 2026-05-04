/**
 * MENU TYPES — DB-backed catalogue (Sprint 5).
 *
 * Replaces the hardcoded `src/data/carte.ts` once the admin starts editing
 * from /admin/menu. The original CARTE constant is still used as the seed
 * source on first boot when the menu_items table is empty.
 */

import type { Station } from "./pos-types";
import type { DietaryTag } from "@/data/carte";

export type { DietaryTag };

export interface MenuCategoryRow {
  id: string;
  number: string;
  title: string;
  subtitle?: string | null;
  intro?: string | null;
  icon: string;
  station: Station;
  position: number;
  active: boolean;
  card_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemRow {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string | null;
  signature: boolean;
  popular: boolean;
  chef: boolean;
  tags: DietaryTag[];
  position: number;
  active: boolean;
  /* Sprint 7b QW#12 — stock tracking opt-in par item */
  track_stock?: boolean;
  stock_quantity?: number | null;
  stock_threshold_low?: number;
  created_at?: string;
  updated_at?: string;
}

/* Sprint 7b QW#12 — stock movements (audit trail) */
export type StockMovementKind =
  | "restock"      // ré-approvisionnement manuel
  | "sale"         // vente (auto, lors du fire)
  | "loss"         // perte / casse / périmé
  | "adjustment"   // correction manuelle (inventaire physique)
  | "return";      // retour suite annulation

export interface StockMovementRow {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  kind: StockMovementKind;
  delta: number;             // signed (positive = entrée, négative = sortie)
  quantity_after: number;
  notes: string | null;
  created_by_staff_id: string | null;
  order_id: string | null;
  created_at: string;
}

/**
 * Vue enrichie d'un menu item pour la console stock — inclut le nom de
 * la catégorie pour afficher dans la liste.
 */
export interface MenuItemWithStockInfo extends MenuItemRow {
  category_title?: string;
  category_icon?: string;
  /* Last movement for context */
  last_movement_at?: string | null;
  last_movement_kind?: StockMovementKind | null;
}

export interface MenuVariantRow {
  id: string;
  menu_item_id: string;
  label: string;
  price_delta_cents: number;
  is_default: boolean;
  position: number;
}

export interface MenuModifierRow {
  id: string;
  menu_item_id?: string | null;
  category_id?: string | null;
  label: string;
  price_delta_cents: number;
  is_required: boolean;
  position: number;
}

/* ─── Multi-cards (Midi / Soir / Weekend / Spéciale) ──────── */

export interface MenuCardRow {
  id: string;                    // "midi", "soir", "default"
  name: string;
  active: boolean;
  is_default: boolean;
  schedule_start?: string | null; // "12:00"
  schedule_end?: string | null;   // "14:30"
  schedule_days?: string[] | null;// ['mon','tue','wed','thu','fri']
  position: number;
}

/* ─── Combos / Formules ──────────────────────────────────── */

export interface MenuComboSlotRow {
  id: string;
  combo_id: string;
  label: string;          // "Entrée", "Plat", "Dessert"
  item_ids: string[];     // choix possibles parmi le catalogue
  min_picks: number;
  max_picks: number;
  position: number;
}

export interface MenuComboRow {
  id: string;
  card_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string | null;
  active: boolean;
  position: number;
}

export interface MenuComboFull extends MenuComboRow {
  slots: MenuComboSlotRow[];
}

/** Composite shape returned by /api/menu — ready to render. */
export interface MenuItemFull extends MenuItemRow {
  variants: MenuVariantRow[];
  modifiers: MenuModifierRow[];
}

export interface MenuCategoryFull extends MenuCategoryRow {
  items: MenuItemFull[];
  modifiers: MenuModifierRow[];
  card_id?: string;
}

export type CreateMenuCategoryPayload = Omit<
  MenuCategoryRow,
  "created_at" | "updated_at"
>;
export type UpdateMenuCategoryPayload = Partial<
  Omit<MenuCategoryRow, "id" | "created_at" | "updated_at">
>;

export type CreateMenuItemPayload = Omit<
  MenuItemRow,
  "created_at" | "updated_at"
>;
export type UpdateMenuItemPayload = Partial<
  Omit<MenuItemRow, "id" | "category_id" | "created_at" | "updated_at">
>;
