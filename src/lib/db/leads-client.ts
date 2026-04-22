/**
 * LEADS CLIENT — Pipeline commercial GOURMET PACK
 * Bascule automatique Supabase (prod) ↔ Memory (démo)
 */

import type { PackLead, CreateLeadPayload, LeadStatus } from "./leads-types";

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
  return res.json() as Promise<T>;
}

/* ── Memory store fallback ─────────────────────────────── */
type LeadsStore = {
  leads: Map<string, PackLead>;
};
const globalStore = globalThis as unknown as { __leadsStore?: LeadsStore };

function getMemStore(): LeadsStore {
  if (!globalStore.__leadsStore) {
    globalStore.__leadsStore = { leads: new Map() };
  }
  return globalStore.__leadsStore;
}

/* ═══════════════════════════════════════════════════════════
   CREATE LEAD
   ═══════════════════════════════════════════════════════════ */

export async function createLead(payload: CreateLeadPayload): Promise<PackLead> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const now = new Date().toISOString();
    const lead: PackLead = {
      id: crypto.randomUUID(),
      restaurant_name: payload.restaurant_name,
      contact_name: payload.contact_name,
      email: payload.email,
      phone: payload.phone || null,
      interest: payload.interest || null,
      status: "new",
      source: payload.source || "landing",
      notes: null,
      next_followup: null,
      created_at: now,
      updated_at: now,
    };
    store.leads.set(lead.id, lead);
    return lead;
  }

  const [row] = await sb<PackLead[]>(`pack_leads`, {
    method: "POST",
    body: JSON.stringify({
      restaurant_name: payload.restaurant_name,
      contact_name: payload.contact_name,
      email: payload.email,
      phone: payload.phone || null,
      interest: payload.interest || null,
      source: payload.source || "landing",
    }),
  });
  return row;
}

/* ═══════════════════════════════════════════════════════════
   LIST LEADS
   ═══════════════════════════════════════════════════════════ */

export async function listLeads(filters?: {
  status?: LeadStatus;
}): Promise<PackLead[]> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    let leads = [...store.leads.values()];
    if (filters?.status) {
      leads = leads.filter((l) => l.status === filters.status);
    }
    return leads.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
  });
  if (filters?.status) params.set("status", `eq.${filters.status}`);
  return sb<PackLead[]>(`pack_leads?${params.toString()}`);
}

/* ═══════════════════════════════════════════════════════════
   GET LEAD (single)
   ═══════════════════════════════════════════════════════════ */

export async function getLead(id: string): Promise<PackLead | null> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    return store.leads.get(id) || null;
  }
  const rows = await sb<PackLead[]>(
    `pack_leads?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows[0] || null;
}

/* ═══════════════════════════════════════════════════════════
   UPDATE LEAD
   ═══════════════════════════════════════════════════════════ */

export async function updateLead(
  id: string,
  updates: Partial<PackLead>
): Promise<PackLead | undefined> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const existing = store.leads.get(id);
    if (!existing) return undefined;
    const updated: PackLead = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    store.leads.set(id, updated);
    return updated;
  }

  // Strip fields that must not be client-writable
  const safeUpdates: Partial<PackLead> = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.created_at;
  delete safeUpdates.updated_at;

  const [row] = await sb<PackLead[]>(
    `pack_leads?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(safeUpdates),
    }
  );
  return row;
}

export function isDemoMode() {
  return !USE_SUPABASE;
}
