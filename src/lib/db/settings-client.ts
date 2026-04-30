/**
 * SETTINGS CLIENT — Read/write `restaurant_settings`, scoped par tenant.
 *
 * Sprint 7b : chaque tenant a sa propre row. La résolution du tenant courant
 * passe par `getCurrentTenantId()` (lit le header X-Tenant-Slug injecté par
 * le proxy). Les fonctions acceptent un `tenantId` explicite en option,
 * utile pour les contextes hors requête (seed scripts, webhooks).
 */

import type {
  RestaurantSettings,
  UpdateSettingsPayload,
} from "./settings-types";
import { DEFAULT_SETTINGS } from "./settings-types";
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

/**
 * Récupère les settings du tenant courant (ou du tenant explicite si fourni).
 *
 * Si aucune row n'existe pour ce tenant : on retourne les DEFAULT_SETTINGS
 * sans créer de row. La row sera créée automatiquement à la 1ère écriture
 * via `updateSettings`.
 */
export async function getSettings(
  tenantId?: string
): Promise<RestaurantSettings> {
  if (!USE_SUPABASE) return DEFAULT_SETTINGS;
  try {
    const restaurantId = tenantId ?? (await getCurrentTenantId());
    const rows = await sb<RestaurantSettings[]>(
      `restaurant_settings?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
    );
    if (rows.length === 0) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...rows[0] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update les settings du tenant courant. Pattern UPSERT :
 *   1. Try PATCH where restaurant_id = tenantId
 *   2. Si 0 rows affectées : INSERT avec restaurant_id
 *
 * On ne crée jamais 2 rows pour le même tenant (race condition possible mais
 * acceptable — au pire on aurait 2 rows et la prochaine query pendrait la
 * première).
 */
export async function updateSettings(
  updates: UpdateSettingsPayload,
  tenantId?: string
): Promise<RestaurantSettings> {
  if (!USE_SUPABASE) {
    return {
      ...DEFAULT_SETTINGS,
      ...updates,
      updated_at: new Date().toISOString(),
    } as RestaurantSettings;
  }

  const restaurantId = tenantId ?? (await getCurrentTenantId());

  /* Tentative UPDATE d'abord */
  const updated = await sb<RestaurantSettings[]>(
    `restaurant_settings?restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );

  if (updated.length > 0) {
    return updated[0];
  }

  /* Pas de row → INSERT initiale avec defaults + updates */
  const seed = {
    ...DEFAULT_SETTINGS,
    ...updates,
    restaurant_id: restaurantId,
  };
  /* On laisse Supabase gérer le PK `id` (sequence ou default). */
  delete (seed as { id?: number }).id;

  const inserted = await sb<RestaurantSettings[]>("restaurant_settings", {
    method: "POST",
    body: JSON.stringify(seed),
  });

  return inserted[0];
}
