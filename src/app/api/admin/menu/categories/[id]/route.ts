/**
 * PATCH  /api/admin/menu/categories/[id] — partial update
 * DELETE /api/admin/menu/categories/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/lib/db/menu-client";
import type { Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_STATIONS: Station[] = [
  "main",
  "pizza",
  "grill",
  "cold",
  "dessert",
  "bar",
];

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
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 80);
  if (typeof body.number === "string") patch.number = body.number.trim().slice(0, 4);
  if (body.subtitle !== undefined)
    patch.subtitle =
      typeof body.subtitle === "string" ? body.subtitle.slice(0, 120) : null;
  if (body.intro !== undefined)
    patch.intro =
      typeof body.intro === "string" ? body.intro.slice(0, 500) : null;
  if (typeof body.icon === "string") patch.icon = body.icon.slice(0, 8);
  if (typeof body.station === "string") {
    const station = body.station as Station;
    if (VALID_STATIONS.includes(station)) patch.station = station;
  }
  if (typeof body.position === "number") {
    patch.position = Math.max(0, Math.min(999, Math.floor(body.position)));
  }
  if (typeof body.active === "boolean") patch.active = body.active;

  try {
    const row = await updateCategory(id, patch);
    if (!row) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
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
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
