/**
 * POST /api/admin/ingredients/[id]/movement
 * Body : { kind, delta?, quantityAbs?, costPerUnitCents?, reference?, notes? }
 *
 * Apply mouvement de stock sur un ingrédient :
 *   - restock : delta > 0, met à jour le coût pondéré
 *   - consume / loss : delta < 0
 *   - adjustment : delta signé (correction manuelle)
 *   - inventory : `quantityAbs` = quantity physique réelle (override)
 */

import { NextRequest, NextResponse } from "next/server";
import { applyIngredientMovement } from "@/lib/db/ingredients-client";
import { withPermission } from "@/lib/auth/guards";
import { getCurrentStaff } from "@/lib/staff-auth";
import type { IngredientMovementKind } from "@/lib/db/ingredient-types";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const VALID_KINDS: IngredientMovementKind[] = [
  "restock",
  "consume",
  "loss",
  "adjustment",
  "inventory",
];

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await withPermission("menu.edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const kind = body.kind as IngredientMovementKind;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind invalide. Valeurs : ${VALID_KINDS.join(", ")}` },
      { status: 400 }
    );
  }

  let delta: number;
  if (kind === "inventory") {
    const abs = Number(body.quantityAbs);
    if (!Number.isFinite(abs) || abs < 0) {
      return NextResponse.json(
        { error: "quantityAbs requis pour kind=inventory" },
        { status: 400 }
      );
    }
    delta = abs; // applyIngredientMovement traite delta comme quantité absolue si kind=inventory
  } else {
    const d = Number(body.delta);
    if (!Number.isFinite(d) || d === 0) {
      return NextResponse.json({ error: "delta non nul requis" }, { status: 400 });
    }
    delta = d;
  }

  const cost = body.costPerUnitCents !== undefined
    ? Math.max(0, Math.floor(Number(body.costPerUnitCents)))
    : undefined;

  const staff = await getCurrentStaff().catch(() => null);

  try {
    const result = await applyIngredientMovement(id, delta, kind, {
      reference: typeof body.reference === "string" ? body.reference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      costPerUnitCents: cost,
      createdByStaffId: staff?.id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Ingrédient introuvable ou delta nul" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
