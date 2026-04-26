/**
 * GET /api/admin/menu/items/[id]/modifiers — list (per-item)
 * PUT /api/admin/menu/items/[id]/modifiers — replace the whole set
 *
 * Body PUT : { modifiers: [{ label, price_delta_cents, is_required?, position? }] }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listModifiersForItem,
  setModifiersForItem,
} from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  try {
    const modifiers = await listModifiersForItem(id);
    return NextResponse.json({ modifiers });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { modifiers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.modifiers)) {
    return NextResponse.json(
      { error: "modifiers doit être un tableau" },
      { status: 400 }
    );
  }

  const cleaned = (body.modifiers as unknown[])
    .map((m): { label: string; price_delta_cents: number; is_required?: boolean; position?: number } | null => {
      if (!m || typeof m !== "object") return null;
      const r = m as Record<string, unknown>;
      const label =
        typeof r.label === "string" ? r.label.trim().slice(0, 40) : "";
      if (!label) return null;
      const delta = Number(r.price_delta_cents ?? 0);
      if (!Number.isFinite(delta) || delta < -100_000 || delta > 100_000) return null;
      return {
        label,
        price_delta_cents: Math.round(delta),
        is_required: Boolean(r.is_required),
        position: typeof r.position === "number" ? r.position : undefined,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .slice(0, 30);

  try {
    const modifiers = await setModifiersForItem(id, cleaned);
    return NextResponse.json({ modifiers });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
