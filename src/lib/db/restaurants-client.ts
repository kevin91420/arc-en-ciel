/**
 * Client CRUD pour la table `restaurants`.
 *
 * Utilisé côté serveur uniquement (Supabase service role).
 * Pour lire le tenant courant côté requête, voir `tenant.ts`.
 */

import type {
  CreateRestaurantPayload,
  RestaurantRow,
  UpdateRestaurantPayload,
} from "./restaurants-types";
import { invalidateTenantCache } from "./tenant";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase non configuré (env vars manquantes)");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Liste tous les restaurants. Pour la console super-admin uniquement.
 */
export async function listRestaurants(opts?: {
  activeOnly?: boolean;
}): Promise<RestaurantRow[]> {
  const filter = opts?.activeOnly ? "&active=eq.true" : "";
  const rows = await sb<RestaurantRow[]>(
    `restaurants?select=*${filter}&order=created_at.desc`
  );
  return rows;
}

/**
 * Récupère un restaurant par son ID.
 */
export async function getRestaurantById(
  id: string
): Promise<RestaurantRow | null> {
  const rows = await sb<RestaurantRow[]>(
    `restaurants?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  return rows[0] ?? null;
}

/**
 * Vérifie qu'un slug est disponible (pas déjà pris).
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const rows = await sb<{ id: string }[]>(
    `restaurants?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`
  );
  return rows.length === 0;
}

/**
 * Crée un nouveau restaurant + seed les defaults (settings + loyalty_config).
 * Throw si le slug est déjà pris.
 *
 * Auto-seeding : à la création d'un nouveau tenant, on insère immédiatement :
 *   - 1 row dans `restaurant_settings` avec les defaults (tables, branding)
 *   - 1 row dans `loyalty_config` avec un programme par défaut
 *
 * Comme ça le nouveau tenant peut log dans /admin tout de suite sans erreur.
 * Le menu reste vide — il sera seedé soit par l'onboarding wizard, soit par
 * `seedMenuFromCarte()` à la 1ère édition.
 */
export async function createRestaurant(
  payload: CreateRestaurantPayload
): Promise<RestaurantRow> {
  if (!isValidSlug(payload.slug)) {
    throw new Error(
      "Slug invalide : utilise uniquement lettres minuscules, chiffres et tirets."
    );
  }

  const available = await isSlugAvailable(payload.slug);
  if (!available) {
    throw new Error(`Le slug "${payload.slug}" est déjà pris.`);
  }

  const row = {
    slug: payload.slug,
    name: payload.name,
    owner_email: payload.owner_email,
    owner_phone: payload.owner_phone ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    postal_code: payload.postal_code ?? null,
    branding: payload.branding ?? {},
    /* Trial 30 jours dès la création */
    subscription_status: "trial",
    trial_ends_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    onboarding_completed: false,
    active: true,
  };

  const [created] = await sb<RestaurantRow[]>("restaurants", {
    method: "POST",
    body: JSON.stringify(row),
  });

  /* Auto-seed defaults pour ce nouveau tenant — soft fail si une étape
   * casse, le tenant restera utilisable, juste avec defaults vides. */
  await seedDefaultsForNewTenant(created.id, payload.name).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[restaurants-client] seedDefaultsForNewTenant failed:", err);
  });

  invalidateTenantCache();
  return created;
}

/**
 * Seed les defaults pour un nouveau tenant : settings + loyalty_config.
 * Appelé après createRestaurant. Ne seed PAS le menu (l'onboarding wizard ou
 * seedMenuFromCarte le font à la demande).
 */
async function seedDefaultsForNewTenant(
  restaurantId: string,
  restaurantName: string
): Promise<void> {
  /* 1. restaurant_settings : 10 tables par défaut + branding minimal */
  const defaultTables = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    label: `T${i + 1}`,
    capacity: 4,
    zone: "Salle",
  }));
  await sb("restaurant_settings", {
    method: "POST",
    body: JSON.stringify({
      restaurant_id: restaurantId,
      tables: defaultTables,
      eighty_six_list: [],
      active_card_id: "default",
    }),
  }).catch(() => null);

  /* 2. loyalty_config : programme désactivé par défaut, le patron l'active
   * quand il veut depuis /admin/parametres. */
  await sb("loyalty_config", {
    method: "POST",
    body: JSON.stringify({
      restaurant_id: restaurantId,
      stamps_required: 5,
      reward_label: "Une boisson offerte",
      reward_description: "Valable sur toutes les boissons.",
      welcome_message: `Bienvenue dans le programme fidélité de ${restaurantName} !`,
      brand_color: "#5b3a29",
      accent_color: "#b8922f",
      active: false,
    }),
  }).catch(() => null);
}

/**
 * Update partiel d'un resto.
 */
export async function updateRestaurant(
  id: string,
  patch: UpdateRestaurantPayload
): Promise<RestaurantRow> {
  if (patch.slug && !isValidSlug(patch.slug)) {
    throw new Error("Slug invalide.");
  }
  const [updated] = await sb<RestaurantRow[]>(
    `restaurants?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  invalidateTenantCache();
  return updated;
}

/**
 * Désactive un resto (sans supprimer ses données — on garde tout en DB
 * pour l'historique compta).
 */
export async function deactivateRestaurant(id: string): Promise<void> {
  await sb(`restaurants?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false, subscription_status: "canceled" }),
  });
  invalidateTenantCache();
}

/**
 * Slugify : normalise un nom de resto en slug URL-safe.
 *  - lowercase
 *  - strip accents (combining marks U+0300..U+036F)
 *  - non-alphanum → "-"
 *  - trim leading/trailing dashes
 *  - cap 40 chars
 */
export function slugifyRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Vérifie qu'un slug respecte la convention.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 40) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
