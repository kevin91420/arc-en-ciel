/**
 * POS CLIENT — DB functions for orders, items, staff, stats.
 * Supabase-first (memory fallback minimal — POS needs a real DB).
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
} from "./pos-types";

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
   STAFF AUTH — PIN-based
   ═══════════════════════════════════════════════════════════ */

export async function findStaffByPin(pin: string): Promise<StaffMember | null> {
  if (!USE_SUPABASE) {
    /* Demo fallback */
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

  const rows = await sb<StaffMember[]>(
    `staff_members?select=*&pin_code=eq.${encodeURIComponent(pin)}&active=eq.true&limit=1`
  );
  return rows[0] || null;
}

export async function listStaff(): Promise<StaffMember[]> {
  if (!USE_SUPABASE) return [];
  return sb<StaffMember[]>(`staff_members?select=*&active=eq.true&order=name.asc`);
}

export async function getStaffById(id: string): Promise<StaffMember | null> {
  if (!USE_SUPABASE) return null;
  const rows = await sb<StaffMember[]>(
    `staff_members?select=*&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

/* ═══════════════════════════════════════════════════════════
   ORDERS
   ═══════════════════════════════════════════════════════════ */

export async function createOrder(
  payload: CreateOrderPayload
): Promise<Order> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
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
    }),
  });
  return row;
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  if (!USE_SUPABASE) return null;
  const [order] = await sb<Order[]>(`orders?select=*&id=eq.${id}&limit=1`);
  if (!order) return null;
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=eq.${id}&order=created_at.asc`
  );
  let staffName: string | undefined;
  let staffColor: string | undefined;
  if (order.staff_id) {
    const [staff] = await sb<StaffMember[]>(
      `staff_members?select=name,color&id=eq.${order.staff_id}&limit=1`
    );
    staffName = staff?.name;
    staffColor = staff?.color;
  }
  return { ...order, items, staff_name: staffName, staff_color: staffColor };
}

/**
 * Get active order for a table (status in open/fired/ready), if any.
 */
export async function getActiveOrderForTable(
  tableNumber: number
): Promise<OrderWithItems | null> {
  if (!USE_SUPABASE) return null;
  const rows = await sb<Order[]>(
    `orders?select=*&table_number=eq.${tableNumber}&status=in.(open,fired,ready,served)&order=created_at.desc&limit=1`
  );
  if (rows.length === 0) return null;
  return getOrder(rows[0].id);
}

export async function listActiveOrders(): Promise<OrderWithItems[]> {
  if (!USE_SUPABASE) return [];
  const orders = await sb<Order[]>(
    `orders?select=*&status=in.(open,fired,ready,served)&order=created_at.desc`
  );
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=in.(${ids.map((i) => `"${i}"`).join(",")})&order=created_at.asc`
  );
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id)!.push(item);
  }
  const staffIds = [...new Set(orders.map((o) => o.staff_id).filter(Boolean))] as string[];
  const staffMap = new Map<string, { name: string; color: string }>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name,color&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})`
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
  payload: AddItemsPayload
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
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
  }));
  await sb(`order_items`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
  await recomputeOrderTotals(orderId);
  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found after add");
  return updated;
}

export async function removeItem(itemId: string): Promise<void> {
  if (!USE_SUPABASE) return;
  const [item] = await sb<OrderItem[]>(
    `order_items?select=order_id&id=eq.${itemId}&limit=1`
  );
  await sb(`order_items?id=eq.${itemId}`, { method: "DELETE" });
  if (item?.order_id) await recomputeOrderTotals(item.order_id);
}

export async function updateItemStatus(
  itemId: string,
  status: OrderItem["status"]
): Promise<void> {
  if (!USE_SUPABASE) return;
  const updates: Record<string, unknown> = { status };
  if (status === "cooking") updates.fired_at = new Date().toISOString();
  if (status === "ready") updates.ready_at = new Date().toISOString();
  if (status === "served") updates.served_at = new Date().toISOString();
  await sb(`order_items?id=eq.${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/**
 * Update editable fields on a pending order item.
 *
 * Business rule: quantity / modifiers / notes can ONLY be edited while the
 * item is still `pending` (i.e. not yet fired to the kitchen). Once the chef
 * has started working on it, the line is immutable from the server side —
 * any further change must be a new line.
 *
 * `status` transitions remain allowed at any point (e.g. cancel a cooking
 * item) and fall through to the same code path as {@link updateItemStatus}.
 *
 * Throws `ItemNotPendingError` if the caller asks to edit quantity /
 * modifiers / notes on a non-pending item.
 */
export class ItemNotPendingError extends Error {
  constructor(public readonly currentStatus: OrderItem["status"]) {
    super(`Item is ${currentStatus}, not pending — cannot edit quantity/modifiers/notes`);
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
  updates: UpdateItemPayload
): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;

  const wantsMutableFields =
    updates.quantity !== undefined ||
    updates.modifiers !== undefined ||
    updates.notes !== undefined;

  /* Read the current item so we can (a) enforce the pending guard and
   * (b) know which order to recompute at the end. */
  const [current] = await sb<OrderItem[]>(
    `order_items?select=*&id=eq.${itemId}&limit=1`
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
    if (updates.status === "cooking") patch.fired_at = new Date().toISOString();
    if (updates.status === "ready") patch.ready_at = new Date().toISOString();
    if (updates.status === "served") patch.served_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return current;

  const [updated] = await sb<OrderItem[]>(`order_items?id=eq.${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  /* Totals only move when quantity or status (cancellations) change; we
   * recompute unconditionally since it's cheap and keeps the invariant. */
  await recomputeOrderTotals(current.order_id);

  return updated ?? current;
}

/**
 * Fire the order → mark all pending items as cooking.
 */
export async function fireOrder(orderId: string): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  const now = new Date().toISOString();
  await sb(`order_items?order_id=eq.${orderId}&status=eq.pending`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cooking", fired_at: now }),
  });
  await sb(`orders?id=eq.${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "fired", fired_at: now }),
  });
  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found after fire");
  return updated;
}

/**
 * Fire only the pending items whose category matches the given list of
 * categories — lets the server "lancer les entrées" first, then "lancer les
 * plats" when the table is ready. The order moves to `fired` as soon as
 * *anything* is in the kitchen.
 */
export async function fireOrderByCategories(
  orderId: string,
  categories: string[]
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  if (categories.length === 0) {
    /* Nothing to fire — return the order as-is. */
    const current = await getOrder(orderId);
    if (!current) throw new Error("Order not found");
    return current;
  }
  const now = new Date().toISOString();
  const catList = categories
    .map((c) => `"${c.replace(/"/g, "")}"`)
    .join(",");
  await sb(
    `order_items?order_id=eq.${orderId}&status=eq.pending&menu_item_category=in.(${catList})`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "cooking", fired_at: now }),
    }
  );
  /* Bump order.status to `fired` if it isn't already. */
  await sb(`orders?id=eq.${orderId}&status=eq.open`, {
    method: "PATCH",
    body: JSON.stringify({ status: "fired", fired_at: now }),
  });
  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found after fire");
  return updated;
}

/**
 * Set the flags array on an order. Flags are additive tags ("rush" /
 * "allergy" / "birthday" / "vip"). Pass an empty array to clear them.
 */
export async function setOrderFlags(
  orderId: string,
  flags: OrderFlag[]
): Promise<OrderWithItems> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
  await sb(`orders?id=eq.${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ flags }),
  });
  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found");
  return updated;
}

/**
 * Mark a `ready` item as picked up by the server (acknowledged_at = now).
 * The chef sees "parti en salle" without the row being marked served yet,
 * so the customer can still flag a problem before the cycle closes.
 */
export async function acknowledgeItem(
  itemId: string
): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;
  const [updated] = await sb<OrderItem[]>(`order_items?id=eq.${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ acknowledged_at: new Date().toISOString() }),
  });
  return updated ?? null;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  if (!USE_SUPABASE) return;
  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "ready") updates.ready_at = now;
  if (status === "served") updates.served_at = now;
  if (status === "paid") updates.paid_at = now;
  await sb(`orders?id=eq.${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function payOrder(
  orderId: string,
  method: PaymentMethod,
  tipCents = 0
): Promise<void> {
  if (!USE_SUPABASE) return;
  await sb(`orders?id=eq.${orderId}`, {
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
   ORDER PAYMENTS — split par items / split par couverts (multi-row)
   ═══════════════════════════════════════════════════════════ */

export async function listPaymentsForOrder(
  orderId: string
): Promise<OrderPayment[]> {
  if (!USE_SUPABASE) return [];
  return sb<OrderPayment[]>(
    `order_payments?select=*&order_id=eq.${orderId}&order=created_at.asc`
  );
}

export async function addPayment(
  orderId: string,
  payload: CreatePaymentPayload
): Promise<OrderPayment> {
  if (!USE_SUPABASE) throw new Error("POS requires Supabase");
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
    }),
  });
  return row;
}

export async function deletePayment(paymentId: string): Promise<void> {
  if (!USE_SUPABASE) return;
  await sb(`order_payments?id=eq.${paymentId}`, { method: "DELETE" });
}

async function recomputeOrderTotals(orderId: string) {
  if (!USE_SUPABASE) return;
  const items = await sb<OrderItem[]>(
    `order_items?select=price_cents,quantity,status&order_id=eq.${orderId}`
  );
  const subtotal = items
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  /* TVA française restauration : 10% (boissons alcoolisées 20% — simplifié ici) */
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  await sb(`orders?id=eq.${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
    }),
  });
}

/* ═══════════════════════════════════════════════════════════
   KDS — Kitchen tickets
   ═══════════════════════════════════════════════════════════ */

/**
 * List all active kitchen tickets. When `filter.station` is set, items are
 * filtered server-side to the given station AND only tickets that have at
 * least one item for that station are returned. This is the core guardrail
 * that prevents a pizzaiolo from ever seeing / touching a grill item.
 */
export async function getKitchenTickets(
  filter: { station?: Station } = {}
): Promise<KitchenTicket[]> {
  if (!USE_SUPABASE) return [];

  /* All orders currently being prepared */
  const orders = await sb<Order[]>(
    `orders?select=*&status=in.(fired,ready)&order=fired_at.asc`
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const stationClause = filter.station
    ? `&station=eq.${encodeURIComponent(filter.station)}`
    : "";
  const items = await sb<OrderItem[]>(
    `order_items?select=*&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})&status=in.(cooking,ready)${stationClause}&order=created_at.asc`
  );

  const staffIds = [...new Set(orders.map((o) => o.staff_id).filter(Boolean))] as string[];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staff = await sb<StaffMember[]>(
      `staff_members?select=id,name&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})`
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

/**
 * Fetch a single order_item (station guard helper for the PATCH route).
 * Returns null if not found.
 */
export async function getOrderItem(itemId: string): Promise<OrderItem | null> {
  if (!USE_SUPABASE) return null;
  const [row] = await sb<OrderItem[]>(
    `order_items?select=*&id=eq.${itemId}&limit=1`
  );
  return row ?? null;
}

/**
 * Aggregated ticket counts per station — powers the station picker home page.
 * An "active ticket for station X" = an order in fired/ready with at least
 * one item in cooking/ready whose station === X.
 */
export async function getTicketCountsByStation(): Promise<
  Record<Station, number>
> {
  const empty: Record<Station, number> = {
    main: 0,
    pizza: 0,
    grill: 0,
    cold: 0,
    dessert: 0,
    bar: 0,
  };
  if (!USE_SUPABASE) return empty;

  const orders = await sb<Order[]>(
    `orders?select=id&status=in.(fired,ready)`
  );
  if (orders.length === 0) return empty;

  const orderIds = orders.map((o) => o.id);
  const items = await sb<Pick<OrderItem, "order_id" | "station">[]>(
    `order_items?select=order_id,station&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})&status=in.(cooking,ready)`
  );

  /* Count DISTINCT order_id per station (one ticket = one card). */
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
   SERVICE STATS — Stats live pour admin/serveur
   ═══════════════════════════════════════════════════════════ */

export async function getServiceStats(): Promise<ServiceStats> {
  if (!USE_SUPABASE) {
    return {
      day: { orders_count: 0, guests_count: 0, revenue_cents: 0, avg_ticket_cents: 0, open_tables: 0 },
      current: { active_orders: 0, items_cooking: 0, items_ready: 0, oldest_cooking_minutes: 0 },
      top_items: [],
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  /* Day orders (paid only for revenue) */
  const [paidToday, allTodayOrders, activeOrders] = await Promise.all([
    sb<Order[]>(`orders?select=total_cents,guest_count&status=eq.paid&paid_at=gte.${todayISO}`),
    sb<Order[]>(`orders?select=guest_count&created_at=gte.${todayISO}&status=neq.cancelled`),
    sb<Order[]>(`orders?select=id,table_number&status=in.(open,fired,ready,served)`),
  ]);

  const revenueCents = paidToday.reduce((s, o) => s + o.total_cents, 0);
  const guestsCount = allTodayOrders.reduce((s, o) => s + o.guest_count, 0);
  const openTables = new Set(
    activeOrders.map((o) => o.table_number).filter((n): n is number => n != null)
  ).size;

  /* Cooking items right now */
  const cookingItems = await sb<OrderItem[]>(
    `order_items?select=status,fired_at&status=in.(cooking,ready)`
  );
  const cooking = cookingItems.filter((i) => i.status === "cooking");
  const ready = cookingItems.filter((i) => i.status === "ready");
  const now = Date.now();
  const oldestCookingMinutes =
    cooking.length === 0
      ? 0
      : Math.max(
          ...cooking.map((i) =>
            i.fired_at ? Math.floor((now - new Date(i.fired_at).getTime()) / 60000) : 0
          )
        );

  /* Top items today */
  const itemsToday = await sb<OrderItem[]>(
    `order_items?select=menu_item_name,quantity,price_cents&created_at=gte.${todayISO}&status=neq.cancelled&limit=500`
  );
  const tally = new Map<string, { quantity: number; revenue_cents: number }>();
  for (const i of itemsToday) {
    const row = tally.get(i.menu_item_name) || { quantity: 0, revenue_cents: 0 };
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
        paidToday.length > 0 ? Math.round(revenueCents / paidToday.length) : 0,
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
   Lightweight stats for the admin "system status" card.
   These are cheap queries that surface POS activity on the
   global admin /parametres overview page.
   ═══════════════════════════════════════════════════════════ */

export interface PosOverviewStats {
  total_orders_today: number;
  revenue_today_cents: number;
  active_orders: number;
}

export async function getPosOverviewStats(): Promise<PosOverviewStats> {
  if (!USE_SUPABASE) {
    return {
      total_orders_today: 0,
      revenue_today_cents: 0,
      active_orders: 0,
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [ordersToday, paidToday, activeOrders] = await Promise.all([
    sb<Order[]>(
      `orders?select=id&created_at=gte.${todayISO}&status=neq.cancelled`
    ),
    sb<Order[]>(
      `orders?select=total_cents&status=eq.paid&paid_at=gte.${todayISO}`
    ),
    sb<Order[]>(
      `orders?select=id&status=in.(open,fired,ready,served)`
    ),
  ]);

  return {
    total_orders_today: ordersToday.length,
    revenue_today_cents: paidToday.reduce((s, o) => s + o.total_cents, 0),
    active_orders: activeOrders.length,
  };
}
