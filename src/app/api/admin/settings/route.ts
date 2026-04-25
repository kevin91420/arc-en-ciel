/**
 * GET/PATCH /api/admin/settings — Full restaurant settings (admin-only)
 *
 * Admin protection is handled by the global proxy for /api/admin/*.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings-client";
import type { UpdateSettingsPayload } from "@/lib/db/settings-types";

export const dynamic = "force-dynamic";

/* All keys that can be patched from the admin panel. */
const ALLOWED_KEYS = [
  // Brand
  "name",
  "tagline",
  "description",
  "logo_url",
  // Contact
  "phone",
  "email",
  "address",
  "postal_code",
  "city",
  "country",
  "latitude",
  "longitude",
  // Hours
  "hours",
  // Socials
  "facebook_url",
  "instagram_url",
  "google_maps_url",
  "tripadvisor_url",
  // Theme
  "color_brand",
  "color_accent",
  "color_signature",
  // Menus
  "menu_pdf_url",
  "menu_emporter_pdf_url",
  "menu_desserts_pdf_url",
  // Payment
  "payment_methods",
  // Tables (floor plan)
  "tables",
  // 86 list
  "eighty_six_list",
  // Features
  "feature_reservations",
  "feature_qr_menu",
  "feature_loyalty",
  "feature_delivery",
  "feature_takeaway",
  "feature_terrace",
  "feature_pmr",
  "feature_halal",
  // Financial
  "tax_rate",
  // Legal
  "legal_name",
  "siret",
  "vat_number",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const updates: UpdateSettingsPayload = {};

    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        /* Use a typed assignment — the indexed access keeps TS happy while
           still whitelisting keys via ALLOWED_KEYS. */
        (updates as Record<AllowedKey, unknown>)[key] = body[key];
      }
    }

    /* Light validation & coercion ------------------------------------------ */
    if (typeof updates.tax_rate === "number") {
      updates.tax_rate = Math.max(0, Math.min(100, updates.tax_rate));
    }
    if (Array.isArray(updates.payment_methods)) {
      updates.payment_methods = updates.payment_methods
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (Array.isArray(updates.eighty_six_list)) {
      updates.eighty_six_list = Array.from(
        new Set(
          updates.eighty_six_list
            .map((v) => (typeof v === "string" ? v.trim() : ""))
            .filter((v) => v.length > 0 && v.length <= 64)
        )
      ).slice(0, 500);
    }
    if (Array.isArray(updates.tables)) {
      const seen = new Set<number>();
      updates.tables = updates.tables
        .map((t) => {
          if (!t || typeof t !== "object") return null;
          const row = t as {
            number?: unknown;
            label?: unknown;
            capacity?: unknown;
            zone?: unknown;
          };
          const num = Number(row.number);
          if (!Number.isFinite(num) || num < 1 || num > 999) return null;
          if (seen.has(num)) return null;
          seen.add(num);
          const label = typeof row.label === "string" && row.label.trim()
            ? row.label.trim().slice(0, 24)
            : `T${num}`;
          const capacity = Math.max(
            1,
            Math.min(20, Number(row.capacity) || 4)
          );
          const zone =
            typeof row.zone === "string" && row.zone.trim()
              ? row.zone.trim().slice(0, 24)
              : null;
          return { number: num, label, capacity, zone };
        })
        .filter(
          (t): t is { number: number; label: string; capacity: number; zone: string | null } =>
            t !== null
        )
        .sort((a, b) => a.number - b.number)
        .slice(0, 200);
    }
    if (Array.isArray(updates.hours)) {
      updates.hours = updates.hours
        .map((h) => {
          if (!h || typeof h !== "object") return null;
          const row = h as { days?: unknown; time?: unknown };
          const days = typeof row.days === "string" ? row.days.trim() : "";
          const time = typeof row.time === "string" ? row.time.trim() : "";
          if (!days && !time) return null;
          return { days, time };
        })
        .filter((x): x is { days: string; time: string } => x !== null)
        .slice(0, 20);
    }
    for (const hex of ["color_brand", "color_accent", "color_signature"] as const) {
      const v = updates[hex];
      if (typeof v === "string" && !/^#([0-9a-fA-F]{3}){1,2}$/.test(v)) {
        delete updates[hex];
      }
    }

    const settings = await updateSettings(updates);
    return NextResponse.json(settings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
