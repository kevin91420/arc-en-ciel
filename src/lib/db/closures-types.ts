/**
 * CLOSURES TYPES — Sprint 7b QW#10 : clôtures journalières et mensuelles.
 *
 * Le manager doit clôturer chaque journée à la fin du service. Snapshot
 * Z immutable + audit trail complet pour NF525.
 */

import type { ZReport } from "./pos-client";

export interface DailyClosureRow {
  id: string;
  restaurant_id: string;
  service_date: string;          // "YYYY-MM-DD"
  closed_by_staff_id: string;
  closed_at: string;             // ISO
  z_snapshot: ZReport | Record<string, unknown>;
  revenue_ttc_cents: number;
  revenue_ht_cents: number;
  tax_cents: number;
  tip_cents: number;
  discount_total_cents: number;
  orders_count: number;
  guests_count: number;
  notes: string | null;
  created_at: string;
}

export interface MonthlyClosureRow {
  id: string;
  restaurant_id: string;
  service_month: string;         // "YYYY-MM-01"
  closed_by_staff_id: string;
  closed_at: string;
  period_snapshot: Record<string, unknown>;
  revenue_ttc_cents: number;
  revenue_ht_cents: number;
  tax_cents: number;
  tip_cents: number;
  discount_total_cents: number;
  orders_count: number;
  notes: string | null;
  created_at: string;
}

/**
 * Vue enrichie : la clôture + le nom du manager qui a clôturé.
 */
export interface DailyClosureFull extends DailyClosureRow {
  closed_by_name?: string;
}

/**
 * Status journalier — calculé pour chaque date demandée :
 *   - closed   : la journée a une row dans daily_closures
 *   - open     : la journée a des commandes mais n'est pas clôturée
 *   - empty    : la journée n'a pas eu d'activité (pas besoin de clôturer)
 */
export type DailyStatus = "closed" | "open" | "empty";

export interface DailyStatusInfo {
  service_date: string;
  status: DailyStatus;
  /* Si open ou closed, infos de base */
  orders_count: number;
  revenue_ttc_cents: number;
  /* Si closed, infos de la clôture */
  closure?: {
    id: string;
    closed_at: string;
    closed_by_name?: string;
    notes: string | null;
  };
}

export interface CreateDailyClosurePayload {
  service_date: string;          // "YYYY-MM-DD"
  closed_by_staff_id: string;
  notes?: string;
}
