/**
 * SETTINGS CLIENT — Read/write restaurant_settings (single row id=1)
 */

import type {
  RestaurantSettings,
  UpdateSettingsPayload,
} from "./settings-types";
import { DEFAULT_SETTINGS } from "./settings-types";

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

/**
 * Get restaurant settings. Falls back to DEFAULT_SETTINGS if Supabase
 * not configured or no row exists.
 */
export async function getSettings(): Promise<RestaurantSettings> {
  if (!USE_SUPABASE) return DEFAULT_SETTINGS;
  try {
    const rows = await sb<RestaurantSettings[]>(
      `restaurant_settings?select=*&id=eq.1&limit=1`
    );
    if (rows.length === 0) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...rows[0] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(
  updates: UpdateSettingsPayload
): Promise<RestaurantSettings> {
  if (!USE_SUPABASE) {
    return { ...DEFAULT_SETTINGS, ...updates, updated_at: new Date().toISOString() } as RestaurantSettings;
  }
  const [row] = await sb<RestaurantSettings[]>(
    `restaurant_settings?id=eq.1`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
  return row;
}
