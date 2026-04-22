/**
 * PROSPECTS CLIENT — Outbound prospection GOURMET PACK.
 * Bascule automatique Supabase (prod) ↔ Memory (démo).
 *
 * Même pattern que leads-client.ts — si SUPABASE n'est pas configuré,
 * on stocke en mémoire globale pour faire tourner la démo sans DB.
 */

import type {
  Prospect,
  ProspectEmail,
  ProspectStatus,
  ProspectStats,
  CreateProspectPayload,
} from "./prospects-types";
import { PROSPECT_STATUSES } from "./prospects-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

/* ── Supabase REST fetch ───────────────────────────────── */
async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  // PATCH/DELETE with Prefer=representation can return a single row,
  // here we always parse JSON for simplicity.
  return res.json() as Promise<T>;
}

/* ── Memory store fallback ─────────────────────────────── */
type ProspectsStore = {
  prospects: Map<string, Prospect>;
  emails: Map<string, ProspectEmail>;
};
const globalStore = globalThis as unknown as {
  __prospectsStore?: ProspectsStore;
};

function getMemStore(): ProspectsStore {
  if (!globalStore.__prospectsStore) {
    globalStore.__prospectsStore = {
      prospects: new Map(),
      emails: new Map(),
    };
  }
  return globalStore.__prospectsStore;
}

function normalizePayload(p: CreateProspectPayload): CreateProspectPayload {
  return {
    restaurant_name: p.restaurant_name.trim(),
    address: p.address?.trim() || null,
    city: p.city?.trim() || null,
    postal_code: p.postal_code?.trim() || null,
    country: p.country?.trim() || "France",
    phone: p.phone?.trim() || null,
    email: p.email?.trim().toLowerCase() || null,
    website: p.website?.trim() || null,
    google_maps_url: p.google_maps_url?.trim() || null,
    rating:
      typeof p.rating === "number" && Number.isFinite(p.rating)
        ? Math.round(p.rating * 10) / 10
        : null,
    reviews_count:
      typeof p.reviews_count === "number" && Number.isFinite(p.reviews_count)
        ? Math.max(0, Math.floor(p.reviews_count))
        : null,
    cuisine_type: p.cuisine_type?.trim() || null,
    price_range: p.price_range?.trim() || null,
    notes: p.notes?.trim() || null,
    source: p.source?.trim() || "google_maps",
    tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
  };
}

/* ═══════════════════════════════════════════════════════════
   LIST PROSPECTS
   ═══════════════════════════════════════════════════════════ */

export async function listProspects(filters?: {
  status?: ProspectStatus;
  city?: string;
}): Promise<Prospect[]> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    let rows = [...store.prospects.values()];
    if (filters?.status) rows = rows.filter((p) => p.status === filters.status);
    if (filters?.city) {
      const needle = filters.city.toLowerCase();
      rows = rows.filter((p) => (p.city || "").toLowerCase() === needle);
    }
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
  });
  if (filters?.status) params.set("status", `eq.${filters.status}`);
  if (filters?.city) params.set("city", `eq.${filters.city}`);
  return sb<Prospect[]>(`prospects?${params.toString()}`);
}

/* ═══════════════════════════════════════════════════════════
   GET SINGLE PROSPECT
   ═══════════════════════════════════════════════════════════ */

export async function getProspect(id: string): Promise<Prospect | null> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    return store.prospects.get(id) || null;
  }
  const rows = await sb<Prospect[]>(
    `prospects?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows[0] || null;
}

/* ═══════════════════════════════════════════════════════════
   CREATE PROSPECT (single)
   ═══════════════════════════════════════════════════════════ */

export async function createProspect(
  payload: CreateProspectPayload
): Promise<Prospect> {
  const body = normalizePayload(payload);

  if (!USE_SUPABASE) {
    const store = getMemStore();
    const now = new Date().toISOString();
    const prospect: Prospect = {
      id: crypto.randomUUID(),
      restaurant_name: body.restaurant_name,
      address: body.address ?? null,
      city: body.city ?? null,
      postal_code: body.postal_code ?? null,
      country: body.country ?? "France",
      phone: body.phone ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      google_maps_url: body.google_maps_url ?? null,
      rating: body.rating ?? null,
      reviews_count: body.reviews_count ?? null,
      cuisine_type: body.cuisine_type ?? null,
      price_range: body.price_range ?? null,
      status: "new",
      emails_sent: 0,
      last_email_at: null,
      last_reply_at: null,
      notes: body.notes ?? null,
      source: body.source ?? "google_maps",
      tags: body.tags ?? [],
      created_at: now,
      updated_at: now,
    };
    store.prospects.set(prospect.id, prospect);
    return prospect;
  }

  const [row] = await sb<Prospect[]>(`prospects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return row;
}

/* ═══════════════════════════════════════════════════════════
   CREATE PROSPECTS BATCH
   Dedup optionnel fait au niveau de l'appelant (route import).
   ═══════════════════════════════════════════════════════════ */

export async function createProspectsBatch(
  payloads: CreateProspectPayload[]
): Promise<Prospect[]> {
  if (payloads.length === 0) return [];
  const normalized = payloads.map(normalizePayload);

  if (!USE_SUPABASE) {
    const out: Prospect[] = [];
    for (const p of normalized) {
      out.push(await createProspect(p));
    }
    return out;
  }

  return sb<Prospect[]>(`prospects`, {
    method: "POST",
    body: JSON.stringify(normalized),
  });
}

/* ═══════════════════════════════════════════════════════════
   UPDATE PROSPECT
   ═══════════════════════════════════════════════════════════ */

export async function updateProspect(
  id: string,
  updates: Partial<Prospect>
): Promise<Prospect | undefined> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const existing = store.prospects.get(id);
    if (!existing) return undefined;
    const updated: Prospect = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    store.prospects.set(id, updated);
    return updated;
  }

  const safe: Partial<Prospect> = { ...updates };
  delete safe.id;
  delete safe.created_at;
  delete safe.updated_at;

  const [row] = await sb<Prospect[]>(
    `prospects?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(safe),
    }
  );
  return row;
}

/* ═══════════════════════════════════════════════════════════
   DEDUP — trouve un prospect existant par (restaurant_name, city)
   ═══════════════════════════════════════════════════════════ */

export async function findProspectByNameCity(
  restaurantName: string,
  city: string | null | undefined
): Promise<Prospect | null> {
  const normName = restaurantName.trim().toLowerCase();
  const normCity = (city || "").trim().toLowerCase();

  if (!USE_SUPABASE) {
    const store = getMemStore();
    for (const p of store.prospects.values()) {
      if (
        p.restaurant_name.trim().toLowerCase() === normName &&
        (p.city || "").trim().toLowerCase() === normCity
      ) {
        return p;
      }
    }
    return null;
  }

  const params = new URLSearchParams({
    select: "*",
    limit: "1",
  });
  params.set("restaurant_name", `ilike.${restaurantName.trim()}`);
  if (city) {
    params.set("city", `ilike.${city.trim()}`);
  } else {
    params.set("city", "is.null");
  }
  const rows = await sb<Prospect[]>(`prospects?${params.toString()}`);
  return rows[0] || null;
}

/* ═══════════════════════════════════════════════════════════
   EMAILS LOG
   ═══════════════════════════════════════════════════════════ */

export async function addProspectEmail(
  prospect_id: string,
  template_id: string,
  subject: string,
  body: string,
  resend_id?: string | null
): Promise<ProspectEmail> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const now = new Date().toISOString();
    const email: ProspectEmail = {
      id: crypto.randomUUID(),
      prospect_id,
      template_id,
      subject,
      body,
      resend_id: resend_id || null,
      sent_at: now,
      opened_at: null,
      replied_at: null,
    };
    store.emails.set(email.id, email);
    return email;
  }

  const [row] = await sb<ProspectEmail[]>(`prospect_emails`, {
    method: "POST",
    body: JSON.stringify({
      prospect_id,
      template_id,
      subject,
      body,
      resend_id: resend_id || null,
    }),
  });
  return row;
}

export async function listProspectEmails(
  prospect_id: string
): Promise<ProspectEmail[]> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    return [...store.emails.values()]
      .filter((e) => e.prospect_id === prospect_id)
      .sort((a, b) => b.sent_at.localeCompare(a.sent_at));
  }
  const params = new URLSearchParams({
    select: "*",
    order: "sent_at.desc",
  });
  params.set("prospect_id", `eq.${prospect_id}`);
  return sb<ProspectEmail[]>(`prospect_emails?${params.toString()}`);
}

/* ═══════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════ */

export async function getProspectStats(): Promise<ProspectStats> {
  const rows = await listProspects();
  const base: ProspectStats = {
    new: 0,
    queued: 0,
    contacted: 0,
    replied: 0,
    meeting_booked: 0,
    negotiating: 0,
    won: 0,
    lost: 0,
    unreachable: 0,
    total: rows.length,
    won_rate_percent: 0,
  };
  for (const r of rows) {
    if (PROSPECT_STATUSES.includes(r.status)) {
      base[r.status] += 1;
    }
  }
  const contactedOrLater =
    base.contacted +
    base.replied +
    base.meeting_booked +
    base.negotiating +
    base.won +
    base.lost;
  base.won_rate_percent =
    contactedOrLater > 0
      ? Math.round((base.won / contactedOrLater) * 1000) / 10
      : 0;
  return base;
}

export function isDemoMode() {
  return !USE_SUPABASE;
}
