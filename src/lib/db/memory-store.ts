/**
 * MEMORY STORE — Fallback démo si Supabase n'est pas configuré.
 * Stockage en mémoire pendant la durée du serveur (perdu au redémarrage).
 * Parfait pour prototype/démo, à remplacer par Supabase en prod.
 */

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

type Store = {
  customers: Map<string, Customer>;
  reservations: Map<string, Reservation>;
  waiterCalls: Map<string, WaiterCall>;
};

/* Singleton global pour persister entre les requêtes pendant la vie du serveur */
const globalStore = globalThis as unknown as { __arcStore?: Store };

function getStore(): Store {
  if (!globalStore.__arcStore) {
    globalStore.__arcStore = {
      customers: new Map(),
      reservations: new Map(),
      waiterCalls: new Map(),
    };
    seedDemo(globalStore.__arcStore);
  }
  return globalStore.__arcStore;
}

function seedDemo(store: Store) {
  /* Quelques clients demo */
  const demoCustomers: Omit<Customer, "id" | "created_at" | "updated_at">[] = [
    {
      name: "Sophie Martinez",
      email: "sophie.m@example.com",
      phone: "06 12 34 56 78",
      first_visit: new Date(Date.now() - 90 * 86400000).toISOString(),
      last_visit: new Date(Date.now() - 5 * 86400000).toISOString(),
      visits_count: 12,
      tags: ["VIP", "Habituée"],
      vip: true,
      total_spent_cents: 48700,
      favorite_items: ["L'Arc en Ciel", "Tiramisu"],
    },
    {
      name: "Thomas Renard",
      email: "thomas.r@example.com",
      phone: "06 98 76 54 32",
      first_visit: new Date(Date.now() - 60 * 86400000).toISOString(),
      last_visit: new Date(Date.now() - 14 * 86400000).toISOString(),
      visits_count: 7,
      tags: ["Anniversaire juin"],
      vip: false,
      total_spent_cents: 23500,
    },
    {
      name: "Amina Kasri",
      email: "amina.k@example.com",
      phone: "06 44 55 66 77",
      first_visit: new Date(Date.now() - 30 * 86400000).toISOString(),
      last_visit: new Date(Date.now() - 2 * 86400000).toISOString(),
      visits_count: 4,
      tags: ["Halal", "Famille"],
      vip: false,
      total_spent_cents: 18200,
    },
  ];

  demoCustomers.forEach((c) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    store.customers.set(id, {
      ...c,
      id,
      created_at: now,
      updated_at: now,
    } as Customer);
  });

  /* Quelques réservations demo (aujourd'hui + cette semaine) */
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const customerIds = [...store.customers.keys()];

  const demoReservations: Omit<Reservation, "id" | "created_at" | "updated_at">[] = [
    {
      customer_id: customerIds[0],
      customer_name: "Sophie Martinez",
      customer_email: "sophie.m@example.com",
      customer_phone: "06 12 34 56 78",
      date: fmtDate(today),
      time: "19:30",
      guests: 4,
      table_number: 5,
      status: "confirmed",
      source: "website",
      notes: "Anniversaire — prévoir un gâteau si possible",
      special_occasion: "Anniversaire",
    },
    {
      customer_id: customerIds[1],
      customer_name: "Thomas Renard",
      customer_email: "thomas.r@example.com",
      customer_phone: "06 98 76 54 32",
      date: fmtDate(today),
      time: "20:00",
      guests: 2,
      table_number: 7,
      status: "confirmed",
      source: "google",
      notes: null,
      special_occasion: null,
    },
    {
      customer_id: customerIds[2],
      customer_name: "Amina Kasri",
      customer_email: "amina.k@example.com",
      customer_phone: "06 44 55 66 77",
      date: fmtDate(new Date(today.getTime() + 86400000)),
      time: "12:30",
      guests: 6,
      status: "pending",
      source: "website",
      notes: "Allergie aux fruits à coque",
      special_occasion: null,
    },
  ];

  demoReservations.forEach((r) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    store.reservations.set(id, {
      ...r,
      id,
      created_at: now,
      updated_at: now,
    } as Reservation);
  });

  /* Un waiter call en cours de démo */
  const callId = crypto.randomUUID();
  store.waiterCalls.set(callId, {
    id: callId,
    table_number: 3,
    request_type: "Apporter de l'eau",
    status: "pending",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    resolved_at: null,
    resolved_by: null,
  });
}

/* ── CUSTOMERS ──────────────────────────────────────────── */
export function listCustomers(): Customer[] {
  return [...getStore().customers.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getCustomer(id: string): Customer | undefined {
  return getStore().customers.get(id);
}

export function findCustomerByEmailOrPhone(
  email?: string,
  phone?: string
): Customer | undefined {
  const all = [...getStore().customers.values()];
  if (email) {
    const byEmail = all.find((c) => c.email === email);
    if (byEmail) return byEmail;
  }
  if (phone) {
    const normalizedPhone = phone.replace(/\s/g, "");
    return all.find(
      (c) => c.phone && c.phone.replace(/\s/g, "") === normalizedPhone
    );
  }
  return undefined;
}

export function upsertCustomer(
  data: Partial<Customer> & { name: string }
): Customer {
  const existing = findCustomerByEmailOrPhone(
    data.email || undefined,
    data.phone || undefined
  );
  const now = new Date().toISOString();

  if (existing) {
    const updated: Customer = {
      ...existing,
      ...data,
      updated_at: now,
      visits_count: existing.visits_count + (data.visits_count || 0),
    };
    getStore().customers.set(existing.id, updated);
    return updated;
  }

  const id = crypto.randomUUID();
  const customer: Customer = {
    id,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    first_visit: now,
    last_visit: null,
    visits_count: 0,
    notes: data.notes || null,
    tags: data.tags || [],
    vip: data.vip || false,
    birthday: data.birthday || null,
    allergies: data.allergies || null,
    favorite_items: data.favorite_items || null,
    total_spent_cents: 0,
    created_at: now,
    updated_at: now,
  };
  getStore().customers.set(id, customer);
  return customer;
}

/* ── RESERVATIONS ──────────────────────────────────────────── */
export function listReservations(filters?: {
  date?: string;
  status?: ReservationStatus;
}): Reservation[] {
  let items = [...getStore().reservations.values()];
  if (filters?.date) items = items.filter((r) => r.date === filters.date);
  if (filters?.status) items = items.filter((r) => r.status === filters.status);
  return items.sort((a, b) => {
    const dA = new Date(`${a.date}T${a.time}`).getTime();
    const dB = new Date(`${b.date}T${b.time}`).getTime();
    return dA - dB;
  });
}

export function getReservation(id: string): Reservation | undefined {
  return getStore().reservations.get(id);
}

export function createReservation(
  payload: CreateReservationPayload
): Reservation {
  const customer = upsertCustomer({
    name: payload.customer_name,
    email: payload.customer_email,
    phone: payload.customer_phone,
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const reservation: Reservation = {
    id,
    customer_id: customer.id,
    customer_name: payload.customer_name,
    customer_email: payload.customer_email || null,
    customer_phone: payload.customer_phone,
    date: payload.date,
    time: payload.time,
    guests: payload.guests,
    table_number: null,
    status: "pending",
    source: payload.source || "website",
    notes: payload.notes || null,
    special_occasion: payload.special_occasion || null,
    created_at: now,
    updated_at: now,
  };
  getStore().reservations.set(id, reservation);
  return reservation;
}

export function updateReservation(
  id: string,
  updates: Partial<Reservation>
): Reservation | undefined {
  const existing = getStore().reservations.get(id);
  if (!existing) return undefined;
  const updated: Reservation = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  getStore().reservations.set(id, updated);
  return updated;
}

/* ── WAITER CALLS ──────────────────────────────────────────── */
export function listWaiterCalls(filters?: {
  status?: WaiterCallStatus;
}): WaiterCall[] {
  let items = [...getStore().waiterCalls.values()];
  if (filters?.status) items = items.filter((w) => w.status === filters.status);
  return items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function createWaiterCall(payload: CreateWaiterCallPayload): WaiterCall {
  const id = crypto.randomUUID();
  const call: WaiterCall = {
    id,
    table_number: payload.table_number,
    request_type: payload.request_type,
    status: "pending",
    created_at: new Date().toISOString(),
    resolved_at: null,
    resolved_by: null,
  };
  getStore().waiterCalls.set(id, call);
  return call;
}

export function updateWaiterCall(
  id: string,
  updates: Partial<WaiterCall>
): WaiterCall | undefined {
  const existing = getStore().waiterCalls.get(id);
  if (!existing) return undefined;
  const updated: WaiterCall = { ...existing, ...updates };
  if (updates.status === "resolved" && !updated.resolved_at) {
    updated.resolved_at = new Date().toISOString();
  }
  getStore().waiterCalls.set(id, updated);
  return updated;
}

/* ── DASHBOARD STATS ──────────────────────────────────────────── */
export function getDashboardStats(): DashboardStats {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const allReservations = [...getStore().reservations.values()];
  const todayRes = allReservations.filter((r) => r.date === today);
  const weekRes = allReservations.filter(
    (r) => new Date(r.date) >= weekAgo
  );

  const customers = [...getStore().customers.values()];
  const newCustomers = customers.filter(
    (c) => new Date(c.first_visit || c.created_at) >= weekAgo
  );
  const topCustomers = customers
    .sort((a, b) => b.visits_count - a.visits_count)
    .slice(0, 5);

  const calls = [...getStore().waiterCalls.values()];
  const pendingCalls = calls.filter((c) => c.status === "pending");

  const upcoming = allReservations
    .filter((r) => {
      const dt = new Date(`${r.date}T${r.time}`);
      return dt >= new Date() && r.status !== "cancelled";
    })
    .sort((a, b) => {
      const dA = new Date(`${a.date}T${a.time}`).getTime();
      const dB = new Date(`${b.date}T${b.time}`).getTime();
      return dA - dB;
    })
    .slice(0, 5);

  return {
    today: {
      reservations: todayRes.length,
      guests: todayRes.reduce((sum, r) => sum + r.guests, 0),
      pending_calls: pendingCalls.length,
    },
    week: {
      reservations: weekRes.length,
      new_customers: newCustomers.length,
    },
    top_customers: topCustomers,
    upcoming_reservations: upcoming,
    recent_calls: calls.slice(0, 5),
  };
}
