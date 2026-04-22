/**
 * POS / KDS types
 */

export type StaffRole = "server" | "chef" | "manager";

export type OrderStatus =
  | "open"
  | "fired"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type OrderSource = "dine_in" | "dine_in_qr" | "takeaway" | "delivery";

export type OrderItemStatus =
  | "pending"
  | "cooking"
  | "ready"
  | "served"
  | "cancelled";

export type Station = "main" | "pizza" | "grill" | "cold" | "dessert" | "bar";

export type PaymentMethod = "cash" | "card" | "ticket_resto" | "other";

export interface StaffMember {
  id: string;
  name: string;
  pin_code: string;
  role: StaffRole;
  color: string;
  active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_category?: string | null;
  price_cents: number;
  quantity: number;
  modifiers?: string[] | null;
  notes?: string | null;
  status: OrderItemStatus;
  station: Station;
  fired_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  table_number?: number | null;
  customer_id?: string | null;
  staff_id?: string | null;
  status: OrderStatus;
  source: OrderSource;
  guest_count: number;
  notes?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  tip_cents: number;
  payment_method?: PaymentMethod | null;
  fired_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  staff_name?: string;
  staff_color?: string;
}

/* ── Payloads ──────────────────────────────────────────── */

export interface CreateOrderPayload {
  table_number?: number;
  source?: OrderSource;
  guest_count?: number;
  staff_id?: string;
  customer_id?: string;
  notes?: string;
}

export interface AddItemsPayload {
  items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    menu_item_category?: string;
    price_cents: number;
    quantity?: number;
    modifiers?: string[];
    notes?: string;
    station?: Station;
  }>;
}

export interface KitchenTicket {
  order_id: string;
  table_number?: number | null;
  source: OrderSource;
  fired_at?: string | null;
  notes?: string | null;
  items: OrderItem[];
  minutes_elapsed: number;
  staff_name?: string;
}

export interface ServiceStats {
  day: {
    orders_count: number;
    guests_count: number;
    revenue_cents: number;
    avg_ticket_cents: number;
    open_tables: number;
  };
  current: {
    active_orders: number;
    items_cooking: number;
    items_ready: number;
    oldest_cooking_minutes: number;
  };
  top_items: Array<{
    menu_item_name: string;
    quantity: number;
    revenue_cents: number;
  }>;
}
