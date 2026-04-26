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
  created_at?: string;
  updated_at?: string;
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

/** Composite shape returned by /api/menu — ready to render. */
export interface MenuItemFull extends MenuItemRow {
  variants: MenuVariantRow[];
  modifiers: MenuModifierRow[];
}

export interface MenuCategoryFull extends MenuCategoryRow {
  items: MenuItemFull[];
  modifiers: MenuModifierRow[];
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
