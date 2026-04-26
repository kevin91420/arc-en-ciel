/**
 * GET  /api/admin/menu/combos       — list (incl. inactive)
 * POST /api/admin/menu/combos       — upsert combo (id required, slug-style)
 *   Body: { id, card_id, name, description?, price_cents, image_url?,
 *           active?, position?, slots: [...] }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listCombos,
  setComboSlots,
  upsertCombo,
} from "@/lib/db/menu-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const combos = await listCombos({ includeInactive: true });
    return NextResponse.json({ combos });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (typeof body.id === "string" ? body.id : "").trim();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) {
    return NextResponse.json(
      { error: 'id invalide (slug-style "a-z 0-9 -")' },
      { status: 400 }
    );
  }
  const name = (typeof body.name === "string" ? body.name : "").trim();
  if (!name) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }
  const price = Number(body.price_cents);
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    return NextResponse.json(
      { error: "price_cents invalide" },
      { status: 400 }
    );
  }

  const cardId =
    typeof body.card_id === "string" && body.card_id.trim()
      ? body.card_id.trim()
      : "default";

  const rawSlots = Array.isArray(body.slots) ? (body.slots as unknown[]) : [];
  const cleanedSlots = rawSlots
    .map((s): {
      label: string;
      item_ids: string[];
      min_picks: number;
      max_picks: number;
    } | null => {
      if (!s || typeof s !== "object") return null;
      const r = s as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label.trim().slice(0, 40) : "";
      if (!label) return null;
      const itemIds = Array.isArray(r.item_ids)
        ? (r.item_ids as unknown[])
            .filter((x): x is string => typeof x === "string")
            .slice(0, 30)
        : [];
      const min = Math.max(0, Math.min(10, Number(r.min_picks) || 1));
      const max = Math.max(min, Math.min(10, Number(r.max_picks) || 1));
      return { label, item_ids: itemIds, min_picks: min, max_picks: max };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .slice(0, 8);

  try {
    const combo = await upsertCombo({
      id,
      card_id: cardId,
      name: name.slice(0, 80),
      description:
        typeof body.description === "string"
          ? body.description.slice(0, 300)
          : "",
      price_cents: Math.round(price),
      image_url:
        typeof body.image_url === "string"
          ? body.image_url.slice(0, 500)
          : null,
      active: body.active !== false,
      position: Number.isFinite(body.position)
        ? Math.max(0, Math.min(99, Math.floor(body.position as number)))
        : 0,
    });
    await setComboSlots(id, cleanedSlots);
    return NextResponse.json({ combo, slots: cleanedSlots }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
