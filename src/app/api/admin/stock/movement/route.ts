/**
 * POST /api/admin/stock/movement
 * Body : { menu_item_id, kind: 'restock'|'loss'|'adjustment'|'return', delta, notes? }
 *
 * Enregistre un mouvement de stock manuel (ré-appro, perte, ajustement).
 *
 * Permission : 'menu.eighty_six' minimum (manager + serveur peuvent gérer
 * les ruptures de stock du quotidien). Le manager seul peut faire les
 * pertes/ajustements via UI mais l'API est ouverte aux 2 rôles.
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyStockMovement } from "@/lib/db/stock-client";
import { withPermission } from "@/lib/auth/guards";
import type { StockMovementKind } from "@/lib/db/menu-types";

export const dynamic = "force-dynamic";

const VALID_KINDS: ReadonlySet<StockMovementKind> = new Set([
  "restock",
  "loss",
  "adjustment",
]);

export async function POST(req: NextRequest) {
  const guard = await withPermission("menu.eighty_six");
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const itemId = String(body.menu_item_id || "").trim();
  const kind = String(body.kind || "") as StockMovementKind;
  const delta = Number(body.delta);

  if (!itemId) {
    return NextResponse.json(
      { error: "menu_item_id requis" },
      { status: 400 }
    );
  }
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "kind doit être : restock, loss ou adjustment" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) {
    return NextResponse.json(
      { error: "delta invalide (différent de 0, ≤ 10000)" },
      { status: 400 }
    );
  }

  /* Validation cohérence kind / sign de delta :
   * - restock = positif obligatoire (entrée stock)
   * - loss/adjustment = peut être positif ou négatif */
  if (kind === "restock" && delta <= 0) {
    return NextResponse.json(
      { error: "Un ré-appro doit être positif (delta > 0)" },
      { status: 400 }
    );
  }
  if (kind === "loss" && delta >= 0) {
    return NextResponse.json(
      { error: "Une perte doit être négative (delta < 0)" },
      { status: 400 }
    );
  }

  try {
    const result = await applyStockMovement(itemId, Math.round(delta), kind, {
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 200) || undefined
          : undefined,
      createdByStaffId: guard.staff.id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Impossible d'appliquer le mouvement (item introuvable ?)" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      item: result.item,
      movement: result.movement,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
