/**
 * GET /api/admin/menu/items/[id]/variants — list
 * PUT /api/admin/menu/items/[id]/variants — replace the whole set in one go
 *
 * Body PUT : { variants: [{ label, price_delta_cents, is_default?, position? }] }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listVariantsForItem,
  setVariantsForItem,
} from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  try {
    const variants = await listVariantsForItem(id);
    return NextResponse.json({ variants });
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
  let body: { variants?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.variants)) {
    return NextResponse.json(
      { error: "variants doit être un tableau" },
      { status: 400 }
    );
  }

  const cleaned = (body.variants as unknown[])
    .map((v): { label: string; price_delta_cents: number; is_default?: boolean; position?: number } | null => {
      if (!v || typeof v !== "object") return null;
      const r = v as Record<string, unknown>;
      const label =
        typeof r.label === "string" ? r.label.trim().slice(0, 40) : "";
      if (!label) return null;
      const delta = Number(r.price_delta_cents ?? 0);
      if (!Number.isFinite(delta) || delta < -100_000 || delta > 100_000) return null;
      return {
        label,
        price_delta_cents: Math.round(delta),
        is_default: Boolean(r.is_default),
        position: typeof r.position === "number" ? r.position : undefined,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .slice(0, 20);

  /* If multiple defaults, only keep the first. */
  let seenDefault = false;
  for (const v of cleaned) {
    if (v.is_default) {
      if (seenDefault) v.is_default = false;
      else seenDefault = true;
    }
  }

  try {
    const variants = await setVariantsForItem(id, cleaned);
    return NextResponse.json({ variants });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
