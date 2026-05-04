/**
 * PHONE CLIENT — CRUD téléphonie IA + audit log (Sprint 7b QW#10).
 *
 * Tenant-aware. Pattern aligné sur loyalty/voucher clients.
 */

import type {
  PhoneAIConfig,
  PhoneAIFeatures,
  PhoneAIMode,
  PhoneAIPersonality,
  PhoneCallIntent,
  PhoneCallOutcome,
  PhoneCallRow,
  PhoneCallStats,
} from "./phone-types";
import { getCurrentTenantId } from "./tenant";
import type { RestaurantRow } from "./restaurants-types";

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
   CONFIG — get / update phone AI settings
   ═══════════════════════════════════════════════════════════ */

/**
 * Type partiel de RestaurantRow étendu avec les champs phone.
 * (RestaurantRow ne les a pas encore — on les lit en plus.)
 */
type PhoneFields = Pick<
  RestaurantRow,
  "id" | "slug" | "name"
> & {
  phone_ai_mode: PhoneAIMode;
  phone_ai_fallback_seconds: number;
  twilio_phone_number: string | null;
  vapi_assistant_id: string | null;
  phone_ai_personality: PhoneAIPersonality | null;
  phone_ai_features: PhoneAIFeatures | null;
  phone_busy_override_active: boolean;
  phone_busy_override_until: string | null;
};

export async function getPhoneAIConfig(
  tenantId?: string
): Promise<PhoneAIConfig | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const rows = await sb<PhoneFields[]>(
    `restaurants?select=id,slug,name,phone_ai_mode,phone_ai_fallback_seconds,twilio_phone_number,vapi_assistant_id,phone_ai_personality,phone_ai_features,phone_busy_override_active,phone_busy_override_until&id=eq.${encodeURIComponent(tid)}&limit=1`
  );
  const row = rows[0];
  if (!row) return null;

  /* Auto-reset busy override si dépassé */
  let busyActive = row.phone_busy_override_active;
  if (
    busyActive &&
    row.phone_busy_override_until &&
    new Date(row.phone_busy_override_until).getTime() < Date.now()
  ) {
    /* Soft auto-reset (best effort, on ignore l'erreur) */
    sb(`restaurants?id=eq.${tid}`, {
      method: "PATCH",
      body: JSON.stringify({ phone_busy_override_active: false }),
    }).catch(() => null);
    busyActive = false;
  }

  return {
    mode: row.phone_ai_mode ?? "off",
    fallback_seconds: row.phone_ai_fallback_seconds ?? 20,
    twilio_phone_number: row.twilio_phone_number,
    vapi_assistant_id: row.vapi_assistant_id,
    personality: row.phone_ai_personality ?? {
      language: "fr-FR",
      formality: "vous",
      voice_speed: 1.0,
    },
    features: row.phone_ai_features ?? {
      take_reservations: true,
      answer_hours: true,
      describe_menu: true,
      callback_message: true,
      transfer_to_human: false,
      say_address: true,
      confirm_takeaway: false,
    },
    busy_override_active: busyActive,
    busy_override_until: row.phone_busy_override_until,
  };
}

export interface UpdatePhoneAIConfigPayload {
  mode?: PhoneAIMode;
  fallback_seconds?: number;
  twilio_phone_number?: string | null;
  vapi_assistant_id?: string | null;
  personality?: PhoneAIPersonality;
  features?: PhoneAIFeatures;
}

export async function updatePhoneAIConfig(
  patch: UpdatePhoneAIConfigPayload,
  tenantId?: string
): Promise<void> {
  if (!USE_SUPABASE) return;
  const tid = await resolveTenantId(tenantId);

  const body: Record<string, unknown> = {};
  if (patch.mode !== undefined) body.phone_ai_mode = patch.mode;
  if (patch.fallback_seconds !== undefined) {
    body.phone_ai_fallback_seconds = Math.max(
      5,
      Math.min(60, Math.round(patch.fallback_seconds))
    );
  }
  if (patch.twilio_phone_number !== undefined) {
    body.twilio_phone_number = patch.twilio_phone_number;
  }
  if (patch.vapi_assistant_id !== undefined) {
    body.vapi_assistant_id = patch.vapi_assistant_id;
  }
  if (patch.personality !== undefined) {
    body.phone_ai_personality = patch.personality;
  }
  if (patch.features !== undefined) {
    body.phone_ai_features = patch.features;
  }

  if (Object.keys(body).length === 0) return;

  await sb(`restaurants?id=eq.${tid}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Toggle live "Busy mode". Quand activé, l'IA prend tous les appels.
 * Auto-reset après `durationMinutes` (défaut 2h pour ne pas oublier).
 */
export async function setBusyOverride(
  active: boolean,
  durationMinutes = 120,
  tenantId?: string
): Promise<{ active: boolean; until: string | null }> {
  if (!USE_SUPABASE) return { active: false, until: null };
  const tid = await resolveTenantId(tenantId);

  const until = active
    ? new Date(Date.now() + durationMinutes * 60_000).toISOString()
    : null;

  await sb(`restaurants?id=eq.${tid}`, {
    method: "PATCH",
    body: JSON.stringify({
      phone_busy_override_active: active,
      phone_busy_override_until: until,
    }),
  });

  return { active, until };
}

/**
 * Détermine si l'IA doit prendre l'appel maintenant (résolution finale,
 * tient compte du mode + busy override).
 *
 * Cette fonction est appelée par Vapi via /api/telephony/vapi/tools/check-busy
 * pour décider du routing en temps réel.
 */
export async function shouldAITakeCallNow(
  tenantId?: string
): Promise<{
  ai_should_answer: boolean;
  reason: "busy_override" | "always_mode" | "off_mode" | "fallback_default";
}> {
  const config = await getPhoneAIConfig(tenantId);
  if (!config) return { ai_should_answer: false, reason: "off_mode" };

  /* Busy override prend la priorité */
  if (config.busy_override_active) {
    return { ai_should_answer: true, reason: "busy_override" };
  }

  switch (config.mode) {
    case "always":
      return { ai_should_answer: true, reason: "always_mode" };
    case "off":
      return { ai_should_answer: false, reason: "off_mode" };
    case "fallback":
      /* En mode fallback, le routing Twilio essaie d'abord les humains.
       * Si on arrive à ce point (Vapi est appelé), c'est que personne
       * n'a répondu — donc l'IA doit prendre. */
      return { ai_should_answer: true, reason: "fallback_default" };
  }
}

/* ═══════════════════════════════════════════════════════════
   PHONE CALLS — audit log
   ═══════════════════════════════════════════════════════════ */

export interface CreatePhoneCallPayload {
  vapi_call_id?: string;
  twilio_call_sid?: string;
  caller_number?: string;
  caller_name?: string;
  caller_customer_id?: string;
  outcome?: PhoneCallOutcome;
}

/**
 * Enregistre le démarrage d'un appel (ou l'upsert si vapi_call_id existe).
 */
export async function logPhoneCallStart(
  payload: CreatePhoneCallPayload,
  tenantId?: string
): Promise<PhoneCallRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const tid = await resolveTenantId(tenantId);

  /* Si vapi_call_id existe déjà, on mets à jour */
  if (payload.vapi_call_id) {
    const existing = await sb<PhoneCallRow[]>(
      `phone_calls?select=*&vapi_call_id=eq.${encodeURIComponent(payload.vapi_call_id)}${tc(tid)}&limit=1`
    );
    if (existing.length > 0) return existing[0];
  }

  const [created] = await sb<PhoneCallRow[]>("phone_calls", {
    method: "POST",
    body: JSON.stringify({
      restaurant_id: tid,
      vapi_call_id: payload.vapi_call_id ?? null,
      twilio_call_sid: payload.twilio_call_sid ?? null,
      caller_number: payload.caller_number ?? null,
      caller_name: payload.caller_name ?? null,
      caller_customer_id: payload.caller_customer_id ?? null,
      outcome: payload.outcome ?? "ai_answered",
    }),
  });
  return created;
}

export interface UpdatePhoneCallPayload {
  ended_at?: string;
  duration_seconds?: number;
  outcome?: PhoneCallOutcome;
  transcript?: string;
  audio_url?: string;
  detected_intent?: PhoneCallIntent;
  reservation_id?: string | null;
  callback_requested?: boolean;
  callback_phone?: string;
  callback_notes?: string;
  cost_cents?: number;
}

/**
 * Met à jour un appel (typiquement à la fin de l'appel).
 * Lookup par vapi_call_id ou par id direct.
 */
export async function updatePhoneCall(
  identifier: { id?: string; vapi_call_id?: string },
  patch: UpdatePhoneCallPayload,
  tenantId?: string
): Promise<PhoneCallRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  let where = "";
  if (identifier.id) {
    where = `id=eq.${encodeURIComponent(identifier.id)}`;
  } else if (identifier.vapi_call_id) {
    where = `vapi_call_id=eq.${encodeURIComponent(identifier.vapi_call_id)}`;
  } else {
    throw new Error("id ou vapi_call_id requis");
  }

  const body: Record<string, unknown> = {};
  if (patch.ended_at !== undefined) body.ended_at = patch.ended_at;
  if (patch.duration_seconds !== undefined)
    body.duration_seconds = patch.duration_seconds;
  if (patch.outcome !== undefined) body.outcome = patch.outcome;
  if (patch.transcript !== undefined) body.transcript = patch.transcript;
  if (patch.audio_url !== undefined) body.audio_url = patch.audio_url;
  if (patch.detected_intent !== undefined)
    body.detected_intent = patch.detected_intent;
  if (patch.reservation_id !== undefined)
    body.reservation_id = patch.reservation_id;
  if (patch.callback_requested !== undefined)
    body.callback_requested = patch.callback_requested;
  if (patch.callback_phone !== undefined)
    body.callback_phone = patch.callback_phone;
  if (patch.callback_notes !== undefined)
    body.callback_notes = patch.callback_notes;
  if (patch.cost_cents !== undefined) body.cost_cents = patch.cost_cents;

  const [updated] = await sb<PhoneCallRow[]>(
    `phone_calls?${where}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
  return updated ?? null;
}

export async function listPhoneCalls(
  options: {
    limit?: number;
    callbackPending?: boolean;
    sinceISO?: string;
    tenantId?: string;
  } = {}
): Promise<PhoneCallRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(options.tenantId);

  const filters: string[] = [];
  if (options.callbackPending) {
    filters.push("&callback_requested=eq.true");
  }
  if (options.sinceISO) {
    filters.push(
      `&started_at=gte.${encodeURIComponent(options.sinceISO)}`
    );
  }
  const limit = options.limit ?? 200;

  return sb<PhoneCallRow[]>(
    `phone_calls?select=*${tc(tid)}${filters.join("")}&order=started_at.desc&limit=${limit}`
  );
}

export async function getPhoneCallStats(
  options: { sinceISO?: string; tenantId?: string } = {}
): Promise<PhoneCallStats> {
  if (!USE_SUPABASE) {
    return {
      total_count: 0,
      ai_answered_count: 0,
      staff_answered_count: 0,
      callback_pending_count: 0,
      reservations_via_ai_count: 0,
      total_duration_seconds: 0,
      total_cost_cents: 0,
      period_label: "Aucune donnée",
    };
  }

  const tid = await resolveTenantId(options.tenantId);
  /* Default : 30 derniers jours */
  const sinceISO =
    options.sinceISO ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const calls = await sb<PhoneCallRow[]>(
    `phone_calls?select=outcome,duration_seconds,cost_cents,callback_requested,reservation_id&started_at=gte.${encodeURIComponent(sinceISO)}${tc(tid)}`
  );

  let ai = 0;
  let staff = 0;
  let pending = 0;
  let resa = 0;
  let dur = 0;
  let cost = 0;

  for (const c of calls) {
    if (c.outcome === "ai_answered") ai++;
    if (c.outcome === "staff_answered") staff++;
    if (c.callback_requested) pending++;
    if (c.reservation_id) resa++;
    dur += c.duration_seconds ?? 0;
    cost += c.cost_cents ?? 0;
  }

  return {
    total_count: calls.length,
    ai_answered_count: ai,
    staff_answered_count: staff,
    callback_pending_count: pending,
    reservations_via_ai_count: resa,
    total_duration_seconds: dur,
    total_cost_cents: cost,
    period_label: "30 derniers jours",
  };
}
