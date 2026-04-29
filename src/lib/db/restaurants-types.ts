/**
 * Types pour la table `restaurants` — le pivot multi-tenant.
 *
 * Chaque ligne de cette table = un client SaaS (un resto).
 * Tous les autres types métier (Order, MenuItem, etc.) auront un
 * champ `restaurant_id` qui référence ce ID.
 */

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

/**
 * Branding par tenant — injecté en CSS variables au runtime.
 * Tout est optionnel : si non défini, on tombe sur les defaults Arc-en-Ciel.
 */
export interface RestaurantBranding {
  primary_color?: string;
  accent_color?: string;
  background_color?: string;
  font_display?: string;
  font_body?: string;
  logo_url?: string | null;
}

/**
 * Ligne de la table `restaurants` (DB row).
 */
export interface RestaurantRow {
  id: string; // UUID
  slug: string; // URL-safe (ex: "pizzeria-da-marco")
  name: string;
  branding: RestaurantBranding;
  settings_overrides: Record<string, unknown>;
  owner_email: string | null;
  owner_phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null; // ISO
  onboarding_completed: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
}

/**
 * Payload de création d'un nouveau resto (formulaire onboarding).
 */
export interface CreateRestaurantPayload {
  slug: string;
  name: string;
  owner_email: string;
  owner_phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  branding?: Partial<RestaurantBranding>;
}

/**
 * Update partiel d'un resto.
 */
export type UpdateRestaurantPayload = Partial<
  Omit<RestaurantRow, "id" | "created_at" | "updated_at">
>;

/**
 * UUID du tenant Arc-en-Ciel — STABLE, ne JAMAIS changer.
 * Utilisé comme DEFAULT dans la migration 0007 pour backfill.
 */
export const ARC_EN_CIEL_TENANT_ID =
  "00000000-0000-0000-0000-000000000001" as const;

export const ARC_EN_CIEL_SLUG = "arc-en-ciel" as const;
