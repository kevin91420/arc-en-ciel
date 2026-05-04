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

export type PaymentMethod =
  | "cash"
  | "card"
  | "ticket_resto"
  | "voucher"     // Sprint 7b QW#6 — paiement par avoir client
  | "other";

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
  /** Sprint 7b QW#8 — total des remises appliquées sur cette commande
   * (cache dénormalisé, recalculé par recomputeOrderTotals à chaque mut). */
  discount_total_cents?: number;
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

/* ── Cancellations ─────────────────────────────────────── */

export type CancellationReason = "error" | "refused" | "gesture" | "other";
export type RefundMethod = "cash" | "card" | "voucher" | "none";

export interface OrderCancellation {
  id: string;
  order_id: string;
  reason: CancellationReason;
  notes?: string | null;
  cancelled_by?: string | null;
  refund_method?: RefundMethod | null;
  refund_amount_cents: number;
  cancelled_at: string;
}

export const CANCELLATION_REASONS: {
  key: CancellationReason;
  label: string;
  icon: string;
}[] = [
  { key: "error", label: "Erreur de commande", icon: "✋" },
  { key: "refused", label: "Plat refusé / non conforme", icon: "🥲" },
  { key: "gesture", label: "Geste commercial", icon: "🎁" },
  { key: "other", label: "Autre raison", icon: "•" },
];

/* ── Discounts (Sprint 7b QW#8) ────────────────────────── */

export type DiscountKind = "percentage" | "fixed";

export type DiscountReason =
  | "fidelite"
  | "reclamation"
  | "invitation"
  | "happy_hour"
  | "menu"
  | "partenariat"
  | "erreur"
  | "autre";

export interface OrderDiscount {
  id: string;
  order_id: string;
  kind: DiscountKind;
  /* value_pct ∈ [0, 100] si kind='percentage', null sinon */
  value_pct?: number | null;
  amount_cents: number;
  reason: DiscountReason;
  notes?: string | null;
  applied_by_staff_id?: string | null;
  created_at: string;
}

export interface CreateDiscountPayload {
  kind: DiscountKind;
  /* requis si kind='percentage' */
  value_pct?: number;
  /* requis si kind='fixed' */
  amount_cents?: number;
  reason: DiscountReason;
  notes?: string;
  applied_by_staff_id?: string;
}

export const DISCOUNT_REASONS: {
  key: DiscountReason;
  label: string;
  icon: string;
}[] = [
  { key: "fidelite", label: "Client fidèle", icon: "⭐" },
  { key: "invitation", label: "Invitation / VIP", icon: "🎁" },
  { key: "reclamation", label: "Réclamation", icon: "🥲" },
  { key: "erreur", label: "Erreur maison", icon: "✋" },
  { key: "happy_hour", label: "Happy hour / Promo", icon: "🍹" },
  { key: "partenariat", label: "Partenaire", icon: "🤝" },
  { key: "menu", label: "Menu / Formule", icon: "📋" },
  { key: "autre", label: "Autre raison", icon: "•" },
];

/* Étend Order avec le total des remises (cache dénormalisé). */

/* ── Cash sessions ─────────────────────────────────────── */

export interface CashSession {
  id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_amount_cents: number;
  expected_cash_cents?: number | null;
  actual_cash_cents?: number | null;
  variance_cents?: number | null;
  opened_by?: string | null;
  closed_by?: string | null;
  notes?: string | null;
  /* Détail des dénominations à la fermeture (Sprint 7b QW#5) — billets+pièces */
  cash_breakdown?: CashBreakdown | null;
  created_at: string;
}

/**
 * Comptage détaillé du tiroir-caisse à la fermeture.
 * Clés = nombre d'unités de chaque dénomination (entier ≥ 0).
 *
 * Préfixes :
 *   b<euros>     = billet de N euros (b500, b200, b100, b50, b20, b10, b5)
 *   c<centimes>  = pièce de N centimes (c200=2€, c100=1€, c050=0,50€,
 *                  c020=0,20€, c010=0,10€, c005=0,05€, c002=0,02€, c001=0,01€)
 */
export interface CashBreakdown {
  b500?: number;
  b200?: number;
  b100?: number;
  b50?: number;
  b20?: number;
  b10?: number;
  b5?: number;
  c200?: number;
  c100?: number;
  c050?: number;
  c020?: number;
  c010?: number;
  c005?: number;
  c002?: number;
  c001?: number;
}

/**
 * Métadonnées des dénominations Euro — utilisées par l'UI pour rendre
 * la grille de comptage et calculer le total.
 *
 * Triées du plus gros au plus petit (ordre naturel pour compter).
 */
export const CASH_DENOMINATIONS: Array<{
  key: keyof CashBreakdown;
  label: string;       // "100 €", "0,50 €"
  cents: number;       // valeur unitaire en cents
  type: "bill" | "coin";
}> = [
  { key: "b500", label: "500 €",  cents: 50000, type: "bill" },
  { key: "b200", label: "200 €",  cents: 20000, type: "bill" },
  { key: "b100", label: "100 €",  cents: 10000, type: "bill" },
  { key: "b50",  label: "50 €",   cents: 5000,  type: "bill" },
  { key: "b20",  label: "20 €",   cents: 2000,  type: "bill" },
  { key: "b10",  label: "10 €",   cents: 1000,  type: "bill" },
  { key: "b5",   label: "5 €",    cents: 500,   type: "bill" },
  { key: "c200", label: "2 €",    cents: 200,   type: "coin" },
  { key: "c100", label: "1 €",    cents: 100,   type: "coin" },
  { key: "c050", label: "0,50 €", cents: 50,    type: "coin" },
  { key: "c020", label: "0,20 €", cents: 20,    type: "coin" },
  { key: "c010", label: "0,10 €", cents: 10,    type: "coin" },
  { key: "c005", label: "0,05 €", cents: 5,     type: "coin" },
  { key: "c002", label: "0,02 €", cents: 2,     type: "coin" },
  { key: "c001", label: "0,01 €", cents: 1,     type: "coin" },
];

/**
 * Calcule le total en cents d'un breakdown.
 */
export function computeCashBreakdownTotal(b: CashBreakdown): number {
  let total = 0;
  for (const d of CASH_DENOMINATIONS) {
    const count = b[d.key] ?? 0;
    total += (count || 0) * d.cents;
  }
  return total;
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
