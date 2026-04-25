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

/* ── Special flags ────────────────────────────────────────
 * Optional tags the server can stick on an order so the kitchen handles it
 * differently. All four are independent and additive (a VIP table can also
 * be in a rush, with one allergy). White-label restaurants that don't use
 * them just leave `flags` empty. */
export type OrderFlag = "rush" | "allergy" | "birthday" | "vip";

export const ORDER_FLAGS_META: Record<
  OrderFlag,
  { label: string; icon: string; tone: string; ringClass: string; description: string }
> = {
  rush: {
    label: "À presser",
    icon: "🔥",
    tone: "#C0392B",
    ringClass: "ring-red-500",
    description: "Pressé — sortir d'abord",
  },
  allergy: {
    label: "Allergie",
    icon: "⚠️",
    tone: "#E67E22",
    ringClass: "ring-orange-500",
    description: "Allergie — vérifier avec le serveur",
  },
  birthday: {
    label: "Anniversaire",
    icon: "🎂",
    tone: "#9B59B6",
    ringClass: "ring-purple-500",
    description: "Anniversaire — sortir bougie / dessert",
  },
  vip: {
    label: "VIP",
    icon: "⭐",
    tone: "#B8922F",
    ringClass: "ring-amber-400",
    description: "VIP — qualité max, attention soignée",
  },
};

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
  /** Set when the server taps "Pris" — the chef sees the plate has left the
   * pass even though the customer hasn't been "served" yet. */
  acknowledged_at?: string | null;
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
  /** Optional tags ("rush", "allergy", "birthday", "vip"). Empty array = no
   * flags — UI hides the badge cluster entirely. */
  flags?: OrderFlag[] | null;
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

/** Single payment row — an order can have N of these (split par items, par
 * couverts, ou paiement complet). When the sum reaches order.total_cents,
 * a DB trigger flips the order to status='paid'. */
export interface OrderPayment {
  id: string;
  order_id: string;
  amount_cents: number;
  tip_cents: number;
  method: PaymentMethod;
  /** Soft link to the items this payment covered. UI uses it to know what's
   * still due — we never mutate order_items from a payment row. */
  item_ids: string[];
  staff_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreatePaymentPayload {
  amount_cents: number;
  tip_cents?: number;
  method: PaymentMethod;
  item_ids?: string[];
  staff_id?: string;
  notes?: string;
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
  flags?: OrderFlag[] | null;
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
