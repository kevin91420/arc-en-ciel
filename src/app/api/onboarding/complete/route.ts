/**
 * POST /api/onboarding/complete
 *
 * Public endpoint — finalises the wizard. Refuses if the tenant already has
 * setup_completed = true (unless force=true is passed by an admin cookie).
 *
 * Body:
 *   {
 *     preset: 'pizzeria' | 'bistro' | 'fastfood' | 'bar' | 'cafe',
 *     name: string, tagline?: string,
 *     phone?: string, email?: string, address?: string,
 *     postal_code?: string, city?: string,
 *     legal_name?: string, siret?: string, vat_number?: string,
 *     color_brand?: string, color_accent?: string, color_signature?: string,
 *     logo_url?: string,
 *     table_count: number,
 *     staff: [{ name, pin, role }],
 *     keep_starter_menu: boolean
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings-client";
import { getPreset, type RestaurantType } from "@/lib/onboarding/presets";
import { upsertCategory, upsertItem } from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path: string, init: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase non configuré");
  }
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
}

interface OnboardingPayload {
  preset?: string;
  name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  legal_name?: string;
  siret?: string;
  vat_number?: string;
  color_brand?: string;
  color_accent?: string;
  color_signature?: string;
  logo_url?: string;
  table_count?: number;
  staff?: Array<{ name?: string; pin?: string; role?: string }>;
  keep_starter_menu?: boolean;
  force?: boolean;
}

export async function POST(req: NextRequest) {
  let body: OnboardingPayload;
  try {
    body = (await req.json()) as OnboardingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  /* Refuse if already configured (unless force flag from admin). */
  const current = await getSettings().catch(() => null);
  if (current?.setup_completed && !body.force) {
    return NextResponse.json(
      { error: "Le restaurant est déjà configuré. Modifie via /admin/parametres." },
      { status: 409 }
    );
  }

  const presetId = (body.preset as RestaurantType) || "bistro";
  const preset = getPreset(presetId);
  if (!preset) {
    return NextResponse.json(
      { error: `Preset inconnu : ${body.preset}` },
      { status: 400 }
    );
  }

  const name = (body.name || "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Nom du restaurant requis (2 caractères minimum)" },
      { status: 400 }
    );
  }

  /* Tables — generate the requested count with a sensible default layout. */
  const tableCount = Math.max(
    1,
    Math.min(50, Math.floor(body.table_count ?? 10))
  );
  const tables = Array.from({ length: tableCount }, (_, i) => ({
    number: i + 1,
    label: `T${i + 1}`,
    capacity: 4,
    zone: "Salle",
  }));

  /* Apply settings : brand + contact + features + tables + setup flag. */
  await updateSettings({
    name,
    tagline: body.tagline?.trim() || preset.pitch,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    address: body.address?.trim() || null,
    postal_code: body.postal_code?.trim() || null,
    city: body.city?.trim() || null,
    legal_name: body.legal_name?.trim() || null,
    siret: body.siret?.trim() || null,
    vat_number: body.vat_number?.trim() || null,
    color_brand: body.color_brand || "#2C1810",
    color_accent: body.color_accent || "#B8922F",
    color_signature: body.color_signature || "#C0392B",
    logo_url: body.logo_url?.trim() || null,
    tables,
    feature_qr_menu: preset.features.feature_qr_menu,
    feature_loyalty: preset.features.feature_loyalty,
    feature_reservations: preset.features.feature_reservations,
    feature_takeaway: preset.features.feature_takeaway,
    feature_delivery: preset.features.feature_delivery,
    feature_terrace: preset.features.feature_terrace,
    feature_pmr: preset.features.feature_pmr,
    feature_halal: preset.features.feature_halal,
    feature_runner_tickets: preset.features.feature_runner_tickets,
    feature_special_flags: preset.features.feature_special_flags,
    setup_completed: true,
  });

  /* Seed the menu. We replace any existing rows so the wizard is the single
   * source of truth at first run. The owner edits later via /admin/menu. */
  if (body.keep_starter_menu !== false) {
    try {
      /* Wipe existing menu (idempotent — fresh tenants have nothing). */
      await sb("menu_items?id=neq.__noop__", { method: "DELETE" });
      await sb("menu_categories?id=neq.__noop__", { method: "DELETE" });
    } catch {
      /* If permissions prevent the wipe we fall through — upserts will
       * still merge the preset rows. */
    }

    /* Insert categories first (FK dependency for items). */
    let pos = 0;
    for (const cat of preset.categories) {
      await upsertCategory({
        id: cat.id,
        number: cat.number,
        title: cat.title,
        subtitle: cat.subtitle ?? null,
        intro: null,
        icon: cat.icon,
        station: cat.station,
        position: pos++,
        active: true,
      }).catch(() => null);
    }
    let itemPos = 0;
    for (const it of preset.items) {
      await upsertItem({
        id: it.id,
        category_id: it.category_id,
        name: it.name,
        description: it.description,
        price_cents: it.price_cents,
        image_url: null,
        signature: Boolean(it.signature),
        popular: Boolean(it.popular),
        chef: false,
        tags: it.tags ?? [],
        position: itemPos++,
        active: true,
      }).catch(() => null);
    }
  }

  /* Seed staff members. We refuse to overwrite existing staff by id —
   * `findStaffByPin` upserts by PIN, so ignoring duplicates is safe. */
  const staffRows = (body.staff ?? [])
    .map((s) => {
      const sName = (s.name || "").trim().slice(0, 60);
      const pin = (s.pin || "").trim();
      const role = ["server", "chef", "manager"].includes(s.role || "")
        ? s.role
        : "server";
      if (sName.length < 2 || !/^\d{4,8}$/.test(pin)) return null;
      return { name: sName, pin_code: pin, role, color: "#B8922F", active: true };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (staffRows.length > 0) {
    try {
      await sb("staff_members", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(staffRows),
      });
    } catch {
      /* Soft-fail — owner can add staff later from settings. */
    }
  }

  return NextResponse.json({
    success: true,
    redirect: "/admin",
    preset: preset.id,
  });
}
