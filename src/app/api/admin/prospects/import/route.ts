/**
 * POST /api/admin/prospects/import
 *
 * Body:
 * {
 *   city: string,
 *   prospects: Array<{
 *     restaurant_name: string,
 *     address?, phone?, email?, website?, rating?, reviews_count?, ...
 *   }>
 * }
 *
 * Google Maps prohibits scraping. Ce endpoint accepte un JSON que
 * l'utilisateur a collecté avec n'importe quel outil (Apify, Phantombuster,
 * OSM, ou copier-coller manuel). Dedup : skip si (restaurant_name, city)
 * existe déjà.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createProspect,
  findProspectByNameCity,
} from "@/lib/db/prospects-client";
import type { CreateProspectPayload } from "@/lib/db/prospects-types";

export const dynamic = "force-dynamic";

type InputItem = {
  restaurant_name?: unknown;
  address?: unknown;
  city?: unknown;
  postal_code?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  google_maps_url?: unknown;
  rating?: unknown;
  reviews_count?: unknown;
  cuisine_type?: unknown;
  price_range?: unknown;
};

function asString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const parsed = Number(v.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  let body: { city?: unknown; prospects?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const city = asString(body.city);
  if (!city) {
    return NextResponse.json(
      { error: "city is required (string)" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.prospects)) {
    return NextResponse.json(
      { error: "prospects must be an array" },
      { status: 400 }
    );
  }

  const raw = body.prospects as InputItem[];
  if (raw.length === 0) {
    return NextResponse.json(
      { error: "prospects array is empty" },
      { status: 400 }
    );
  }
  if (raw.length > 500) {
    return NextResponse.json(
      { error: "max 500 prospects per import batch" },
      { status: 400 }
    );
  }

  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const item of raw) {
    const name = asString(item.restaurant_name);
    if (!name) {
      errors.push({
        name: "(no name)",
        error: "missing restaurant_name",
      });
      continue;
    }

    // City can be overridden per-item (for bulk imports that already
    // have city info), otherwise fallback to the top-level city.
    const itemCity = asString(item.city) || city;

    try {
      const existing = await findProspectByNameCity(name, itemCity);
      if (existing) {
        skipped.push(name);
        continue;
      }

      const payload: CreateProspectPayload = {
        restaurant_name: name,
        city: itemCity,
        address: asString(item.address) || null,
        postal_code: asString(item.postal_code) || null,
        phone: asString(item.phone) || null,
        email: asString(item.email) || null,
        website: asString(item.website) || null,
        google_maps_url: asString(item.google_maps_url) || null,
        rating: asNumber(item.rating) ?? null,
        reviews_count: asNumber(item.reviews_count) ?? null,
        cuisine_type: asString(item.cuisine_type) || null,
        price_range: asString(item.price_range) || null,
        source: "google_maps",
      };

      await createProspect(payload);
      imported.push(name);
    } catch (err) {
      errors.push({
        name,
        error: (err as Error).message || "unknown",
      });
    }
  }

  return NextResponse.json(
    {
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      total: imported.length + skipped.length + errors.length,
      details: {
        imported,
        skipped,
        errors,
      },
    },
    { status: 200 }
  );
}
