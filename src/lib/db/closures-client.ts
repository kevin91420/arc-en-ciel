/**
 * CLOSURES CLIENT — CRUD pour les clôtures journalières + mensuelles.
 *
 * Sprint 7b QW#10. Tenant-aware.
 *
 * Le snapshot Z est figé au moment de la clôture pour audit immuable
 * (NF525-friendly : même si on modifie/annule une commande après, le
 * Z imprimé/exporté du jour reste cohérent).
 */

import type {
  CreateDailyClosurePayload,
  DailyClosureFull,
  DailyClosureRow,
  DailyStatus,
  DailyStatusInfo,
  MonthlyClosureRow,
} from "./closures-types";
import { getCurrentTenantId } from "./tenant";
import { getZReport } from "./pos-client";

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
   DAILY CLOSURES
   ═══════════════════════════════════════════════════════════ */

/**
 * Crée la clôture journalière pour une date donnée.
 * Capture le Z snapshot au moment de la clôture (figé, immuable).
 *
 * Throw si la date est déjà clôturée (unique constraint).
 */
export async function createDailyClosure(
  payload: CreateDailyClosurePayload,
  tenantId?: string
): Promise<DailyClosureRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const tid = await resolveTenantId(tenantId);

  /* Capture le Z report au moment T pour figer le snapshot */
  const zReport = await getZReport(payload.service_date, tid);

  const row = {
    restaurant_id: tid,
    service_date: payload.service_date,
    closed_by_staff_id: payload.closed_by_staff_id,
    z_snapshot: zReport,
    revenue_ttc_cents: zReport.totals.revenue_ttc_cents,
    revenue_ht_cents: zReport.totals.revenue_ht_cents,
    tax_cents: zReport.totals.tax_cents,
    tip_cents: zReport.totals.tip_cents,
    discount_total_cents: zReport.totals.discount_total_cents ?? 0,
    orders_count: zReport.totals.orders_count,
    guests_count: zReport.totals.guests_count,
    notes: payload.notes ?? null,
  };

  try {
    const [created] = await sb<DailyClosureRow[]>("daily_closures", {
      method: "POST",
      body: JSON.stringify(row),
    });
    return created;
  } catch (err) {
    /* Unique violation → message explicite */
    const msg = (err as Error).message || "";
    if (msg.includes("23505") || msg.includes("duplicate")) {
      throw new Error(
        `La journée du ${payload.service_date} est déjà clôturée. Une clôture est définitive.`
      );
    }
    throw err;
  }
}

/**
 * Récupère la clôture pour une date donnée, si elle existe.
 */
export async function getDailyClosure(
  serviceDate: string,
  tenantId?: string
): Promise<DailyClosureRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);
  const rows = await sb<DailyClosureRow[]>(
    `daily_closures?select=*&service_date=eq.${encodeURIComponent(serviceDate)}${tc(tid)}&limit=1`
  );
  return rows[0] ?? null;
}

/**
 * Récupère le statut d'une journée (closed / open / empty) sans charger
 * tout le snapshot. Pour le calendar mensuel.
 */
export async function getDailyStatus(
  serviceDate: string,
  tenantId?: string
): Promise<DailyStatusInfo> {
  if (!USE_SUPABASE) {
    return {
      service_date: serviceDate,
      status: "empty",
      orders_count: 0,
      revenue_ttc_cents: 0,
    };
  }
  const tid = await resolveTenantId(tenantId);

  /* 1. Clôture existante ? */
  const closure = await getDailyClosure(serviceDate, tid);
  if (closure) {
    return {
      service_date: serviceDate,
      status: "closed",
      orders_count: closure.orders_count,
      revenue_ttc_cents: closure.revenue_ttc_cents,
      closure: {
        id: closure.id,
        closed_at: closure.closed_at,
        notes: closure.notes,
      },
    };
  }

  /* 2. Pas clôturé — y a-t-il eu de l'activité ? */
  const start = `${serviceDate}T00:00:00`;
  const end = new Date(`${serviceDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const orders = await sb<{ total_cents: number }[]>(
    `orders?select=total_cents&status=eq.paid&paid_at=gte.${encodeURIComponent(start)}&paid_at=lt.${encodeURIComponent(end.toISOString())}${tc(tid)}`
  );

  if (orders.length === 0) {
    return {
      service_date: serviceDate,
      status: "empty",
      orders_count: 0,
      revenue_ttc_cents: 0,
    };
  }

  return {
    service_date: serviceDate,
    status: "open",
    orders_count: orders.length,
    revenue_ttc_cents: orders.reduce((s, o) => s + o.total_cents, 0),
  };
}

/**
 * Liste les statuts journaliers d'un mois entier (calendar view).
 *
 * @param year   ex 2026
 * @param month  ex 5 (mai), 1-12
 */
export async function listDailyStatusesForMonth(
  year: number,
  month: number,
  tenantId?: string
): Promise<DailyStatusInfo[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const startDate = startISO.slice(0, 10);
  const endDate = endISO.slice(0, 10);

  /* Clôtures déjà faites du mois */
  const closures = await sb<DailyClosureRow[]>(
    `daily_closures?select=*&service_date=gte.${startDate}&service_date=lt.${endDate}${tc(tid)}&order=service_date.asc`
  );
  const closureByDate = new Map(closures.map((c) => [c.service_date, c]));

  /* Commandes payées du mois (groupées par jour) */
  const orders = await sb<{ paid_at: string; total_cents: number }[]>(
    `orders?select=paid_at,total_cents&status=eq.paid&paid_at=gte.${encodeURIComponent(startISO)}&paid_at=lt.${encodeURIComponent(endISO)}${tc(tid)}`
  );

  /* Aggregate orders by date */
  const ordersByDate = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    if (!o.paid_at) continue;
    const date = o.paid_at.slice(0, 10);
    const cur = ordersByDate.get(date) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.total_cents;
    ordersByDate.set(date, cur);
  }

  /* Build result : un row par jour du mois, du 1er au dernier */
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: DailyStatusInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const closure = closureByDate.get(dateStr);
    if (closure) {
      result.push({
        service_date: dateStr,
        status: "closed",
        orders_count: closure.orders_count,
        revenue_ttc_cents: closure.revenue_ttc_cents,
        closure: {
          id: closure.id,
          closed_at: closure.closed_at,
          notes: closure.notes,
        },
      });
    } else {
      const ordersAgg = ordersByDate.get(dateStr);
      if (ordersAgg) {
        result.push({
          service_date: dateStr,
          status: "open",
          orders_count: ordersAgg.count,
          revenue_ttc_cents: ordersAgg.revenue,
        });
      } else {
        result.push({
          service_date: dateStr,
          status: "empty",
          orders_count: 0,
          revenue_ttc_cents: 0,
        });
      }
    }
  }

  return result;
}

/**
 * Liste les N dernières clôtures (pour historique manager).
 */
export async function listRecentClosures(
  limit: number = 30,
  tenantId?: string
): Promise<DailyClosureFull[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(tenantId);

  const rows = await sb<DailyClosureRow[]>(
    `daily_closures?select=*${tc(tid)}&order=service_date.desc&limit=${limit}`
  );
  if (rows.length === 0) return [];

  /* Charge les noms des managers qui ont clôturé */
  const staffIds = [...new Set(rows.map((r) => r.closed_by_staff_id).filter(Boolean))];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staff = await sb<{ id: string; name: string }[]>(
      `staff_members?select=id,name&id=in.(${staffIds.map((i) => `"${i}"`).join(",")})${tc(tid)}`
    );
    for (const s of staff) staffMap.set(s.id, s.name);
  }

  return rows.map((r) => ({
    ...r,
    closed_by_name: staffMap.get(r.closed_by_staff_id),
  }));
}

/**
 * Récupère la dernière journée NON clôturée mais qui a eu de l'activité.
 * Utilisé pour afficher le banner "Tu as oublié de clôturer XX".
 *
 * Cherche jusqu'à 7 jours en arrière.
 */
export async function getLatestPendingClosure(
  tenantId?: string
): Promise<DailyStatusInfo | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysBack);
    const dateStr = d.toISOString().slice(0, 10);

    const status = await getDailyStatus(dateStr, tid);
    if (status.status === "open") {
      /* Premier jour ouvert trouvé en remontant — on alerte */
      return status;
    }
    if (status.status === "closed") {
      /* On a trouvé un jour clôturé, ça veut dire que tout ce qui est avant est OK */
      return null;
    }
  }

  return null;
}

/* Re-export type pour conv */
export type { DailyStatus };
