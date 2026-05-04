/**
 * REPORTS CLIENT — Rapports comptables agrégés par période (Sprint 7b QW#3).
 *
 * Étend le concept du Z journalier vers des périodes arbitraires (mois, année,
 * trimestre, custom). Permet à l'expert-comptable de récupérer le CA TTC, le
 * CA HT, la TVA collectée, le détail par moyen de paiement, le top items
 * et la ventilation par jour pour n'importe quelle plage de dates.
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Avoir le chiffre d'affaire du mois et de l'année pour les comptables,
 * et avoir le nombre d'articles vendus et quoi comme plat, avec la TVA."
 */

import type { Order, OrderItem, OrderPayment } from "./pos-types";
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

function tenantClause(tenantId: string): string {
  return `&restaurant_id=eq.${encodeURIComponent(tenantId)}`;
}

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export type PeriodKind = "day" | "week" | "month" | "year" | "custom";

export interface PeriodReport {
  /* Métadonnées */
  kind: PeriodKind;
  label: string;          // ex "Mai 2026", "2026", "01-15 mai 2026"
  start_iso: string;      // ISO datetime inclusif
  end_iso: string;        // ISO datetime exclusif (= début du jour suivant)
  generated_at: string;
  days_in_period: number; // jours réellement entre start et end

  /* Totaux */
  totals: {
    orders_count: number;
    guests_count: number;
    revenue_ttc_cents: number;
    revenue_ht_cents: number;
    tax_cents: number;
    tip_cents: number;
    avg_ticket_cents: number;
    avg_per_guest_cents: number;
    cancelled_orders: number;
    /* Moyenne quotidienne sur les jours actifs (ne compte pas les jours sans CA). */
    avg_daily_revenue_cents: number;
    active_days: number;
    /* Sprint 7b QW#8 — remises commerciales sur la période */
    discount_total_cents: number;
    discount_orders_count: number;
  };

  /* Ventilation des remises par raison */
  discounts_by_reason: Array<{
    reason: string;
    count: number;
    amount_cents: number;
  }>;

  /* Ventilations */
  by_method: Array<{
    method: string;
    amount_cents: number;
    count: number;
    pct: number; // pourcentage du CA TTC
  }>;

  by_day: Array<{
    date: string; // YYYY-MM-DD
    orders: number;
    revenue_cents: number;
  }>;

  by_weekday: Array<{
    weekday: number; // 0 = lundi, 6 = dimanche
    weekday_label: string;
    orders: number;
    revenue_cents: number;
  }>;

  top_items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    revenue_cents: number;
  }>;
}

/* ═══════════════════════════════════════════════════════════
   Core function — agrège un rapport pour une période arbitraire
   ═══════════════════════════════════════════════════════════ */

export async function getPeriodReport(
  options: {
    startISO: string;
    endISO: string;        // exclusive
    kind: PeriodKind;
    label: string;
    tenantId?: string;
  }
): Promise<PeriodReport> {
  const generated_at = new Date().toISOString();
  const { startISO, endISO, kind, label } = options;
  const days_in_period = Math.max(
    1,
    Math.round(
      (new Date(endISO).getTime() - new Date(startISO).getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );

  if (!USE_SUPABASE) {
    return {
      kind,
      label,
      start_iso: startISO,
      end_iso: endISO,
      generated_at,
      days_in_period,
      totals: {
        orders_count: 0,
        guests_count: 0,
        revenue_ttc_cents: 0,
        revenue_ht_cents: 0,
        tax_cents: 0,
        tip_cents: 0,
        avg_ticket_cents: 0,
        avg_per_guest_cents: 0,
        cancelled_orders: 0,
        avg_daily_revenue_cents: 0,
        active_days: 0,
        discount_total_cents: 0,
        discount_orders_count: 0,
      },
      by_method: [],
      by_day: [],
      by_weekday: [],
      top_items: [],
      discounts_by_reason: [],
    };
  }

  const tid = await resolveTenantId(options.tenantId);
  const tc = tenantClause(tid);

  /* Toutes les commandes payées sur la période. */
  const orders = await sb<Order[]>(
    `orders?select=*&status=eq.paid&paid_at=gte.${encodeURIComponent(startISO)}&paid_at=lt.${encodeURIComponent(endISO)}${tc}&order=paid_at.asc`
  );

  /* Commandes annulées sur la période (pour info). */
  const cancelled = await sb<Order[]>(
    `orders?select=id,paid_at,updated_at&status=eq.cancelled&updated_at=gte.${encodeURIComponent(startISO)}&updated_at=lt.${encodeURIComponent(endISO)}${tc}`
  );

  const orderIds = orders.map((o) => o.id);

  /* Items vendus (non annulés). */
  const items =
    orderIds.length > 0
      ? await sb<OrderItem[]>(
          `order_items?select=order_id,menu_item_id,menu_item_name,quantity,price_cents,status&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})${tc}`
        )
      : [];

  /* Paiements (pour ventilation par méthode incluant les splits). */
  const payments =
    orderIds.length > 0
      ? await sb<OrderPayment[]>(
          `order_payments?select=*&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})${tc}`
        )
      : [];

  /* Sprint 7b QW#8 — Remises commerciales sur la période. */
  const discounts =
    orderIds.length > 0
      ? await sb<{
          order_id: string;
          reason: string;
          amount_cents: number;
        }[]>(
          `order_discounts?select=order_id,reason,amount_cents&order_id=in.(${orderIds.map((i) => `"${i}"`).join(",")})${tc}`
        )
      : [];

  /* ═══ TOTAUX ═══ */
  const orders_count = orders.length;
  const guests_count = orders.reduce((s, o) => s + (o.guest_count || 0), 0);
  const revenue_ttc_cents = orders.reduce((s, o) => s + o.total_cents, 0);
  const tax_cents = orders.reduce((s, o) => s + (o.tax_cents || 0), 0);
  const revenue_ht_cents = revenue_ttc_cents - tax_cents;
  const tip_cents = orders.reduce((s, o) => s + (o.tip_cents || 0), 0);
  const discount_total_cents = discounts.reduce(
    (s, d) => s + d.amount_cents,
    0
  );
  const discount_orders_count = new Set(discounts.map((d) => d.order_id))
    .size;

  /* Ventilation par raison */
  const discountReasonMap = new Map<
    string,
    { count: number; amount_cents: number }
  >();
  for (const d of discounts) {
    const cur = discountReasonMap.get(d.reason) ?? {
      count: 0,
      amount_cents: 0,
    };
    cur.count += 1;
    cur.amount_cents += d.amount_cents;
    discountReasonMap.set(d.reason, cur);
  }
  const discounts_by_reason = [...discountReasonMap.entries()]
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.amount_cents - a.amount_cents);

  /* ═══ BY METHOD (utilise payments si dispo, sinon order.payment_method) ═══ */
  const methodMap = new Map<
    string,
    { amount_cents: number; count: number }
  >();
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

  const totalForPct = revenue_ttc_cents + tip_cents;
  const by_method = [...methodMap.entries()]
    .map(([method, v]) => ({
      method,
      ...v,
      pct: totalForPct > 0 ? (v.amount_cents / totalForPct) * 100 : 0,
    }))
    .sort((a, b) => b.amount_cents - a.amount_cents);

  /* ═══ BY DAY ═══ */
  const dayMap = new Map<string, { orders: number; revenue_cents: number }>();
  for (const o of orders) {
    if (!o.paid_at) continue;
    const date = o.paid_at.slice(0, 10); // YYYY-MM-DD
    const cur = dayMap.get(date) ?? { orders: 0, revenue_cents: 0 };
    cur.orders += 1;
    cur.revenue_cents += o.total_cents;
    dayMap.set(date, cur);
  }
  const by_day = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  /* ═══ BY WEEKDAY ═══ */
  /* JS getDay() retourne 0=dimanche..6=samedi. On normalise vers 0=lundi..6=dimanche
   * (convention française — on commence la semaine le lundi). */
  const WEEKDAY_LABELS = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  const wdMap = new Map<number, { orders: number; revenue_cents: number }>();
  for (const o of orders) {
    if (!o.paid_at) continue;
    const jsDay = new Date(o.paid_at).getDay(); // 0=dim..6=sam
    const wd = (jsDay + 6) % 7; // 0=lun..6=dim
    const cur = wdMap.get(wd) ?? { orders: 0, revenue_cents: 0 };
    cur.orders += 1;
    cur.revenue_cents += o.total_cents;
    wdMap.set(wd, cur);
  }
  const by_weekday = WEEKDAY_LABELS.map((label, wd) => ({
    weekday: wd,
    weekday_label: label,
    orders: wdMap.get(wd)?.orders ?? 0,
    revenue_cents: wdMap.get(wd)?.revenue_cents ?? 0,
  }));

  /* ═══ TOP ITEMS ═══ */
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
    .slice(0, 20);

  const active_days = by_day.length;
  const avg_daily_revenue_cents =
    active_days > 0 ? Math.round(revenue_ttc_cents / active_days) : 0;

  return {
    kind,
    label,
    start_iso: startISO,
    end_iso: endISO,
    generated_at,
    days_in_period,
    totals: {
      orders_count,
      guests_count,
      revenue_ttc_cents,
      revenue_ht_cents,
      tax_cents,
      tip_cents,
      avg_ticket_cents:
        orders_count > 0 ? Math.round(revenue_ttc_cents / orders_count) : 0,
      avg_per_guest_cents:
        guests_count > 0 ? Math.round(revenue_ttc_cents / guests_count) : 0,
      cancelled_orders: cancelled.length,
      avg_daily_revenue_cents,
      active_days,
      discount_total_cents,
      discount_orders_count,
    },
    by_method,
    by_day,
    by_weekday,
    top_items,
    discounts_by_reason,
  };
}

/* ═══════════════════════════════════════════════════════════
   Helpers de période — convenience
   ═══════════════════════════════════════════════════════════ */

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Rapport d'un mois entier.
 * @param yearMonth format "YYYY-MM" (ex "2026-04")
 */
export async function getMonthlyReport(
  yearMonth: string,
  tenantId?: string
): Promise<PeriodReport> {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    throw new Error(`Invalid yearMonth: ${yearMonth} (expected YYYY-MM)`);
  }
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0); // 1er du mois suivant
  return getPeriodReport({
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    kind: "month",
    label: `${MONTH_NAMES[m - 1]} ${y}`,
    tenantId,
  });
}

/**
 * Rapport d'une année entière.
 * @param year format "YYYY" ou number (ex "2026")
 */
export async function getYearlyReport(
  year: string | number,
  tenantId?: string
): Promise<PeriodReport> {
  const y = typeof year === "string" ? parseInt(year, 10) : year;
  if (!y || y < 2020 || y > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
  return getPeriodReport({
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    kind: "year",
    label: String(y),
    tenantId,
  });
}

/**
 * Rapport d'une plage personnalisée (inclusive sur start, inclusive sur end).
 * @param startDate "YYYY-MM-DD"
 * @param endDate   "YYYY-MM-DD"
 */
export async function getCustomRangeReport(
  startDate: string,
  endDate: string,
  tenantId?: string
): Promise<PeriodReport> {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1); // exclusif → inclusif
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }
  if (end <= start) {
    throw new Error("End date must be after start date");
  }
  return getPeriodReport({
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    kind: "custom",
    label: `${startDate} → ${endDate}`,
    tenantId,
  });
}
