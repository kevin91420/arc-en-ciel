/**
 * GET    /api/admin/restaurants/[id] — fetch un tenant
 * PATCH  /api/admin/restaurants/[id] — update partiel
 * DELETE /api/admin/restaurants/[id] — soft-delete (active=false)
 *
 * Protégé par le cookie admin.
 */

import { NextResponse } from "next/server";
import {
  deactivateRestaurant,
  getRestaurantById,
  updateRestaurant,
} from "@/lib/db/restaurants-client";
import type { UpdateRestaurantPayload } from "@/lib/db/restaurants-types";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const row = await getRestaurantById(id);
    if (!row) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ restaurant: row });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let patch: UpdateRestaurantPayload;
  try {
    patch = (await request.json()) as UpdateRestaurantPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  try {
    const row = await updateRestaurant(id, patch);
    return NextResponse.json({ restaurant: row });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await deactivateRestaurant(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
