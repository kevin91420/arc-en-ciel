/**
 * GET  /api/admin/restaurants     — liste tous les tenants (super-admin)
 * POST /api/admin/restaurants     — crée un nouveau tenant
 *
 * Protégé par le cookie admin (cf. proxy). Utilisé par la console super-admin
 * pour gérer la flotte de restos clients du SaaS.
 */

import { NextResponse } from "next/server";
import {
  createRestaurant,
  isSlugAvailable,
  isValidSlug,
  listRestaurants,
  slugifyRestaurantName,
} from "@/lib/db/restaurants-client";
import type { CreateRestaurantPayload } from "@/lib/db/restaurants-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";

  try {
    const rows = await listRestaurants({ activeOnly });
    return NextResponse.json({ restaurants: rows, count: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: Partial<CreateRestaurantPayload>;
  try {
    body = (await request.json()) as Partial<CreateRestaurantPayload>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { name, owner_email } = body;
  if (!name || !owner_email) {
    return NextResponse.json(
      { error: "Champs requis : name, owner_email" },
      { status: 400 }
    );
  }

  /* Auto-slug si non fourni */
  let slug = body.slug?.trim() || slugifyRestaurantName(name);
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      {
        error:
          "Slug invalide : 2-40 chars, uniquement minuscules / chiffres / tirets.",
      },
      { status: 400 }
    );
  }

  /* Si slug pris, on suffixe avec un compteur (-2, -3, ...) */
  let suffix = 2;
  while (!(await isSlugAvailable(slug)) && suffix <= 99) {
    slug = `${slugifyRestaurantName(name)}-${suffix}`;
    suffix++;
  }

  try {
    const created = await createRestaurant({
      slug,
      name,
      owner_email,
      owner_phone: body.owner_phone,
      address: body.address,
      city: body.city,
      postal_code: body.postal_code,
      branding: body.branding,
    });
    return NextResponse.json({ restaurant: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
