/**
 * GET /api/me/restaurant — retourne le tenant courant.
 *
 * PUBLIC : pas d'auth requise. Utilisé par les hooks client (useRestaurantBranding,
 * etc.) pour récupérer le branding et les infos du resto courant. Le slug
 * vient du proxy (header X-Tenant-Slug ou cookie tenant_slug).
 *
 * On ne renvoie QUE les champs publics (pas le stripe_customer_id, etc.).
 */

import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenant = await getCurrentTenant();

    /* On filtre les champs sensibles avant d'envoyer côté client. */
    const publicView = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      branding: tenant.branding,
      city: tenant.city,
      country: tenant.country,
      timezone: tenant.timezone,
      active: tenant.active,
    };

    return NextResponse.json(publicView, {
      headers: {
        /* Cache 60s côté CDN/edge — branding ne change pas souvent */
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur tenant" },
      { status: 500 }
    );
  }
}
