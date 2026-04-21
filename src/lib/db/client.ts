/**
 * DB CLIENT — Switch automatique entre Supabase (prod) et Memory (démo)
 *
 * Pour activer Supabase : ajouter les env vars
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * dans .env.local ou Vercel settings.
 */

import * as memory from "./memory-store";
import type {
  Customer,
  Reservation,
  WaiterCall,
  CreateReservationPayload,
  CreateWaiterCallPayload,
  DashboardStats,
  ReservationStatus,
  WaiterCallStatus,
} from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

/* ── SUPABASE REST API via fetch (pas de dep supplémentaire) ── */
async function supabaseFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!USE_SUPABASE) throw new Error("Supabase not configured");
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
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
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/* ──────────────────────────────────────────────────────────
   PUBLIC API — Unifiée, bascule Supabase / Memory
   ────────────────────────────────────────────────────────── */

export async function listCustomers(): Promise<Customer[]> {
  if (!USE_SUPABASE) return memory.listCustomers();
  return supabaseFetch<Customer[]>(
    "customers?select=*&order=updated_at.desc"
  );
}

export async function listReservations(filters?: {
  date?: string;
  status?: ReservationStatus;
}): Promise<Reservation[]> {
  if (!USE_SUPABASE) return memory.listReservations(filters);
  const params = new URLSearchParams({ select: "*", order: "date.asc,time.asc" });
  if (filters?.date) params.set("date", `eq.${filters.date}`);
  if (filters?.status) params.set("status", `eq.${filters.status}`);
  return supabaseFetch<Reservation[]>(`reservations?${params.toString()}`);
}

export async function createReservation(
  payload: CreateReservationPayload
): Promise<Reservation> {
  if (!USE_SUPABASE) return memory.createReservation(payload);

  /* 1. Upsert customer (find by email OR phone, else create) */
  const customerId = await upsertCustomerSupabase({
    name: payload.customer_name,
    email: payload.customer_email,
    phone: payload.customer_phone,
  });

  /* 2. Create reservation linked to the customer */
  const [row] = await supabaseFetch<Reservation[]>(`reservations`, {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      status: "pending",
      source: payload.source || "website",
      notes: payload.notes,
      special_occasion: payload.special_occasion,
    }),
  });
  return row;
}

/**
 * Upsert customer by email OR phone. Returns the customer ID.
 */
async function upsertCustomerSupabase(data: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<string | null> {
  /* Try to find existing customer by email first, then phone */
  if (data.email) {
    const byEmail = await supabaseFetch<Customer[]>(
      `customers?select=id&email=eq.${encodeURIComponent(data.email)}&limit=1`
    );
    if (byEmail.length > 0) {
      /* Update last_visit and bump visits_count */
      await supabaseFetch(`customers?id=eq.${byEmail[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_visit: new Date().toISOString(),
        }),
      });
      return byEmail[0].id;
    }
  }

  if (data.phone) {
    const normalizedPhone = data.phone.replace(/\s/g, "");
    const byPhone = await supabaseFetch<Customer[]>(
      `customers?select=id&phone=eq.${encodeURIComponent(
        normalizedPhone
      )}&limit=1`
    );
    if (byPhone.length > 0) {
      await supabaseFetch(`customers?id=eq.${byPhone[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_visit: new Date().toISOString(),
        }),
      });
      return byPhone[0].id;
    }
  }

  /* Create new customer */
  try {
    const [row] = await supabaseFetch<Customer[]>(`customers`, {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email || null,
        phone: data.phone?.replace(/\s/g, "") || null,
      }),
    });
    return row?.id || null;
  } catch {
    return null;
  }
}

export async function updateReservation(
  id: string,
  updates: Partial<Reservation>
): Promise<Reservation | undefined> {
  if (!USE_SUPABASE) return memory.updateReservation(id, updates);
  const [row] = await supabaseFetch<Reservation[]>(
    `reservations?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
  return row;
}

export async function listWaiterCalls(filters?: {
  status?: WaiterCallStatus;
}): Promise<WaiterCall[]> {
  if (!USE_SUPABASE) return memory.listWaiterCalls(filters);
  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
  });
  if (filters?.status) params.set("status", `eq.${filters.status}`);
  return supabaseFetch<WaiterCall[]>(`waiter_calls?${params.toString()}`);
}

export async function createWaiterCall(
  payload: CreateWaiterCallPayload
): Promise<WaiterCall> {
  if (!USE_SUPABASE) return memory.createWaiterCall(payload);
  const [row] = await supabaseFetch<WaiterCall[]>(`waiter_calls`, {
    method: "POST",
    body: JSON.stringify({
      table_number: payload.table_number,
      request_type: payload.request_type,
      status: "pending",
    }),
  });
  return row;
}

export async function updateWaiterCall(
  id: string,
  updates: Partial<WaiterCall>
): Promise<WaiterCall | undefined> {
  if (!USE_SUPABASE) return memory.updateWaiterCall(id, updates);
  const [row] = await supabaseFetch<WaiterCall[]>(
    `waiter_calls?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
  return row;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!USE_SUPABASE) return memory.getDashboardStats();
  /* Pour Supabase, on fait plusieurs requêtes en parallèle */
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const [todayRes, weekRes, calls, customers, upcoming] = await Promise.all([
    supabaseFetch<Reservation[]>(`reservations?select=*&date=eq.${today}`),
    supabaseFetch<Reservation[]>(`reservations?select=*&date=gte.${weekAgo}`),
    supabaseFetch<WaiterCall[]>(
      `waiter_calls?select=*&status=eq.pending`
    ),
    supabaseFetch<Customer[]>(
      `customers?select=*&order=visits_count.desc&limit=5`
    ),
    supabaseFetch<Reservation[]>(
      `reservations?select=*&date=gte.${today}&status=neq.cancelled&order=date.asc,time.asc&limit=5`
    ),
  ]);

  const newCustomers = await supabaseFetch<Customer[]>(
    `customers?select=*&first_visit=gte.${weekAgo}`
  );

  return {
    today: {
      reservations: todayRes.length,
      guests: todayRes.reduce((s, r) => s + r.guests, 0),
      pending_calls: calls.length,
    },
    week: {
      reservations: weekRes.length,
      new_customers: newCustomers.length,
    },
    top_customers: customers,
    upcoming_reservations: upcoming,
    recent_calls: calls.slice(0, 5),
  };
}

export function isDemoMode() {
  return !USE_SUPABASE;
}
