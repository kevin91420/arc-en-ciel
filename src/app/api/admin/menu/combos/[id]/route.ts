/**
 * PATCH  /api/admin/menu/combos/[id] — partial update (no slot edit here ;
 *   slots are replaced via the POST upsert above)
 * DELETE /api/admin/menu/combos/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteCombo, updateCombo } from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 80);
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 300);
  if (typeof body.price_cents === "number") {
    const p = Math.round(body.price_cents);
    if (Number.isFinite(p) && p >= 0 && p <= 100_000) patch.price_cents = p;
  }
  if (typeof body.image_url === "string") patch.image_url = body.image_url;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.card_id === "string" && body.card_id.trim())
    patch.card_id = body.card_id.trim();
  if (typeof body.position === "number")
    patch.position = Math.max(0, Math.min(99, Math.floor(body.position)));

  try {
    const row = await updateCombo(id, patch);
    if (!row) {
      return NextResponse.json({ error: "Combo introuvable" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteCombo(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
