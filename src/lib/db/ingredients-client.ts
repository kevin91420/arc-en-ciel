/**
 * INGREDIENTS CLIENT — Sprint 7b Stock Niveau 2.
 *
 * Gère l'inventaire physique en cuisine (ingrédients) et les mouvements
 * (restock, consume, loss, adjustment, inventory).
 *
 * Tenant-aware via getCurrentTenantId() avec override possible par paramètre.
 */

import type {
  IngredientRow,
  IngredientMovementRow,
  IngredientMovementKind,
  IngredientStats,
  IngredientCategory,
  IngredientUnit,
} from "./ingredient-types";
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

export async function listIngredients(
  options: {
    onlyActive?: boolean;
    onlyAlerts?: boolean;
    category?: IngredientCategory;
    tenantId?: string;
  } = {}
): Promise<IngredientRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(options.tenantId);

  let extra = "";
  if (options.onlyActive ?? true) extra += "&active=eq.true";
  if (options.category) {
    extra += `&category=eq.${encodeURIComponent(options.category)}`;
  }

  const items = await sb<IngredientRow[]>(
    `ingredients?select=*${tc(tid)}${extra}&order=name.asc`
  );

  if (options.onlyAlerts) {
    return items.filter(
      (i) => Number(i.stock_quantity) <= Number(i.stock_threshold_low)
    );
  }

  return items;
}

export async function getIngredient(
  id: string,
  tenantId?: string
): Promise<IngredientRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<IngredientRow[]>(
    `ingredients?select=*&id=eq.${encodeURIComponent(id)}${tc(tid)}&limit=1`
  );
  return rows[0] ?? null;
}

export async function getIngredientStats(
  tenantId?: string
): Promise<IngredientStats> {
  if (!USE_SUPABASE) {
    return {
      total_ingredients: 0,
      active_ingredients: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      total_value_cents: 0,
    };
  }
  const tid = await resolveTenantId(tenantId);

  const items = await sb<{
    id: string;
    active: boolean;
    stock_quantity: number;
    stock_threshold_low: number;
    cost_per_unit_cents: number;
  }[]>(
    `ingredients?select=id,active,stock_quantity,stock_threshold_low,cost_per_unit_cents${tc(tid)}`
  );

  let active = 0;
  let low = 0;
  let out = 0;
  let value = 0;
  for (const it of items) {
    if (!it.active) continue;
    active++;
    const q = Number(it.stock_quantity);
    const th = Number(it.stock_threshold_low);
    if (q === 0) out++;
    else if (q <= th) low++;
    value += Math.round(q * it.cost_per_unit_cents);
  }

  return {
    total_ingredients: items.length,
    active_ingredients: active,
    low_stock_count: low,
    out_of_stock_count: out,
    total_value_cents: value,
  };
}

/* ═══════════════════════════════════════════════════════════
   WRITE — CRUD
   ═══════════════════════════════════════════════════════════ */

export async function createIngredient(
  data: {
    name: string;
    unit: IngredientUnit;
    category?: IngredientCategory;
    stock_quantity?: number;
    stock_threshold_low?: number;
    stock_target?: number | null;
    cost_per_unit_cents?: number;
    supplier_name?: string | null;
    supplier_ref?: string | null;
    notes?: string | null;
  },
  tenantId?: string
): Promise<IngredientRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const payload = {
    restaurant_id: tid,
    name: data.name.trim(),
    unit: data.unit,
    category: data.category ?? "Autre",
    stock_quantity: data.stock_quantity ?? 0,
    stock_threshold_low: data.stock_threshold_low ?? 0,
    stock_target: data.stock_target ?? null,
    cost_per_unit_cents: data.cost_per_unit_cents ?? 0,
    supplier_name: data.supplier_name ?? null,
    supplier_ref: data.supplier_ref ?? null,
    notes: data.notes ?? null,
    active: true,
  };

  const rows = await sb<IngredientRow[]>("ingredients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return rows[0] ?? null;
}

export async function updateIngredient(
  id: string,
  patch: Partial<{
    name: string;
    unit: IngredientUnit;
    category: IngredientCategory;
    stock_threshold_low: number;
    stock_target: number | null;
    cost_per_unit_cents: number;
    supplier_name: string | null;
    supplier_ref: string | null;
    notes: string | null;
    active: boolean;
  }>,
  tenantId?: string
): Promise<IngredientRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }
  if (Object.keys(cleaned).length === 0) return null;
  cleaned.updated_at = new Date().toISOString();

  const rows = await sb<IngredientRow[]>(
    `ingredients?id=eq.${encodeURIComponent(id)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(cleaned),
    }
  );
  return rows[0] ?? null;
}

export async function archiveIngredient(
  id: string,
  tenantId?: string
): Promise<boolean> {
  const updated = await updateIngredient(id, { active: false }, tenantId);
  return Boolean(updated);
}

/* ═══════════════════════════════════════════════════════════
   STOCK MOUVEMENTS
   ═══════════════════════════════════════════════════════════ */

/**
 * Applique un mouvement de stock + audit.
 * - Pour `restock` : delta > 0, si cost_per_unit_cents fourni, on update
 *   le coût moyen pondéré sur l'ingrédient (méthode CMP).
 * - Pour `consume`/`loss` : delta < 0.
 */
export async function applyIngredientMovement(
  ingredientId: string,
  delta: number,
  kind: IngredientMovementKind,
  options: {
    notes?: string;
    reference?: string;
    costPerUnitCents?: number;
    orderId?: string;
    menuItemId?: string;
    createdByStaffId?: string;
    tenantId?: string;
  } = {}
): Promise<{
  ingredient: IngredientRow;
  movement: IngredientMovementRow;
} | null> {
  if (!USE_SUPABASE) return null;
  if (delta === 0 && kind !== "inventory") return null;
  const tid = await resolveTenantId(options.tenantId);

  /* 1. Lit l'ingrédient courant */
  const [ing] = await sb<IngredientRow[]>(
    `ingredients?select=*&id=eq.${encodeURIComponent(ingredientId)}${tc(tid)}&limit=1`
  );
  if (!ing) return null;

  const currentQty = Number(ing.stock_quantity);
  let newQty: number;
  if (kind === "inventory") {
    /* Pour un inventory, delta est le quantity absolu trouvé physiquement.
     * On stocke quand même delta = (newQty - currentQty) pour traçabilité. */
    newQty = Math.max(0, delta);
  } else {
    newQty = Math.max(0, Number((currentQty + delta).toFixed(3)));
  }

  /* 2. Update stock + éventuellement coût (CMP sur restock avec coût) */
  const patch: Record<string, unknown> = {
    stock_quantity: newQty,
    updated_at: new Date().toISOString(),
  };

  if (
    kind === "restock" &&
    delta > 0 &&
    typeof options.costPerUnitCents === "number" &&
    options.costPerUnitCents > 0
  ) {
    /* Coût moyen pondéré (Weighted Average Cost) :
     *   nouveauCoût = ((qtyExistante × ancienCoût) + (qtyAjoutée × coûtNouvLot)) / (qtyExistante + qtyAjoutée)
     * Si stock vide avant restock, on prend simplement le coût du nouveau lot.
     */
    const qBefore = currentQty;
    const cBefore = ing.cost_per_unit_cents;
    const qAdd = delta;
    const cAdd = options.costPerUnitCents;
    const total = qBefore + qAdd;
    if (total > 0) {
      const newCost = Math.round(
        (qBefore * cBefore + qAdd * cAdd) / total
      );
      patch.cost_per_unit_cents = newCost;
    } else {
      patch.cost_per_unit_cents = cAdd;
    }
  }

  const [updated] = await sb<IngredientRow[]>(
    `ingredients?id=eq.${encodeURIComponent(ingredientId)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );

  /* 3. Insert movement */
  const realDelta =
    kind === "inventory" ? newQty - currentQty : delta;

  const [movement] = await sb<IngredientMovementRow[]>("ingredient_movements", {
    method: "POST",
    body: JSON.stringify({
      restaurant_id: tid,
      ingredient_id: ingredientId,
      kind,
      delta: Number(realDelta.toFixed(3)),
      quantity_after: newQty,
      cost_per_unit_cents: options.costPerUnitCents ?? null,
      order_id: options.orderId ?? null,
      menu_item_id: options.menuItemId ?? null,
      created_by_staff_id: options.createdByStaffId ?? null,
      reference: options.reference ?? null,
      notes: options.notes ?? null,
    }),
  });

  return { ingredient: updated, movement };
}

export async function listIngredientMovements(
  ingredientId: string,
  limit: number = 50,
  tenantId?: string
): Promise<IngredientMovementRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<IngredientMovementRow[]>(
    `ingredient_movements?select=*&ingredient_id=eq.${encodeURIComponent(ingredientId)}${tc(tid)}&order=created_at.desc&limit=${limit}`
  );
}

/** Liste les derniers mouvements toutes catégories (utile pour le journal global) */
export async function listRecentIngredientMovements(
  limit: number = 100,
  tenantId?: string
): Promise<IngredientMovementRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<IngredientMovementRow[]>(
    `ingredient_movements?select=*${tc(tid)}&order=created_at.desc&limit=${limit}`
  );
}
