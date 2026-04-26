/**
 * MENU CLIENT — DB-backed catalogue (Sprint 5).
 *
 * `getMenu()` returns the full menu (categories + items + variants +
 * modifiers). On a brand new tenant the menu_items table is empty — we
 * fall back to the static `CARTE` constant from `src/data/carte.ts` so the
 * site never looks broken. The first time an admin saves a change, we seed
 * the DB from that fallback so the override semantics are clean.
 */

import { CARTE, type DietaryTag, type MenuCategory } from "@/data/carte";
import { stationForCategory } from "@/app/staff/_lib/menu";
import { parsePriceToCents } from "@/lib/format";
import type {
  CreateMenuCategoryPayload,
  CreateMenuItemPayload,
  MenuCategoryFull,
  MenuCategoryRow,
  MenuItemFull,
  MenuItemRow,
  MenuModifierRow,
  MenuVariantRow,
  UpdateMenuCategoryPayload,
  UpdateMenuItemPayload,
} from "./menu-types";

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

/* ═══════════════════════════════════════════════════════════
   Fallback — convert the static CARTE into the same shape
   ═══════════════════════════════════════════════════════════ */

function fallbackFromCarte(): MenuCategoryFull[] {
  return CARTE.map((cat: MenuCategory, ci: number) => {
    const station = stationForCategory(cat.id);
    const items: MenuItemFull[] = cat.items.map((it, i) => ({
      id: it.id,
      category_id: cat.id,
      name: it.name,
      description: it.description,
      price_cents: parsePriceToCents(it.price),
      image_url: it.image ?? null,
      signature: Boolean(it.signature),
      popular: Boolean(it.popular),
      chef: Boolean(it.chef),
      tags: (it.tags as DietaryTag[] | undefined) ?? [],
      position: i,
      active: true,
      variants: [],
      modifiers: [],
    }));
    return {
      id: cat.id,
      number: cat.number,
      title: cat.title,
      subtitle: cat.subtitle ?? null,
      intro: cat.intro ?? null,
      icon: cat.icon,
      station,
      position: ci,
      active: true,
      items,
      modifiers: [],
    };
  });
}

/* ═══════════════════════════════════════════════════════════
   Read — full menu (or fallback)
   ═══════════════════════════════════════════════════════════ */

/**
 * Public read of the catalogue. Returns the DB version if it has at least
 * one item, otherwise falls back to the static CARTE so QR menus / POS keep
 * working on a brand-new tenant.
 *
 * `includeInactive` — admin uses true to render hidden items in the editor.
 */
export async function getMenu(
  options: { includeInactive?: boolean } = {}
): Promise<MenuCategoryFull[]> {
  const includeInactive = options.includeInactive ?? false;

  if (!USE_SUPABASE) return fallbackFromCarte();

  try {
    const [categories, items, variants, modifiers] = await Promise.all([
      sb<MenuCategoryRow[]>(
        `menu_categories?select=*${includeInactive ? "" : "&active=eq.true"}&order=position.asc`
      ),
      sb<MenuItemRow[]>(
        `menu_items?select=*${includeInactive ? "" : "&active=eq.true"}&order=position.asc`
      ),
      sb<MenuVariantRow[]>(
        `menu_variants?select=*&order=position.asc`
      ),
      sb<MenuModifierRow[]>(
        `menu_modifiers?select=*&order=position.asc`
      ),
    ]);

    if (categories.length === 0) {
      /* Empty DB — return fallback so the customer-facing pages don't go
       * blank during onboarding. The admin will seed manually. */
      return fallbackFromCarte();
    }

    const variantsByItem = new Map<string, MenuVariantRow[]>();
    for (const v of variants) {
      if (!variantsByItem.has(v.menu_item_id))
        variantsByItem.set(v.menu_item_id, []);
      variantsByItem.get(v.menu_item_id)!.push(v);
    }

    const modifiersByItem = new Map<string, MenuModifierRow[]>();
    const modifiersByCategory = new Map<string, MenuModifierRow[]>();
    for (const m of modifiers) {
      if (m.menu_item_id) {
        if (!modifiersByItem.has(m.menu_item_id))
          modifiersByItem.set(m.menu_item_id, []);
        modifiersByItem.get(m.menu_item_id)!.push(m);
      } else if (m.category_id) {
        if (!modifiersByCategory.has(m.category_id))
          modifiersByCategory.set(m.category_id, []);
        modifiersByCategory.get(m.category_id)!.push(m);
      }
    }

    return categories.map((c) => ({
      ...c,
      modifiers: modifiersByCategory.get(c.id) ?? [],
      items: items
        .filter((i) => i.category_id === c.id)
        .map((i) => ({
          ...i,
          tags: (i.tags ?? []) as DietaryTag[],
          variants: variantsByItem.get(i.id) ?? [],
          modifiers: modifiersByItem.get(i.id) ?? [],
        })),
    }));
  } catch {
    return fallbackFromCarte();
  }
}

/* ═══════════════════════════════════════════════════════════
   Seed — copy fallback into DB on first edit
   ═══════════════════════════════════════════════════════════ */

export async function isMenuSeeded(): Promise<boolean> {
  if (!USE_SUPABASE) return false;
  try {
    const rows = await sb<{ count: number }[]>(
      `menu_categories?select=count`,
      { headers: { Prefer: "count=exact" } }
    );
    return Array.isArray(rows) && rows.length > 0 && (rows[0].count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Seeds the DB from the static CARTE once. Idempotent : returns silently
 * when at least one row already exists. */
export async function seedMenuFromCarte(): Promise<void> {
  if (!USE_SUPABASE) return;
  if (await isMenuSeeded()) return;

  const fallback = fallbackFromCarte();
  /* Insert categories first. */
  const categoryRows = fallback.map((c, i) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    subtitle: c.subtitle,
    intro: c.intro,
    icon: c.icon,
    station: c.station,
    position: i,
    active: true,
  }));
  await sb(`menu_categories`, {
    method: "POST",
    body: JSON.stringify(categoryRows),
  });

  const itemRows = fallback.flatMap((c) =>
    c.items.map((it, i) => ({
      id: it.id,
      category_id: it.category_id,
      name: it.name,
      description: it.description,
      price_cents: it.price_cents,
      image_url: it.image_url,
      signature: it.signature,
      popular: it.popular,
      chef: it.chef,
      tags: it.tags,
      position: i,
      active: true,
    }))
  );
  if (itemRows.length > 0) {
    await sb(`menu_items`, {
      method: "POST",
      body: JSON.stringify(itemRows),
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   Mutations — admin CRUD
   ═══════════════════════════════════════════════════════════ */

export async function upsertCategory(
  payload: CreateMenuCategoryPayload
): Promise<MenuCategoryRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis pour éditer la carte.");
  await seedMenuFromCarte();
  const [row] = await sb<MenuCategoryRow[]>(`menu_categories`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  return row;
}

export async function updateCategory(
  id: string,
  patch: UpdateMenuCategoryPayload
): Promise<MenuCategoryRow | null> {
  if (!USE_SUPABASE) return null;
  await seedMenuFromCarte();
  const [row] = await sb<MenuCategoryRow[]>(
    `menu_categories?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return row ?? null;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!USE_SUPABASE) return;
  await sb(`menu_categories?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function upsertItem(
  payload: CreateMenuItemPayload
): Promise<MenuItemRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis pour éditer la carte.");
  await seedMenuFromCarte();
  const [row] = await sb<MenuItemRow[]>(`menu_items`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  return row;
}

export async function updateItem(
  id: string,
  patch: UpdateMenuItemPayload
): Promise<MenuItemRow | null> {
  if (!USE_SUPABASE) return null;
  await seedMenuFromCarte();
  const [row] = await sb<MenuItemRow[]>(
    `menu_items?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return row ?? null;
}

export async function deleteItem(id: string): Promise<void> {
  if (!USE_SUPABASE) return;
  await sb(`menu_items?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ── Variants & modifiers (lighter surface — admin can manage) ── */

export async function listVariantsForItem(
  itemId: string
): Promise<MenuVariantRow[]> {
  if (!USE_SUPABASE) return [];
  return sb<MenuVariantRow[]>(
    `menu_variants?select=*&menu_item_id=eq.${encodeURIComponent(itemId)}&order=position.asc`
  );
}

export async function setVariantsForItem(
  itemId: string,
  variants: Array<{
    label: string;
    price_delta_cents: number;
    is_default?: boolean;
    position?: number;
  }>
): Promise<MenuVariantRow[]> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  await sb(`menu_variants?menu_item_id=eq.${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
  if (variants.length === 0) return [];
  const rows = variants.map((v, i) => ({
    menu_item_id: itemId,
    label: v.label,
    price_delta_cents: v.price_delta_cents,
    is_default: Boolean(v.is_default),
    position: v.position ?? i,
  }));
  return sb<MenuVariantRow[]>(`menu_variants`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

export async function listModifiersForItem(
  itemId: string
): Promise<MenuModifierRow[]> {
  if (!USE_SUPABASE) return [];
  return sb<MenuModifierRow[]>(
    `menu_modifiers?select=*&menu_item_id=eq.${encodeURIComponent(itemId)}&order=position.asc`
  );
}

export async function setModifiersForItem(
  itemId: string,
  modifiers: Array<{
    label: string;
    price_delta_cents: number;
    is_required?: boolean;
    position?: number;
  }>
): Promise<MenuModifierRow[]> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  await sb(
    `menu_modifiers?menu_item_id=eq.${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  );
  if (modifiers.length === 0) return [];
  const rows = modifiers.map((m, i) => ({
    menu_item_id: itemId,
    category_id: null,
    label: m.label,
    price_delta_cents: m.price_delta_cents,
    is_required: Boolean(m.is_required),
    position: m.position ?? i,
  }));
  return sb<MenuModifierRow[]>(`menu_modifiers`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}
