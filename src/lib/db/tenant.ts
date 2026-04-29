/**
 * Tenant context — résout le `restaurant_id` courant pour chaque requête.
 *
 * Strategy : un slug en URL (`/r/{slug}/...`) ou en header `X-Tenant-Slug`,
 * qu'on traduit en UUID via la table `restaurants`.
 *
 * En attendant Sprint 7b complet, on a un fallback dur sur Arc-en-Ciel pour
 * que tout le code legacy continue de fonctionner sans rien casser.
 *
 * Hiérarchie de résolution :
 *   1. Si appelé depuis un Server Component / API route, on lit le header
 *      `X-Tenant-Slug` injecté par le middleware (src/proxy.ts).
 *   2. Sinon, on lit le cookie `tenant_slug`.
 *   3. Fallback : `arc-en-ciel` (le tenant historique, single-tenant).
 *
 * ⚠️ Ce module est SAFE côté serveur uniquement. Pour le client, utiliser
 * `useRestaurantBranding()` qui passe par /api/me/restaurant.
 */

import { headers, cookies } from "next/headers";
import { ARC_EN_CIEL_SLUG, ARC_EN_CIEL_TENANT_ID } from "./restaurants-types";
import type { RestaurantRow } from "./restaurants-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* In-memory cache des résolutions slug → restaurant. TTL court (60s) pour
 * éviter de hammer la DB à chaque requête tout en restant frais. */
const tenantCache = new Map<string, { row: RestaurantRow; expires: number }>();
const TTL_MS = 60_000;

/**
 * Résout le slug du tenant courant depuis les headers/cookies de la requête.
 * Retourne `arc-en-ciel` par défaut si rien trouvé (mode legacy / single-tenant).
 */
export async function resolveTenantSlug(): Promise<string> {
  try {
    const h = await headers();
    const fromHeader = h.get("x-tenant-slug");
    if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  } catch {
    /* headers() peut throw hors du contexte requête — on ignore */
  }

  try {
    const c = await cookies();
    const fromCookie = c.get("tenant_slug")?.value;
    if (fromCookie && fromCookie.trim()) return fromCookie.trim();
  } catch {
    /* idem */
  }

  /* Fallback legacy : on cible toujours Arc-en-Ciel. */
  return ARC_EN_CIEL_SLUG;
}

/**
 * Récupère le restaurant complet à partir d'un slug.
 * Cache 60s pour réduire la latence.
 */
export async function getRestaurantBySlug(
  slug: string
): Promise<RestaurantRow | null> {
  if (!slug) return null;

  /* Cache hit ? */
  const cached = tenantCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    return cached.row;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    /* Mode local sans Supabase — fallback sur tenant Arc-en-Ciel hardcodé. */
    if (slug === ARC_EN_CIEL_SLUG) {
      return buildLegacyArcEnCielRow();
    }
    return null;
  }

  const url = `${SUPABASE_URL}/rest/v1/restaurants?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    /* Pas de cache HTTP — on cache nous-même */
    cache: "no-store",
  });

  if (!res.ok) {
    /* Si la table n'existe pas encore (migration 0007 pas appliquée), on
     * retombe sur le tenant legacy. Permet au code de tourner pendant la
     * transition. */
    if (res.status === 404 || res.status === 400) {
      if (slug === ARC_EN_CIEL_SLUG) {
        return buildLegacyArcEnCielRow();
      }
    }
    return null;
  }

  const rows = (await res.json()) as RestaurantRow[];
  const row = rows[0];
  if (!row) {
    /* Slug inconnu — fallback Arc-en-Ciel pour ne pas crasher. */
    if (slug === ARC_EN_CIEL_SLUG) {
      return buildLegacyArcEnCielRow();
    }
    return null;
  }

  tenantCache.set(slug, { row, expires: Date.now() + TTL_MS });
  return row;
}

/**
 * Helper combiné : résout le tenant courant et retourne sa row.
 * Garantit toujours un retour non-null (fallback Arc-en-Ciel).
 */
export async function getCurrentTenant(): Promise<RestaurantRow> {
  const slug = await resolveTenantSlug();
  const row = await getRestaurantBySlug(slug);
  return row ?? buildLegacyArcEnCielRow();
}

/**
 * Helper raccourci : ID du tenant courant pour filtrer les queries Supabase.
 */
export async function getCurrentTenantId(): Promise<string> {
  const t = await getCurrentTenant();
  return t.id;
}

/**
 * Invalide le cache pour un slug donné (utile après update).
 */
export function invalidateTenantCache(slug?: string) {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}

/**
 * Row Arc-en-Ciel hardcodée pour le fallback (avant migration 0007 ou en
 * mode local sans Supabase). Permet au code legacy de tourner sans casser.
 */
function buildLegacyArcEnCielRow(): RestaurantRow {
  return {
    id: ARC_EN_CIEL_TENANT_ID,
    slug: ARC_EN_CIEL_SLUG,
    name: "L'Arc en Ciel",
    branding: {
      primary_color: "#5b3a29",
      accent_color: "#b8922f",
      background_color: "#fdf6e3",
      font_display: "Playfair Display",
      font_body: "Inter",
      logo_url: null,
    },
    settings_overrides: {},
    owner_email: "k.aubouin@gmail.com",
    owner_phone: null,
    address: null,
    city: null,
    postal_code: null,
    country: "FR",
    timezone: "Europe/Paris",
    active: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: "active",
    trial_ends_at: null,
    onboarding_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
