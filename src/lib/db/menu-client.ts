/**
 * MENU CLIENT — DB-backed catalogue, scoped par tenant (Sprint 7b Phase F).
 *
 * Toutes les fonctions sont tenant-aware : elles résolvent automatiquement
 * le `restaurant_id` du tenant courant via `getCurrentTenantId()` (lit le
 * header X-Tenant-Slug injecté par le proxy). Un `tenantId` explicite peut
 * être passé pour les contextes hors requête (seed scripts, etc.).
 *
 * `getMenu()` retourne le menu complet (catégories + items + variants +
 * modifiers) du tenant. Si le tenant n'a aucun item en DB, on tombe sur la
 * `CARTE` statique pour ne pas afficher de page vide pendant l'onboarding.
 */

import { CARTE, type DietaryTag, type MenuCategory } from "@/data/carte";
import { stationForCategory } from "@/app/staff/_lib/menu";
import { parsePriceToCents } from "@/lib/format";
import type {
  CreateMenuCategoryPayload,
  CreateMenuItemPayload,
  MenuCategoryFull,
  MenuCategoryRow,
  MenuComboFull,
  MenuComboRow,
  MenuComboSlotRow,
  MenuItemFull,
  MenuItemRow,
  MenuModifierRow,
  MenuVariantRow,
  UpdateMenuCategoryPayload,
  UpdateMenuItemPayload,
} from "./menu-types";
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

/**
 * Résout le tenant_id pour une fonction qui peut être appelée avec ou sans
 * contexte de requête. Évite les `await getCurrentTenantId()` répétitifs.
 */
async function resolveTenantId(explicit?: string): Promise<string> {
  return explicit ?? (await getCurrentTenantId());
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
   Read — full menu (or fallback) du tenant courant
   ═══════════════════════════════════════════════════════════ */

/**
 * Public read of the catalogue (par tenant). Returns the DB version if it
 * has at least one category, otherwise falls back to the static CARTE so
 * QR menus / POS keep working on a brand-new tenant.
 *
 * `includeInactive` — admin uses true to render hidden items in the editor.
 */
export async function getMenu(
  options: { includeInactive?: boolean; tenantId?: string } = {}
): Promise<MenuCategoryFull[]> {
  const includeInactive = options.includeInactive ?? false;
  if (!USE_SUPABASE) return fallbackFromCarte();

  try {
    const restaurantId = await resolveTenantId(options.tenantId);
    const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

    const [categories, items, variants, modifiers] = await Promise.all([
      sb<MenuCategoryRow[]>(
        `menu_categories?select=*${includeInactive ? "" : "&active=eq.true"}${tenantFilter}&order=position.asc`
      ),
      sb<MenuItemRow[]>(
        `menu_items?select=*${includeInactive ? "" : "&active=eq.true"}${tenantFilter}&order=position.asc`
      ),
      sb<MenuVariantRow[]>(
        `menu_variants?select=*${tenantFilter}&order=position.asc`
      ),
      sb<MenuModifierRow[]>(
        `menu_modifiers?select=*${tenantFilter}&order=position.asc`
      ),
    ]);

    if (categories.length === 0) {
      /* Empty DB pour ce tenant — return fallback so the customer-facing
       * pages don't go blank during onboarding. The admin will seed
       * manually (ou l'onboarding wizard pre-remplit). */
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
   Seed — copy fallback into DB on first edit (par tenant)
   ═══════════════════════════════════════════════════════════ */

export async function isMenuSeeded(tenantId?: string): Promise<boolean> {
  if (!USE_SUPABASE) return false;
  try {
    const restaurantId = await resolveTenantId(tenantId);
    const rows = await sb<{ count: number }[]>(
      `menu_categories?select=count&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
      { headers: { Prefer: "count=exact" } }
    );
    return Array.isArray(rows) && rows.length > 0 && (rows[0].count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Seeds the DB from the static CARTE once pour le tenant courant.
 * Idempotent : returns silently when at least one row already exists. */
export async function seedMenuFromCarte(tenantId?: string): Promise<void> {
  if (!USE_SUPABASE) return;
  const restaurantId = await resolveTenantId(tenantId);
  if (await isMenuSeeded(restaurantId)) return;

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
    restaurant_id: restaurantId,
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
      restaurant_id: restaurantId,
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
   Mutations — admin CRUD (tenant-aware)
   ═══════════════════════════════════════════════════════════ */

export async function upsertCategory(
  payload: CreateMenuCategoryPayload,
  tenantId?: string
): Promise<MenuCategoryRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis pour éditer la carte.");
  const restaurantId = await resolveTenantId(tenantId);
  await seedMenuFromCarte(restaurantId);
  const [row] = await sb<MenuCategoryRow[]>(`menu_categories`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...payload, restaurant_id: restaurantId }),
  });
  return row;
}

export async function updateCategory(
  id: string,
  patch: UpdateMenuCategoryPayload,
  tenantId?: string
): Promise<MenuCategoryRow | null> {
  if (!USE_SUPABASE) return null;
  const restaurantId = await resolveTenantId(tenantId);
  await seedMenuFromCarte(restaurantId);
  const [row] = await sb<MenuCategoryRow[]>(
    `menu_categories?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return row ?? null;
}

export async function deleteCategory(
  id: string,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_categories?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    { method: "DELETE" }
  );
}

export async function upsertItem(
  payload: CreateMenuItemPayload,
  tenantId?: string
): Promise<MenuItemRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis pour éditer la carte.");
  const restaurantId = await resolveTenantId(tenantId);
  await seedMenuFromCarte(restaurantId);
  const [row] = await sb<MenuItemRow[]>(`menu_items`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...payload, restaurant_id: restaurantId }),
  });
  return row;
}

export async function updateItem(
  id: string,
  patch: UpdateMenuItemPayload,
  tenantId?: string
): Promise<MenuItemRow | null> {
  if (!USE_SUPABASE) return null;
  const restaurantId = await resolveTenantId(tenantId);
  await seedMenuFromCarte(restaurantId);
  const [row] = await sb<MenuItemRow[]>(
    `menu_items?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return row ?? null;
}

export async function deleteItem(
  id: string,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_items?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    { method: "DELETE" }
  );
}

/* ── Variants & modifiers (tenant-aware) ── */

export async function listVariantsForItem(
  itemId: string,
  tenantId?: string
): Promise<MenuVariantRow[]> {
  if (!USE_SUPABASE) return [];
  const restaurantId = await resolveTenantId(tenantId);
  return sb<MenuVariantRow[]>(
    `menu_variants?select=*&menu_item_id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}&order=position.asc`
  );
}

export async function setVariantsForItem(
  itemId: string,
  variants: Array<{
    label: string;
    price_delta_cents: number;
    is_default?: boolean;
    position?: number;
  }>,
  tenantId?: string
): Promise<MenuVariantRow[]> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_variants?menu_item_id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    { method: "DELETE" }
  );
  if (variants.length === 0) return [];
  const rows = variants.map((v, i) => ({
    menu_item_id: itemId,
    label: v.label,
    price_delta_cents: v.price_delta_cents,
    is_default: Boolean(v.is_default),
    position: v.position ?? i,
    restaurant_id: restaurantId,
  }));
  return sb<MenuVariantRow[]>(`menu_variants`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

export async function listModifiersForItem(
  itemId: string,
  tenantId?: string
): Promise<MenuModifierRow[]> {
  if (!USE_SUPABASE) return [];
  const restaurantId = await resolveTenantId(tenantId);
  return sb<MenuModifierRow[]>(
    `menu_modifiers?select=*&menu_item_id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}&order=position.asc`
  );
}

export async function setModifiersForItem(
  itemId: string,
  modifiers: Array<{
    label: string;
    price_delta_cents: number;
    is_required?: boolean;
    position?: number;
  }>,
  tenantId?: string
): Promise<MenuModifierRow[]> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_modifiers?menu_item_id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
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
    restaurant_id: restaurantId,
  }));
  return sb<MenuModifierRow[]>(`menu_modifiers`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

/* ═══════════════════════════════════════════════════════════
   Combos / Formules (Sprint 6b — tenant-aware)
   ═══════════════════════════════════════════════════════════ */

export async function listCombos(
  options: {
    cardId?: string;
    includeInactive?: boolean;
    tenantId?: string;
  } = {}
): Promise<MenuComboFull[]> {
  if (!USE_SUPABASE) return [];
  try {
    const restaurantId = await resolveTenantId(options.tenantId);
    const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
    const cardClause = options.cardId
      ? `&card_id=eq.${encodeURIComponent(options.cardId)}`
      : "";
    const activeClause = options.includeInactive ? "" : "&active=eq.true";
    const [combos, slots] = await Promise.all([
      sb<MenuComboRow[]>(
        `menu_combos?select=*${activeClause}${cardClause}${tenantFilter}&order=position.asc`
      ),
      sb<MenuComboSlotRow[]>(
        `menu_combo_slots?select=*${tenantFilter}&order=position.asc`
      ),
    ]);
    const slotsByCombo = new Map<string, MenuComboSlotRow[]>();
    for (const s of slots) {
      if (!slotsByCombo.has(s.combo_id))
        slotsByCombo.set(s.combo_id, []);
      slotsByCombo.get(s.combo_id)!.push(s);
    }
    return combos.map((c) => ({
      ...c,
      slots: slotsByCombo.get(c.id) ?? [],
    }));
  } catch {
    return [];
  }
}

export async function upsertCombo(
  payload: Omit<MenuComboRow, "created_at" | "updated_at">,
  tenantId?: string
): Promise<MenuComboRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const restaurantId = await resolveTenantId(tenantId);
  const [row] = await sb<MenuComboRow[]>(`menu_combos`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...payload, restaurant_id: restaurantId }),
  });
  return row;
}

export async function updateCombo(
  id: string,
  patch: Partial<Omit<MenuComboRow, "id" | "created_at" | "updated_at">>,
  tenantId?: string
): Promise<MenuComboRow | null> {
  if (!USE_SUPABASE) return null;
  const restaurantId = await resolveTenantId(tenantId);
  const [row] = await sb<MenuComboRow[]>(
    `menu_combos?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return row ?? null;
}

export async function deleteCombo(
  id: string,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_combos?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    { method: "DELETE" }
  );
}

export async function setComboSlots(
  comboId: string,
  slots: Array<{
    label: string;
    item_ids: string[];
    min_picks: number;
    max_picks: number;
    position?: number;
  }>,
  tenantId?: string
): Promise<MenuComboSlotRow[]> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const restaurantId = await resolveTenantId(tenantId);
  await sb(
    `menu_combo_slots?combo_id=eq.${encodeURIComponent(comboId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    { method: "DELETE" }
  );
  if (slots.length === 0) return [];
  const rows = slots.map((s, i) => ({
    combo_id: comboId,
    label: s.label,
    item_ids: s.item_ids,
    min_picks: s.min_picks,
    max_picks: s.max_picks,
    position: s.position ?? i,
    restaurant_id: restaurantId,
  }));
  return sb<MenuComboSlotRow[]>(`menu_combo_slots`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}
