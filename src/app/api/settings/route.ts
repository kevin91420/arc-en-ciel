/**
 * GET /api/settings — Public-safe restaurant settings.
 *
 * Used by client components that need branding (name, colors, contact,
 * socials, hours, payment methods, features, logo). Secrets & internal
 * fields (legal_name, siret, vat_number, tax_rate) are intentionally
 * omitted.
 */
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db/settings-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const publicSafe = {
      name: s.name,
      tagline: s.tagline,
      description: s.description,
      logo_url: s.logo_url,
      phone: s.phone,
      email: s.email,
      address: s.address,
      postal_code: s.postal_code,
      city: s.city,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
      hours: s.hours,
      facebook_url: s.facebook_url,
      instagram_url: s.instagram_url,
      google_maps_url: s.google_maps_url,
      tripadvisor_url: s.tripadvisor_url,
      color_brand: s.color_brand,
      color_accent: s.color_accent,
      color_signature: s.color_signature,
      menu_pdf_url: s.menu_pdf_url,
      menu_emporter_pdf_url: s.menu_emporter_pdf_url,
      menu_desserts_pdf_url: s.menu_desserts_pdf_url,
      payment_methods: s.payment_methods,
      tables: s.tables,
      eighty_six_list: s.eighty_six_list,
      feature_reservations: s.feature_reservations,
      feature_qr_menu: s.feature_qr_menu,
      feature_loyalty: s.feature_loyalty,
      feature_delivery: s.feature_delivery,
      feature_takeaway: s.feature_takeaway,
      feature_terrace: s.feature_terrace,
      feature_pmr: s.feature_pmr,
      feature_halal: s.feature_halal,
      feature_runner_tickets: s.feature_runner_tickets,
      feature_special_flags: s.feature_special_flags,
      updated_at: s.updated_at,
    };
    return NextResponse.json(publicSafe, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
