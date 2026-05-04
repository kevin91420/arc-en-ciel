/**
 * PATCH /api/admin/stock/[itemId]/config
 * Body : { track_stock?, stock_quantity?, stock_threshold_low? }
 *
 * Configure le tracking d'un item :
 *   - Active / désactive track_stock
 *   - Set quantity initiale
 *   - Set seuil d'alerte
 *
 * Manager only via 'menu.edit'.
 */

import { NextRequest, NextResponse } from "next/server";
import { configureItemStock } from "@/lib/db/stock-client";
import { withPermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;

  const { itemId } = await ctx.params;
  if (!itemId) {
    return NextResponse.json({ error: "itemId requis" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const config: {
    track_stock?: boolean;
    stock_quantity?: number;
    stock_threshold_low?: number;
  } = {};

  if (typeof body.track_stock === "boolean") {
    config.track_stock = body.track_stock;
  }
  if (
    body.stock_quantity !== undefined &&
    Number.isFinite(Number(body.stock_quantity))
  ) {
    const q = Number(body.stock_quantity);
    if (q < 0 || q > 100000) {
      return NextResponse.json(
        { error: "stock_quantity hors bornes (0 à 100 000)" },
        { status: 400 }
      );
    }
    config.stock_quantity = Math.floor(q);
  }
  if (
    body.stock_threshold_low !== undefined &&
    Number.isFinite(Number(body.stock_threshold_low))
  ) {
    const t = Number(body.stock_threshold_low);
    if (t < 0 || t > 1000) {
      return NextResponse.json(
        { error: "stock_threshold_low hors bornes (0 à 1000)" },
        { status: 400 }
      );
    }
    config.stock_threshold_low = Math.floor(t);
  }

  if (Object.keys(config).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  try {
    const updated = await configureItemStock(itemId, config);
    if (!updated) {
      return NextResponse.json(
        { error: "Item introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ item: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
