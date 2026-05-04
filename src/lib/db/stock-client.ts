/**
 * STOCK CLIENT — Sprint 7b QW#12.
 *
 * Gestion du stock par menu_item (Niveau 1). Opt-in : le manager active
 * le tracking item par item, défini un stock initial + seuil d'alerte.
 *
 * Auto-décrément lors du fire (envoi cuisine), auto-recrédit lors du
 * cancel. Audit trail complet via stock_movements.
 *
 * Toutes les fonctions sont tenant-aware.
 */

import type {
  MenuItemRow,
  MenuItemWithStockInfo,
  StockMovementKind,
  StockMovementRow,
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

async function resolveTenantId(explicit?: string): Promise<string> {
  return explicit ?? (await getCurrentTenantId());
}

function tc(tenantId: string): string {
  return `&restaurant_id=eq.${encodeURIComponent(tenantId)}`;
}

/* ═══════════════════════════════════════════════════════════
   READ — listes
   ═══════════════════════════════════════════════════════════ */

/**
 * Liste tous les items avec leur stock + meta catégorie.
 * Si onlyTracked → renvoie uniquement les items où track_stock = true.
 */
export async function listItemsWithStock(
  options: {
    onlyTracked?: boolean;
    onlyAlerts?: boolean;
    tenantId?: string;
  } = {}
): Promise<MenuItemWithStockInfo[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(options.tenantId);

  /* Filtre selon options */
  let extra = "";
  if (options.onlyTracked) extra += "&track_stock=eq.true";

  const items = await sb<MenuItemRow[]>(
    `menu_items?select=*${tc(tid)}${extra}&order=name.asc`
  );

  /* Enrichir avec category info */
  const categoryIds = [...new Set(items.map((i) => i.category_id))];
  const categories =
    categoryIds.length > 0
      ? await sb<{ id: string; title: string; icon: string }[]>(
          `menu_categories?select=id,title,icon&id=in.(${categoryIds.map((c) => `"${c}"`).join(",")})${tc(tid)}`
        )
      : [];
  const catMap = new Map(categories.map((c) => [c.id, c]));

  /* Enrichir avec dernier mouvement */
  let lastMovementsByItem = new Map<
    string,
    { created_at: string; kind: StockMovementKind }
  >();
  if (items.length > 0) {
    const movements = await sb<StockMovementRow[]>(
      `stock_movements?select=menu_item_id,kind,created_at${tc(tid)}&order=created_at.desc&limit=1000`
    );
    /* Garde le 1er (le plus récent) par item */
    for (const m of movements) {
      if (!lastMovementsByItem.has(m.menu_item_id)) {
        lastMovementsByItem.set(m.menu_item_id, {
          created_at: m.created_at,
          kind: m.kind,
        });
      }
    }
  }

  let result = items.map<MenuItemWithStockInfo>((it) => ({
    ...it,
    category_title: catMap.get(it.category_id)?.title,
    category_icon: catMap.get(it.category_id)?.icon,
    last_movement_at: lastMovementsByItem.get(it.id)?.created_at ?? null,
    last_movement_kind: lastMovementsByItem.get(it.id)?.kind ?? null,
  }));

  /* Filter onlyAlerts côté JS car PostgREST ne fait pas le compare facilement */
  if (options.onlyAlerts) {
    result = result.filter(
      (i) =>
        i.track_stock &&
        i.stock_quantity !== null &&
        i.stock_quantity !== undefined &&
        i.stock_quantity <= (i.stock_threshold_low ?? 5)
    );
  }

  return result;
}

/**
 * Stats globales sur le stock (pour dashboard / banner).
 */
export interface StockStats {
  tracked_items: number;       // nb items avec track_stock = true
  low_stock_count: number;     // <= threshold
  out_of_stock_count: number;  // = 0
  total_value_cents: number;   // sum(quantity × price)
}

export async function getStockStats(tenantId?: string): Promise<StockStats> {
  if (!USE_SUPABASE) {
    return {
      tracked_items: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      total_value_cents: 0,
    };
  }
  const tid = await resolveTenantId(tenantId);

  const items = await sb<{
    id: string;
    price_cents: number;
    track_stock: boolean;
    stock_quantity: number | null;
    stock_threshold_low: number | null;
  }[]>(
    `menu_items?select=id,price_cents,track_stock,stock_quantity,stock_threshold_low&track_stock=eq.true${tc(tid)}`
  );

  let low = 0;
  let out = 0;
  let total = 0;
  for (const it of items) {
    const q = it.stock_quantity ?? 0;
    const threshold = it.stock_threshold_low ?? 5;
    if (q === 0) out++;
    else if (q <= threshold) low++;
    total += q * it.price_cents;
  }

  return {
    tracked_items: items.length,
    low_stock_count: low,
    out_of_stock_count: out,
    total_value_cents: total,
  };
}

/* ═══════════════════════════════════════════════════════════
   STOCK MOUVEMENTS — entrées/sorties
   ═══════════════════════════════════════════════════════════ */

/**
 * Enregistre un mouvement de stock + applique le delta sur menu_items.
 *
 * Atomicity : on lit le quantity courant, on le met à jour avec delta,
 * puis on insert le mouvement avec le snapshot. Race-condition possible
 * en cas de paiements simultanés mais acceptable pour un POS resto
 * (max 5-10 commandes/min, l'écart se rattrape via inventaire physique).
 */
export async function applyStockMovement(
  itemId: string,
  delta: number,
  kind: StockMovementKind,
  options: {
    notes?: string;
    createdByStaffId?: string;
    orderId?: string;
    tenantId?: string;
  } = {}
): Promise<{ item: MenuItemRow; movement: StockMovementRow } | null> {
  if (!USE_SUPABASE) return null;
  if (delta === 0) return null;
  const tid = await resolveTenantId(options.tenantId);

  /* 1. Lit l'item courant */
  const [item] = await sb<MenuItemRow[]>(
    `menu_items?select=*&id=eq.${encodeURIComponent(itemId)}${tc(tid)}&limit=1`
  );
  if (!item) return null;

  /* Si l'item ne track pas le stock, on ignore (sauf si c'est un restock
   * qui active implicitement le tracking). */
  if (!item.track_stock && kind !== "restock") return null;

  const currentQty = item.stock_quantity ?? 0;
  const newQty = Math.max(0, currentQty + delta);

  /* 2. Met à jour le stock + active track_stock si c'est un restock initial */
  const patch: Record<string, unknown> = {
    stock_quantity: newQty,
  };
  if (kind === "restock" && !item.track_stock) {
    patch.track_stock = true;
  }
  const [updated] = await sb<MenuItemRow[]>(
    `menu_items?id=eq.${encodeURIComponent(itemId)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );

  /* 3. Insère le mouvement */
  const [movement] = await sb<StockMovementRow[]>("stock_movements", {
    method: "POST",
    body: JSON.stringify({
      restaurant_id: tid,
      menu_item_id: itemId,
      kind,
      delta,
      quantity_after: newQty,
      notes: options.notes ?? null,
      created_by_staff_id: options.createdByStaffId ?? null,
      order_id: options.orderId ?? null,
    }),
  });

  /* 4. Auto-86 si stock = 0 (le QR menu n'affichera plus le plat) */
  if (newQty === 0 && item.track_stock) {
    await autoMarkEightySix(itemId, tid).catch(() => null);
  } else if (newQty > 0 && currentQty === 0) {
    /* Inverse : si on remet du stock, retire de la 86 list */
    await autoUnmarkEightySix(itemId, tid).catch(() => null);
  }

  return { item: updated, movement };
}

/**
 * Configure le tracking d'un item (toggle track_stock + threshold).
 * Si on active track_stock pour la 1ère fois, on init quantity = 0
 * (le manager doit faire un restock ensuite).
 */
export async function configureItemStock(
  itemId: string,
  config: {
    track_stock?: boolean;
    stock_quantity?: number;
    stock_threshold_low?: number;
  },
  tenantId?: string
): Promise<MenuItemRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const patch: Record<string, unknown> = {};
  if (config.track_stock !== undefined) {
    patch.track_stock = config.track_stock;
    if (config.track_stock && config.stock_quantity === undefined) {
      patch.stock_quantity = 0;
    }
  }
  if (config.stock_quantity !== undefined) {
    patch.stock_quantity = Math.max(0, Math.floor(config.stock_quantity));
  }
  if (config.stock_threshold_low !== undefined) {
    patch.stock_threshold_low = Math.max(
      0,
      Math.floor(config.stock_threshold_low)
    );
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  const [updated] = await sb<MenuItemRow[]>(
    `menu_items?id=eq.${encodeURIComponent(itemId)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return updated ?? null;
}

/**
 * Liste les mouvements récents d'un item (audit history).
 */
export async function listMovementsForItem(
  itemId: string,
  limit: number = 50,
  tenantId?: string
): Promise<StockMovementRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<StockMovementRow[]>(
    `stock_movements?select=*&menu_item_id=eq.${encodeURIComponent(itemId)}${tc(tid)}&order=created_at.desc&limit=${limit}`
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTO 86 LIST — synchro stock = 0 → eighty_six_list
   ═══════════════════════════════════════════════════════════ */

async function autoMarkEightySix(itemId: string, tid: string): Promise<void> {
  const settings = await sb<{ id: number; eighty_six_list: string[] }[]>(
    `restaurant_settings?select=id,eighty_six_list${tc(tid)}&limit=1`
  );
  if (settings.length === 0) return;
  const current = settings[0].eighty_six_list ?? [];
  if (current.includes(itemId)) return;

  await sb(
    `restaurant_settings?id=eq.${settings[0].id}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        eighty_six_list: [...current, itemId],
      }),
    }
  );
}

async function autoUnmarkEightySix(
  itemId: string,
  tid: string
): Promise<void> {
  const settings = await sb<{ id: number; eighty_six_list: string[] }[]>(
    `restaurant_settings?select=id,eighty_six_list${tc(tid)}&limit=1`
  );
  if (settings.length === 0) return;
  const current = settings[0].eighty_six_list ?? [];
  if (!current.includes(itemId)) return;

  await sb(
    `restaurant_settings?id=eq.${settings[0].id}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        eighty_six_list: current.filter((id) => id !== itemId),
      }),
    }
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTO HOOKS — décrement on fire / recrédit on cancel
   ═══════════════════════════════════════════════════════════ */

/**
 * Décrémente le stock pour les items vendus (sales) lors du fire d'une
 * commande. Appelé par fireOrder/fireOrderByCategories. Best-effort —
 * un échec ne bloque pas la commande.
 */
export async function decrementStockForOrderItems(
  orderId: string,
  itemIds: string[],
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE || itemIds.length === 0) return;
  const tid = await resolveTenantId(tenantId);

  /* Group by menu_item_id pour aggréger les quantités */
  const counts = new Map<string, number>();
  for (const id of itemIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  for (const [menuItemId, qty] of counts.entries()) {
    await applyStockMovement(menuItemId, -qty, "sale", {
      orderId,
      tenantId: tid,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[stock] decrement failed for ${menuItemId}:`,
        (err as Error).message
      );
    });
  }
}

/**
 * Recrédit le stock pour les items annulés (return).
 */
export async function recreditStockForOrderItems(
  orderId: string,
  itemIds: string[],
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE || itemIds.length === 0) return;
  const tid = await resolveTenantId(tenantId);

  const counts = new Map<string, number>();
  for (const id of itemIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  for (const [menuItemId, qty] of counts.entries()) {
    await applyStockMovement(menuItemId, qty, "return", {
      orderId,
      tenantId: tid,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[stock] recredit failed for ${menuItemId}:`,
        (err as Error).message
      );
    });
  }
}
