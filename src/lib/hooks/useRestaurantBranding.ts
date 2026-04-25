/**
 * Public-safe restaurant branding hook.
 *
 * Single source of truth for transactional UI (POS chrome, KDS chrome, addition
 * receipt, ticket print preview). All components stop hardcoding "L'Arc en
 * Ciel" / address / phone / TVA — they consume this hook instead, which falls
 * back to DEFAULT_SETTINGS when the network is offline so screens never look
 * empty during boot.
 *
 * The hook polls /api/settings on visibility changes (when the staff returns
 * to the tablet or the admin reopens a tab) so a settings edit propagates
 * within seconds — no full reload required.
 */

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/db/settings-types";

export interface RestaurantBranding {
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  legal_name?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  tax_rate?: number;
}

/* Build the static fallback once. Subsetting DEFAULT_SETTINGS keeps the bundle
 * lean (no leaking of hours/payment_methods/etc to chrome surfaces). */
const FALLBACK: RestaurantBranding = {
  name: DEFAULT_SETTINGS.name,
  tagline: DEFAULT_SETTINGS.tagline ?? null,
  description: DEFAULT_SETTINGS.description ?? null,
  logo_url: DEFAULT_SETTINGS.logo_url ?? null,
  phone: DEFAULT_SETTINGS.phone ?? null,
  email: DEFAULT_SETTINGS.email ?? null,
  address: DEFAULT_SETTINGS.address ?? null,
  postal_code: DEFAULT_SETTINGS.postal_code ?? null,
  city: DEFAULT_SETTINGS.city ?? null,
  country: DEFAULT_SETTINGS.country,
};

let cache: RestaurantBranding | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

async function fetchBranding(): Promise<RestaurantBranding> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Partial<RestaurantBranding>;
    cache = {
      name: data.name?.trim() || FALLBACK.name,
      tagline: data.tagline ?? FALLBACK.tagline,
      description: data.description ?? FALLBACK.description,
      logo_url: data.logo_url ?? FALLBACK.logo_url,
      phone: data.phone ?? FALLBACK.phone,
      email: data.email ?? FALLBACK.email,
      address: data.address ?? FALLBACK.address,
      postal_code: data.postal_code ?? FALLBACK.postal_code,
      city: data.city ?? FALLBACK.city,
      country: data.country ?? FALLBACK.country,
      legal_name: data.legal_name ?? null,
      siret: data.siret ?? null,
      vat_number: data.vat_number ?? null,
      tax_rate: data.tax_rate,
    };
    cacheAt = Date.now();
    return cache;
  } catch {
    return cache ?? FALLBACK;
  }
}

/**
 * Read the public branding. Returns the in-memory cache synchronously (or
 * FALLBACK on first paint), then revalidates from the server on mount and on
 * tab focus. Components rerender when the value changes.
 */
export function useRestaurantBranding(): RestaurantBranding {
  const [branding, setBranding] = useState<RestaurantBranding>(
    cache ?? FALLBACK
  );

  useEffect(() => {
    let cancelled = false;
    let lastRefresh = 0;

    const refresh = async () => {
      /* Throttle to one call per 5 s in case of rapid focus events. */
      if (Date.now() - lastRefresh < 5_000) return;
      lastRefresh = Date.now();
      const next = await fetchBranding();
      if (!cancelled) setBranding(next);
    };

    refresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return branding;
}

/**
 * Build the multi-line postal address for receipts / ticket headers.
 * Returns empty string when nothing is configured (caller can decide to
 * fall back to a placeholder).
 */
export function formatAddressLines(b: RestaurantBranding): string[] {
  const street = (b.address || "").trim();
  const cityLine = [b.postal_code, b.city]
    .filter((s) => s && s.trim().length > 0)
    .join(" ");
  const out: string[] = [];
  if (street) out.push(street);
  if (cityLine) out.push(cityLine);
  return out;
}

/**
 * Single inline contact string for compact footers ("01 23 · contact@x.fr").
 */
export function formatContactLine(b: RestaurantBranding): string {
  const parts: string[] = [];
  if (b.phone) parts.push(b.phone);
  if (b.email) parts.push(b.email);
  return parts.join(" · ");
}
