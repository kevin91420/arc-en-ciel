/**
 * CRM — Types partagés entre client et serveur
 */

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type ReservationSource =
  | "website"
  | "phone"
  | "google"
  | "thefork"
  | "walk_in"
  | "other";

export type WaiterCallStatus = "pending" | "in_progress" | "resolved" | "cancelled";

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  first_visit?: string;
  last_visit?: string | null;
  visits_count: number;
  notes?: string | null;
  tags: string[];
  vip: boolean;
  birthday?: string | null;
  allergies?: string[] | null;
  favorite_items?: string[] | null;
  total_spent_cents: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guests: number;
  table_number?: number | null;
  status: ReservationStatus;
  source: ReservationSource;
  notes?: string | null;
  special_occasion?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaiterCall {
  id: string;
  table_number: number;
  request_type: string;
  status: WaiterCallStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface RestaurantTable {
  number: number;
  capacity: number;
  location: "salle" | "terrasse" | "bar" | "privatif";
  is_active: boolean;
}

export interface AppEvent {
  id: string;
  event_type: string;
  customer_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  today: {
    reservations: number;
    guests: number;
    pending_calls: number;
  };
  week: {
    reservations: number;
    new_customers: number;
  };
  top_customers: Customer[];
  upcoming_reservations: Reservation[];
  recent_calls: WaiterCall[];
}

/* ── Form payloads ───────────────────────────────────────── */
export interface CreateReservationPayload {
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  special_occasion?: string;
  source?: ReservationSource;
}

export interface CreateWaiterCallPayload {
  table_number: number;
  request_type: string;
}
