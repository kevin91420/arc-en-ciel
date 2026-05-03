/**
 * POS CLIENT — DB functions for orders, items, staff, stats.
 * Sprint 7b Phase F : tenant-aware. Toutes les queries filtrent par
 * `restaurant_id` du tenant courant (résolu via getCurrentTenantId()).
 *
 * Les inserts incluent `restaurant_id` dans le body. Les patches/deletes
 * filtrent par restaurant_id pour empêcher de toucher les données d'un
 * autre tenant.
 *
 * Pour les contextes hors-requête (seed scripts, webhooks Stripe), un
 * `tenantId` explicite peut être passé en dernier argument.
 */

import type {
  StaffMember,
  Order,
  OrderItem,
  OrderWithItems,
  OrderStatus,
  OrderPayment,
  CreatePaymentPayload,
  KitchenTicket,
  ServiceStats,
  CreateOrderPayload,
  AddItemsPayload,
  PaymentMethod,
  Station,
  OrderFlag,
  OrderCancellation,
  CancellationReason,
  RefundMethod,
  CashSession,
} from "./pos-types";
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

/** Filter clause "&restaurant_id=eq.<uuid>" — pré-formaté pour PostgREST. */
function tenantClause(tenantId: string): string {
  return `&restaurant_id=eq.${encodeURIComponent(tenantId)}`;
}

/* ═══════════════════════════════════════════════════════════
   STAFF AUTH — PIN-based (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function findStaffByPin(
  pin: string,
  tenantId?: string
): Promise<StaffMember | null> {
  if (!USE_SUPABASE) {
    /* Demo fallback — pas de tenant filtering en mode mémoire */
    if (pin === "1234")
      return {
        id: "demo-manager",
        name: "Kevin",
        pin_code: "1234",
        role: "manager",
        color: "#C0392B",
        active: true,
        created_at: new Date().toISOString(),
      };
    if (pin === "2024")
      return {
        id: "demo-server",
        name: "Sophie",
        pin_code: "2024",
        role: "server",
        color: "#B8922F",
        active: true,
        created_at: new Date().toISOString(),
      };
    if (pin === "9999")
      return {
        id: "demo-chef",
        name: "Chef Luca",
        pin_code: "9999",
        role: "chef",
        color: "#8B6914",
        active: true,
        created_at: new Date().toISOString(),
      };
    return null;
  }

  const tid = await resolveTenantId(tenantId);
  const rows = await sb<StaffMember[]>(
    `staff_members?select=*&pin_code=eq.${encodeURIComponent(pin)}&active=eq.true${tenantClause(tid)}&limit=1`
  );
  return rows[0] || null;
}

export async function listStaff(tenantId?: string): Promise<StaffMember[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<StaffMember[]>(
    `staff_members?select=*&active=eq.true${tenantClause(tid)}&order=name.asc`
  );
}

export async function getStaffById(
  id: string,
  tenantId?: string
): Promise<StaffMember | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<StaffMember[]>(
    `staff_members?select=*&id=eq.${id}${tenantClause(tid)}&limit=1`
  );
  return rows[0] || null;
}

/* ═══════════════════════════════════════════════════════════
   ORDERS (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function createOrder(
  payload: CreateOrderPayload,
  tenantId?: string
): Promise<Order> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const [row] = await sb<Order[]>(`orders`, {
    method: "POST",
    body: JSON.stringify({
      table_number: payload.table_number,
      source: payload.source || "dine_in",
      guest_count: payload.guest_count || 1,
      staff_id: payload.staff_id,
      customer_id: payload.customer_id,
      notes: payload.notes,
      status: "open",
      restaurant_id: tid,
    }),
  });
  return row;
}

export async function getOrder(
  id: string,
  tenantId?: string
): Promise<OrderWithItems | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const [order] = await sb<Order[]>(
    `orders?select=*&id=eq.${id}${tenantClause(tid)}&limit=1`
  );
  if (!order) return null;
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=eq.${id}${tenantClause(tid)}&order=created_at.asc`
  );
  let staffName: string | undefined;
  let staffColor: string | undefined;
  if (order.staff_id) {
    const [staff] = await sb<StaffMember[]>(
      `staff_members?select=name,color&id=eq.${order.staff_id}${tenantClause(tid)}&limit=1`
    );
    staffName = staff?.name;
    staffColor = staff?.color;
  }
  return { ...order, items, staff_name: staffName, staff_color: staffColor };
}

/**
 * Get active order for a table (status in open/fired/ready), if any.
 * Filtré par tenant — table 5 d'Arc-en-Ciel ≠ table 5 de Pizzeria-Test.
 */
export async function getActiveOrderForTable(
  tableNumber: number,
  tenantId?: string
): Promise<OrderWithItems | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<Order[]>(
    `orders?select=*&table_number=eq.${tableNumber}&status=in.(open,fired,ready,served)${tenantClause(tid)}&order=created_at.desc&limit=1`
  );
  if (rows.length === 0) return null;
  return getOrder(rows[0].id, tid);
}

export async function listActiveOrders(
  tenantId?: string
): Promise<OrderWithItems[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  const orders = await sb<Order[]>(
    `orders?select=*&status=in.(open,fired,ready,served)${tenantClause(tid)}&order=created_at.desc`
  );
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=in.(${ids.map((i) => `"${i}"`).join(",")})${tenantClause(tid)}&order=created_at.asc`
  );
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id)!.push(item);
  }
  const staffIds = [
    ...new Set(orders.map((o) => o.staff_id).filter(Boolean)),
  ] as string[];
  const staffMap = new Map<string, { name: string; color: string }>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name,color&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})${tenantClause(tid)}`
    );
    for (const s of staff) staffMap.set(s.id, { name: s.name, color: s.color });
  }
  return orders.map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) || [],
    staff_name: o.staff_id ? staffMap.get(o.staff_id)?.name : undefined,
    staff_color: o.staff_id ? staffMap.get(o.staff_id)?.color : undefined,
  }));
}

export async function addItemsToOrder(
  orderId: string,
  payload: AddItemsPayload,
  tenantId?: string
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const rows = payload.items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    menu_item_name: item.menu_item_name,
    menu_item_category: item.menu_item_category,
    price_cents: item.price_cents,
    quantity: item.quantity || 1,
    modifiers: item.modifiers || [],
    notes: item.notes,
    station: item.station || "main",
    status: "pending",
    restaurant_id: tid,
  }));
  await sb(`order_items`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
  await recomputeOrderTotals(orderId, tid);
  const updated = await getOrder(orderId, tid);
  if (!updated) throw new Error("Order not found after add");
  return updated;
}

export async function removeItem(
  itemId: string,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);
  const [item] = await sb<OrderItem[]>(
    `order_items?select=order_id&id=eq.${itemId}${tenantClause(tid)}&limit=1`
  );
  await sb(`order_items?id=eq.${itemId}${tenantClause(tid)}`, {
    method: "DELETE",
  });
  if (item?.order_id) await recomputeOrderTotals(item.order_id, tid);
}

export async function updateItemStatus(
  itemId: string,
  status: OrderItem["status"],
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);
  const updates: Record<string, unknown> = { status };
  if (status === "cooking") updates.fired_at = new Date().toISOString();
  if (status === "ready") updates.ready_at = new Date().toISOString();
  if (status === "served") updates.served_at = new Date().toISOString();
  await sb(`order_items?id=eq.${itemId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/**
 * Update editable fields on a pending order item.
 *
 * Business rule: quantity / modifiers / notes can ONLY be edited while the
 * item is still `pending` (i.e. not yet fired to the kitchen).
 *
 * Throws `ItemNotPendingError` si on tente de modifier un item non-pending.
 */
export class ItemNotPendingError extends Error {
  constructor(public readonly currentStatus: OrderItem["status"]) {
    super(
      `Item is ${currentStatus}, not pending — cannot edit quantity/modifiers/notes`
    );
    this.name = "ItemNotPendingError";
  }
}

export interface UpdateItemPayload {
  quantity?: number;
  modifiers?: string[];
  notes?: string | null;
  status?: OrderItem["status"];
}

export async function updateItem(
  itemId: string,
  updates: UpdateItemPayload,
  tenantId?: string
): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const wantsMutableFields =
    updates.quantity !== undefined ||
    updates.modifiers !== undefined ||
    updates.notes !== undefined;

  const [current] = await sb<OrderItem[]>(
    `order_items?select=*&id=eq.${itemId}${tenantClause(tid)}&limit=1`
  );
  if (!current) return null;

  if (wantsMutableFields && current.status !== "pending") {
    throw new ItemNotPendingError(current.status);
  }

  const patch: Record<string, unknown> = {};
  if (updates.quantity !== undefined) {
    const q = Math.floor(updates.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 50) {
      throw new Error("quantity must be an integer between 1 and 50");
    }
    patch.quantity = q;
  }
  if (updates.modifiers !== undefined) {
    patch.modifiers = updates.modifiers;
  }
  if (updates.notes !== undefined) {
    patch.notes = updates.notes;
  }
  if (updates.status !== undefined) {
    patch.status = updates.status;
    if (updates.status === "cooking")
      patch.fired_at = new Date().toISOString();
    if (updates.status === "ready") patch.ready_at = new Date().toISOString();
    if (updates.status === "served")
      patch.served_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return current;

  const [updated] = await sb<OrderItem[]>(
    `order_items?id=eq.${itemId}${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );

  await recomputeOrderTotals(current.order_id, tid);

  return updated ?? current;
}

/**
 * Fire the order → mark all pending items as cooking.
 */
export async function fireOrder(
  orderId: string,
  tenantId?: string
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const now = new Date().toISOString();
  await sb(
    `order_items?order_id=eq.${orderId}&status=eq.pending${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "cooking", fired_at: now }),
    }
  );
  await sb(`orders?id=eq.${orderId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "fired", fired_at: now }),
  });
  const updated = await getOrder(orderId, tid);
  if (!updated) throw new Error("Order not found after fire");
  return updated;
}

/**
 * Fire only the pending items whose category matches the given list of categories.
 */
export async function fireOrderByCategories(
  orderId: string,
  categories: string[],
  tenantId?: string
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  if (categories.length === 0) {
    const current = await getOrder(orderId, tid);
    if (!current) throw new Error("Order not found");
    return current;
  }
  const now = new Date().toISOString();
  const catList = categories
    .map((c) => `"${c.replace(/"/g, "")}"`)
    .join(",");
  await sb(
    `order_items?order_id=eq.${orderId}&status=eq.pending&menu_item_category=in.(${catList})${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "cooking", fired_at: now }),
    }
  );
  await sb(`orders?id=eq.${orderId}&status=eq.open${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "fired", fired_at: now }),
  });
  const updated = await getOrder(orderId, tid);
  if (!updated) throw new Error("Order not found after fire");
  return updated;
}

/**
 * Set the flags array on an order.
 */
export async function setOrderFlags(
  orderId: string,
  flags: OrderFlag[],
  tenantId?: string
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  await sb(`orders?id=eq.${orderId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify({ flags }),
  });
  const updated = await getOrder(orderId, tid);
  if (!updated) throw new Error("Order not found");
  return updated;
}

/**
 * Mark a `ready` item as picked up by the server (acknowledged_at = now).
 */
export async function acknowledgeItem(
  itemId: string,
  tenantId?: string
): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const [updated] = await sb<OrderItem[]>(
    `order_items?id=eq.${itemId}${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ acknowledged_at: new Date().toISOString() }),
    }
  );
  return updated ?? null;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);
  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "ready") updates.ready_at = now;
  if (status === "served") updates.served_at = now;
  if (status === "paid") updates.paid_at = now;
  await sb(`orders?id=eq.${orderId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function payOrder(
  orderId: string,
  method: PaymentMethod,
  tipCents = 0,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);
  await sb(`orders?id=eq.${orderId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "paid",
      payment_method: method,
      tip_cents: tipCents,
      paid_at: new Date().toISOString(),
    }),
  });
}

/* ═══════════════════════════════════════════════════════════
   ORDER PAYMENTS — split par items / split par couverts (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function listPaymentsForOrder(
  orderId: string,
  tenantId?: string
): Promise<OrderPayment[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<OrderPayment[]>(
    `order_payments?select=*&order_id=eq.${orderId}${tenantClause(tid)}&order=created_at.asc`
  );
}

export async function addPayment(
  orderId: string,
  payload: CreatePaymentPayload,
  tenantId?: string
): Promise<OrderPayment> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const [row] = await sb<OrderPayment[]>("order_payments", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      amount_cents: Math.round(payload.amount_cents),
      tip_cents: Math.max(0, Math.round(payload.tip_cents ?? 0)),
      method: payload.method,
      item_ids: payload.item_ids ?? [],
      staff_id: payload.staff_id ?? null,
      notes: payload.notes ?? null,
      restaurant_id: tid,
    }),
  });
  return row;
}

export async function deletePayment(
  paymentId: string,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);
  await sb(`order_payments?id=eq.${paymentId}${tenantClause(tid)}`, {
    method: "DELETE",
  });
}

/* ═══════════════════════════════════════════════════════════
   ORDER HISTORY (paid orders for a day)
   ═══════════════════════════════════════════════════════════ */

export interface PaidOrderHistoryEntry {
  order_id: string;
  table_number: number | null;
  source: string;
  guest_count: number;
  staff_id?: string | null;
  staff_name?: string;
  total_cents: number;
  tip_cents: number;
  payment_method?: string | null;
  items_count: number;
  created_at: string;
  paid_at: string;
  duration_minutes: number;
  flags?: string[];
}

/* ═══════════════════════════════════════════════════════════
   ORDER CANCELLATIONS — tenant-scoped
   ═══════════════════════════════════════════════════════════ */

export async function cancelOrder(
  orderId: string,
  payload: {
    reason: CancellationReason;
    notes?: string;
    refund_method?: RefundMethod;
    refund_amount_cents?: number;
    staff_id?: string;
  },
  tenantId?: string
): Promise<OrderCancellation> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const refundMethod = payload.refund_method ?? "none";
  const refundAmount = Math.max(
    0,
    Math.round(payload.refund_amount_cents ?? 0)
  );

  const [row] = await sb<OrderCancellation[]>(`order_cancellations`, {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      reason: payload.reason,
      notes: payload.notes ?? null,
      cancelled_by: payload.staff_id ?? null,
      refund_method: refundMethod,
      refund_amount_cents: refundAmount,
      restaurant_id: tid,
    }),
  });

  await sb(`orders?id=eq.${orderId}${tenantClause(tid)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "cancelled",
      paid_at: null,
    }),
  });
  await sb(
    `order_items?order_id=eq.${orderId}&status=in.(pending,cooking,ready,served)${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    }
  );

  if (refundAmount > 0 && refundMethod !== "voucher" && refundMethod !== "none") {
    await sb(`order_payments`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        amount_cents: -refundAmount,
        tip_cents: 0,
        method: refundMethod,
        notes: `Remboursement (${payload.reason})`,
        restaurant_id: tid,
      }),
    }).catch(() => null);
  }

  return row;
}

export async function listCancellationsForOrder(
  orderId: string,
  tenantId?: string
): Promise<OrderCancellation[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  return sb<OrderCancellation[]>(
    `order_cancellations?select=*&order_id=eq.${orderId}${tenantClause(tid)}&order=cancelled_at.desc`
  );
}

/* ═══════════════════════════════════════════════════════════
   CASH SESSIONS — tenant-scoped
   ═══════════════════════════════════════════════════════════ */

export async function getCurrentCashSession(
  tenantId?: string
): Promise<CashSession | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<CashSession[]>(
    `cash_sessions?select=*&closed_at=is.null${tenantClause(tid)}&order=opened_at.desc&limit=1`
  );
  return rows[0] || null;
}

export async function openCashSession(
  payload: {
    opening_amount_cents: number;
    staff_id?: string;
    notes?: string;
  },
  tenantId?: string
): Promise<CashSession> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const existing = await getCurrentCashSession(tid);
  if (existing) {
    throw new Error("Une session de caisse est déjà ouverte.");
  }
  const [row] = await sb<CashSession[]>(`cash_sessions`, {
    method: "POST",
    body: JSON.stringify({
      opening_amount_cents: Math.max(
        0,
        Math.round(payload.opening_amount_cents)
      ),
      opened_by: payload.staff_id ?? null,
      notes: payload.notes ?? null,
      restaurant_id: tid,
    }),
  });
  return row;
}

export async function computeCashTakingsSinceOpen(
  sessionOpenedAt: string,
  tenantId?: string
): Promise<number> {
  if (!USE_SUPABASE) return 0;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<{ amount_cents: number }[]>(
    `order_payments?select=amount_cents&method=eq.cash&created_at=gte.${encodeURIComponent(sessionOpenedAt)}${tenantClause(tid)}`
  );
  return rows.reduce((s, r) => s + (r.amount_cents || 0), 0);
}

export async function closeCashSession(
  sessionId: string,
  payload: {
    actual_cash_cents: number;
    staff_id?: string;
    notes?: string;
    /* Sprint 7b QW#5 — détail des dénominations pour traçabilité fine.
     * Si fourni, on stocke le breakdown ; le total est recalculé côté serveur
     * pour vérifier qu'il matche bien actual_cash_cents (sécurité) et on
     * privilégie le total recalculé pour éviter les divergences. */
    cash_breakdown?: import("./pos-types").CashBreakdown;
  },
  tenantId?: string
): Promise<CashSession> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const tid = await resolveTenantId(tenantId);
  const [session] = await sb<CashSession[]>(
    `cash_sessions?select=*&id=eq.${sessionId}${tenantClause(tid)}&limit=1`
  );
  if (!session) throw new Error("Session de caisse introuvable.");
  if (session.closed_at) throw new Error("Session déjà fermée.");

  const takings = await computeCashTakingsSinceOpen(session.opened_at, tid);
  const expected = session.opening_amount_cents + takings;

  /* Si on a un breakdown, on recalcule le total côté serveur — c'est la
   * source de vérité. Le client peut envoyer actual_cash_cents pour
   * compatibilité legacy, mais le breakdown override si présent. */
  let actualCents = Math.max(0, Math.round(payload.actual_cash_cents));
  let breakdown: import("./pos-types").CashBreakdown | null = null;
  if (payload.cash_breakdown) {
    /* Import dynamique pour éviter les cycles si pos-types s'enrichit */
    const { computeCashBreakdownTotal } = await import("./pos-types");
    breakdown = sanitizeBreakdown(payload.cash_breakdown);
    actualCents = computeCashBreakdownTotal(breakdown);
  }

  const [row] = await sb<CashSession[]>(
    `cash_sessions?id=eq.${sessionId}${tenantClause(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        closed_at: new Date().toISOString(),
        expected_cash_cents: expected,
        actual_cash_cents: actualCents,
        closed_by: payload.staff_id ?? null,
        notes: payload.notes
          ? `${session.notes ?? ""}\n[Fermeture] ${payload.notes}`.trim()
          : session.notes,
        cash_breakdown: breakdown,
      }),
    }
  );
  return row;
}

/**
 * Coerce le breakdown reçu : entiers positifs uniquement, clés autorisées
 * uniquement. Évite qu'un client envoie des valeurs absurdes.
 */
function sanitizeBreakdown(
  raw: import("./pos-types").CashBreakdown
): import("./pos-types").CashBreakdown {
  const ALLOWED_KEYS = [
    "b500", "b200", "b100", "b50", "b20", "b10", "b5",
    "c200", "c100", "c050", "c020", "c010", "c005", "c002", "c001",
  ] as const;
  const out: Record<string, number> = {};
  for (const k of ALLOWED_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && n < 100_000) {
      out[k] = Math.floor(n);
    }
  }
  return out as import("./pos-types").CashBreakdown;
}

export async function listCashSessions(
  isoDate: string,
  tenantId?: string
): Promise<CashSession[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  const start = new Date(`${isoDate}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return sb<CashSession[]>(
    `cash_sessions?select=*&opened_at=gte.${encodeURIComponent(start.toISOString())}&opened_at=lt.${encodeURIComponent(end.toISOString())}${tenantClause(tid)}&order=opened_at.asc`
  );
}

/* ═══════════════════════════════════════════════════════════
   Z REPORT — rapport de fin de service (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export interface ZReport {
  date: string; // YYYY-MM-DD
  generated_at: string;
  totals: {
    orders_count: number;
    guests_count: number;
    revenue_ht_cents: number;
    revenue_ttc_cents: number;
    tax_cents: number;
    tip_cents: number;
    avg_ticket_cents: number;
    avg_per_guest_cents: number;
    cancelled_orders: number;
    refund_total_cents: number;
  };
  by_method: Array<{
    method: string;
    amount_cents: number;
    count: number;
  }>;
  by_staff: Array<{
    staff_id: string;
    staff_name: string;
    orders_count: number;
    revenue_cents: number;
    tip_cents: number;
  }>;
  top_items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    revenue_cents: number;
  }>;
  by_hour: Array<{
    hour: number;
    orders: number;
    revenue_cents: number;
  }>;
  cash_sessions: CashSession[];
  cancellations: Array<{
    order_id: string;
    table_number: number | null;
    reason: string;
    refund_amount_cents: number;
    cancelled_at: string;
  }>;
}

export async function getZReport(
  isoDate: string,
  tenantId?: string
): Promise<ZReport> {
  const generated_at = new Date().toISOString();
  if (!USE_SUPABASE) {
    return {
      date: isoDate,
      generated_at,
      totals: {
        orders_count: 0,
        guests_count: 0,
        revenue_ht_cents: 0,
        revenue_ttc_cents: 0,
        tax_cents: 0,
        tip_cents: 0,
        avg_ticket_cents: 0,
        avg_per_guest_cents: 0,
        cancelled_orders: 0,
        refund_total_cents: 0,
      },
      by_method: [],
      by_staff: [],
      top_items: [],
      by_hour: [],
      cash_sessions: [],
      cancellations: [],
    };
  }
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const start = new Date(`${isoDate}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const orders = await sb<Order[]>(
    `orders?select=*&status=eq.paid&paid_at=gte.${encodeURIComponent(startISO)}&paid_at=lt.${encodeURIComponent(endISO)}${tc}&order=paid_at.asc`
  );

  const cancelled = await sb<Order[]>(
    `orders?select=*&status=eq.cancelled&updated_at=gte.${encodeURIComponent(startISO)}&updated_at=lt.${encodeURIComponent(endISO)}${tc}`
  );
  const cancellationDetails =
    cancelled.length > 0
      ? await sb<OrderCancellation[]>(
          `order_cancellations?select=*&order_id=in.(${cancelled.map((o) => `"${o.id}"`).join(",")})${tc}`
        )
      : [];

  const orderIds = orders.map((o) => o.id);

  const items =
    orderIds.length > 0
      ? await sb<OrderItem[]>(
          `order_items?select=order_id,menu_item_id,menu_item_name,quantity,price_cents,status&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})${tc}`
        )
      : [];

  const payments =
    orderIds.length > 0
      ? await sb<OrderPayment[]>(
          `order_payments?select=*&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})${tc}`
        )
      : [];

  const staffIds = [
    ...new Set(orders.map((o) => o.staff_id).filter(Boolean)),
  ] as string[];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})${tc}`
    );
    for (const s of staff) staffMap.set(s.id, s.name);
  }

  const cashSessions = await listCashSessions(isoDate, tid);

  /* ── Totals ─────────────────────────────── */
  const orders_count = orders.length;
  const guests_count = orders.reduce((s, o) => s + (o.guest_count || 0), 0);
  const revenue_ttc_cents = orders.reduce((s, o) => s + o.total_cents, 0);
  const tax_cents = orders.reduce((s, o) => s + (o.tax_cents || 0), 0);
  const revenue_ht_cents = revenue_ttc_cents - tax_cents;
  const tip_cents = orders.reduce((s, o) => s + (o.tip_cents || 0), 0);

  const methodMap = new Map<string, { amount_cents: number; count: number }>();
  if (payments.length > 0) {
    for (const p of payments) {
      const cur = methodMap.get(p.method) ?? { amount_cents: 0, count: 0 };
      cur.amount_cents += p.amount_cents + (p.tip_cents || 0);
      cur.count += 1;
      methodMap.set(p.method, cur);
    }
  } else {
    for (const o of orders) {
      if (!o.payment_method) continue;
      const cur = methodMap.get(o.payment_method) ?? {
        amount_cents: 0,
        count: 0,
      };
      cur.amount_cents += o.total_cents + (o.tip_cents || 0);
      cur.count += 1;
      methodMap.set(o.payment_method, cur);
    }
  }
  const by_method = [...methodMap.entries()].map(([method, v]) => ({
    method,
    ...v,
  }));

  const staffStats = new Map<
    string,
    { orders_count: number; revenue_cents: number; tip_cents: number }
  >();
  for (const o of orders) {
    if (!o.staff_id) continue;
    const cur = staffStats.get(o.staff_id) ?? {
      orders_count: 0,
      revenue_cents: 0,
      tip_cents: 0,
    };
    cur.orders_count += 1;
    cur.revenue_cents += o.total_cents;
    cur.tip_cents += o.tip_cents || 0;
    staffStats.set(o.staff_id, cur);
  }
  const by_staff = [...staffStats.entries()]
    .map(([staff_id, v]) => ({
      staff_id,
      staff_name: staffMap.get(staff_id) ?? "—",
      ...v,
    }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents);

  const itemStats = new Map<
    string,
    { menu_item_name: string; quantity: number; revenue_cents: number }
  >();
  for (const it of items) {
    if (it.status === "cancelled") continue;
    const cur = itemStats.get(it.menu_item_id) ?? {
      menu_item_name: it.menu_item_name,
      quantity: 0,
      revenue_cents: 0,
    };
    cur.quantity += it.quantity;
    cur.revenue_cents += it.price_cents * it.quantity;
    itemStats.set(it.menu_item_id, cur);
  }
  const top_items = [...itemStats.entries()]
    .map(([menu_item_id, v]) => ({ menu_item_id, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const hourStats = new Map<
    number,
    { orders: number; revenue_cents: number }
  >();
  for (const o of orders) {
    if (!o.paid_at) continue;
    const h = new Date(o.paid_at).getHours();
    const cur = hourStats.get(h) ?? { orders: 0, revenue_cents: 0 };
    cur.orders += 1;
    cur.revenue_cents += o.total_cents;
    hourStats.set(h, cur);
  }
  const by_hour = [...hourStats.entries()]
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => a.hour - b.hour);

  return {
    date: isoDate,
    generated_at,
    totals: {
      orders_count,
      guests_count,
      revenue_ht_cents,
      revenue_ttc_cents,
      tax_cents,
      tip_cents,
      avg_ticket_cents:
        orders_count > 0 ? Math.round(revenue_ttc_cents / orders_count) : 0,
      avg_per_guest_cents:
        guests_count > 0 ? Math.round(revenue_ttc_cents / guests_count) : 0,
      cancelled_orders: cancelled.length,
      refund_total_cents: cancellationDetails.reduce(
        (s, c) => s + (c.refund_amount_cents || 0),
        0
      ),
    },
    by_method,
    by_staff,
    top_items,
    by_hour,
    cash_sessions: cashSessions,
    cancellations: cancellationDetails.map((c) => {
      const o = cancelled.find((x) => x.id === c.order_id);
      return {
        order_id: c.order_id,
        table_number: o?.table_number ?? null,
        reason: c.reason,
        refund_amount_cents: c.refund_amount_cents || 0,
        cancelled_at: c.cancelled_at,
      };
    }),
  };
}

/** All orders paid on the given day (00:00 → next day 00:00, local TZ). */
export async function listPaidOrdersForDay(
  isoDate: string,
  tenantId?: string
): Promise<PaidOrderHistoryEntry[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const start = new Date(`${isoDate}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const orders = await sb<Order[]>(
    `orders?select=*&status=eq.paid&paid_at=gte.${encodeURIComponent(startISO)}&paid_at=lt.${encodeURIComponent(endISO)}${tc}&order=paid_at.desc`
  );
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const items = await sb<
    Pick<OrderItem, "order_id" | "quantity" | "status">[]
  >(
    `order_items?select=order_id,quantity,status&order_id=in.(${ids.map((i) => `"${i}"`).join(",")})${tc}`
  );
  const itemsCountByOrder = new Map<string, number>();
  for (const it of items) {
    if (it.status === "cancelled") continue;
    itemsCountByOrder.set(
      it.order_id,
      (itemsCountByOrder.get(it.order_id) || 0) + it.quantity
    );
  }

  const staffIds = [
    ...new Set(orders.map((o) => o.staff_id).filter(Boolean)),
  ] as string[];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})${tc}`
    );
    for (const s of staff) staffMap.set(s.id, s.name);
  }

  return orders.map((o) => {
    const start = new Date(o.created_at).getTime();
    const end = o.paid_at ? new Date(o.paid_at).getTime() : start;
    return {
      order_id: o.id,
      table_number: o.table_number ?? null,
      source: o.source,
      guest_count: o.guest_count || 1,
      staff_id: o.staff_id,
      staff_name: o.staff_id ? staffMap.get(o.staff_id) : undefined,
      total_cents: o.total_cents,
      tip_cents: o.tip_cents || 0,
      payment_method: o.payment_method ?? null,
      items_count: itemsCountByOrder.get(o.id) || 0,
      created_at: o.created_at,
      paid_at: o.paid_at || o.created_at,
      duration_minutes: Math.max(0, Math.floor((end - start) / 60000)),
      flags: (o.flags ?? []) as string[],
    };
  });
}

async function recomputeOrderTotals(orderId: string, tenantId: string) {
  if (!USE_SUPABASE) return;
  const items = await sb<OrderItem[]>(
    `order_items?select=price_cents,quantity,status&order_id=eq.${orderId}${tenantClause(tenantId)}`
  );
  const subtotal = items
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  /* TVA française restauration : 10% (boissons alcoolisées 20% — simplifié ici) */
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  await sb(`orders?id=eq.${orderId}${tenantClause(tenantId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
    }),
  });
}

/* ═══════════════════════════════════════════════════════════
   KDS — Kitchen tickets (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function getKitchenTickets(
  filter: { station?: Station } = {},
  tenantId?: string
): Promise<KitchenTicket[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const orders = await sb<Order[]>(
    `orders?select=*&status=in.(fired,ready)${tc}&order=fired_at.asc`
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const stationClause = filter.station
    ? `&station=eq.${encodeURIComponent(filter.station)}`
    : "";
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})&status=in.(cooking,ready)${stationClause}${tc}&order=created_at.asc`
  );

  const staffIds = [
    ...new Set(orders.map((o) => o.staff_id).filter(Boolean)),
  ] as string[];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})${tc}`
    );
    for (const s of staff) staffMap.set(s.id, s.name);
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id)!.push(item);
  }

  const now = Date.now();
  return orders
    .filter((o) => itemsByOrder.has(o.id))
    .map((o) => {
      const fireTime = o.fired_at ? new Date(o.fired_at).getTime() : now;
      return {
        order_id: o.id,
        table_number: o.table_number,
        source: o.source,
        fired_at: o.fired_at,
        notes: o.notes,
        flags: o.flags ?? [],
        items: itemsByOrder.get(o.id) || [],
        minutes_elapsed: Math.max(0, Math.floor((now - fireTime) / 60000)),
        staff_name: o.staff_id ? staffMap.get(o.staff_id) : undefined,
      };
    });
}

export async function getOrderItem(
  itemId: string,
  tenantId?: string
): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const [row] = await sb<OrderItem[]>(
    `order_items?select=*&id=eq.${itemId}${tenantClause(tid)}&limit=1`
  );
  return row ?? null;
}

export async function getTicketCountsByStation(
  tenantId?: string
): Promise<Record<Station, number>> {
  const empty: Record<Station, number> = {
    main: 0,
    pizza: 0,
    grill: 0,
    cold: 0,
    dessert: 0,
    bar: 0,
  };
  if (!USE_SUPABASE) return empty;
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const orders = await sb<Order[]>(
    `orders?select=id&status=in.(fired,ready)${tc}`
  );
  if (orders.length === 0) return empty;

  const orderIds = orders.map((o) => o.id);
  const items = await sb<Pick<OrderItem, "order_id" | "station">[]>(
    `order_items?select=order_id,station&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})&status=in.(cooking,ready)${tc}`
  );

  const seen = new Map<Station, Set<string>>();
  for (const it of items) {
    if (!seen.has(it.station)) seen.set(it.station, new Set());
    seen.get(it.station)!.add(it.order_id);
  }

  const out: Record<Station, number> = { ...empty };
  for (const [st, set] of seen.entries()) out[st] = set.size;
  return out;
}

/* ═══════════════════════════════════════════════════════════
   SERVICE STATS — Stats live (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function getServiceStats(
  tenantId?: string
): Promise<ServiceStats> {
  if (!USE_SUPABASE) {
    return {
      day: {
        orders_count: 0,
        guests_count: 0,
        revenue_cents: 0,
        avg_ticket_cents: 0,
        open_tables: 0,
      },
      current: {
        active_orders: 0,
        items_cooking: 0,
        items_ready: 0,
        oldest_cooking_minutes: 0,
      },
      top_items: [],
    };
  }
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [paidToday, allTodayOrders, activeOrders] = await Promise.all([
    sb<Order[]>(
      `orders?select=total_cents,guest_count&status=eq.paid&paid_at=gte.${todayISO}${tc}`
    ),
    sb<Order[]>(
      `orders?select=guest_count&created_at=gte.${todayISO}&status=neq.cancelled${tc}`
    ),
    sb<Order[]>(
      `orders?select=id,table_number&status=in.(open,fired,ready,served)${tc}`
    ),
  ]);

  const revenueCents = paidToday.reduce((s, o) => s + o.total_cents, 0);
  const guestsCount = allTodayOrders.reduce((s, o) => s + o.guest_count, 0);
  const openTables = new Set(
    activeOrders
      .map((o) => o.table_number)
      .filter((n): n is number => n != null)
  ).size;

  const cookingItems = await sb<OrderItem[]>(
    `order_items?select=status,fired_at&status=in.(cooking,ready)${tc}`
  );
  const cooking = cookingItems.filter((i) => i.status === "cooking");
  const ready = cookingItems.filter((i) => i.status === "ready");
  const now = Date.now();
  const oldestCookingMinutes =
    cooking.length === 0
      ? 0
      : Math.max(
          ...cooking.map((i) =>
            i.fired_at
              ? Math.floor((now - new Date(i.fired_at).getTime()) / 60000)
              : 0
          )
        );

  const itemsToday = await sb<OrderItem[]>(
    `order_items?select=menu_item_name,quantity,price_cents&created_at=gte.${todayISO}&status=neq.cancelled${tc}&limit=500`
  );
  const tally = new Map<string, { quantity: number; revenue_cents: number }>();
  for (const i of itemsToday) {
    const row = tally.get(i.menu_item_name) || {
      quantity: 0,
      revenue_cents: 0,
    };
    row.quantity += i.quantity;
    row.revenue_cents += i.quantity * i.price_cents;
    tally.set(i.menu_item_name, row);
  }
  const topItems = [...tally.entries()]
    .map(([name, v]) => ({ menu_item_name: name, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    day: {
      orders_count: paidToday.length,
      guests_count: guestsCount,
      revenue_cents: revenueCents,
      avg_ticket_cents:
        paidToday.length > 0
          ? Math.round(revenueCents / paidToday.length)
          : 0,
      open_tables: openTables,
    },
    current: {
      active_orders: activeOrders.length,
      items_cooking: cooking.length,
      items_ready: ready.length,
      oldest_cooking_minutes: oldestCookingMinutes,
    },
    top_items: topItems,
  };
}

export function isPosConfigured() {
  return USE_SUPABASE;
}

/* ═══════════════════════════════════════════════════════════
   POS Overview Stats (admin /parametres) — tenant-scoped
   ═══════════════════════════════════════════════════════════ */

export interface PosOverviewStats {
  total_orders_today: number;
  revenue_today_cents: number;
  active_orders: number;
}

export async function getPosOverviewStats(
  tenantId?: string
): Promise<PosOverviewStats> {
  if (!USE_SUPABASE) {
    return {
      total_orders_today: 0,
      revenue_today_cents: 0,
      active_orders: 0,
    };
  }
  const tid = await resolveTenantId(tenantId);
  const tc = tenantClause(tid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [ordersToday, paidToday, activeOrders] = await Promise.all([
    sb<Order[]>(
      `orders?select=id&created_at=gte.${todayISO}&status=neq.cancelled${tc}`
    ),
    sb<Order[]>(
      `orders?select=total_cents&status=eq.paid&paid_at=gte.${todayISO}${tc}`
    ),
    sb<Order[]>(
      `orders?select=id&status=in.(open,fired,ready,served)${tc}`
    ),
  ]);

  return {
    total_orders_today: ordersToday.length,
    revenue_today_cents: paidToday.reduce((s, o) => s + o.total_cents, 0),
    active_orders: activeOrders.length,
  };
}
