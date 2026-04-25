/**
 * POST /api/staff/stock — Toggle or set the 86 status for a menu item.
 *
 * Body: { item_id: string; out_of_stock?: boolean }
 *   - `out_of_stock` omitted → toggle current state.
 *   - `out_of_stock` true    → add to 86 list.
 *   - `out_of_stock` false   → remove from 86 list.
 *
 * Returns the up-to-date eighty_six_list.
 *
 * Auth: staff cookie (any authenticated staff member — chef or server can
 * flag an item out of stock in real time).
 */

import { NextRequest, NextResponse } from "next/server";
import { STAFF_COOKIE } from "@/lib/staff-auth";
import { getSettings, updateSettings } from "@/lib/db/settings-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!req.cookies.get(STAFF_COOKIE)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  try {
    const s = await getSettings();
    return NextResponse.json({ eighty_six_list: s.eighty_six_list ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!req.cookies.get(STAFF_COOKIE)) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { item_id?: unknown; out_of_stock?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId = typeof body.item_id === "string" ? body.item_id.trim() : "";
  if (!itemId || itemId.length > 64) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  try {
    const current = await getSettings();
    const set = new Set(current.eighty_six_list ?? []);
    const desired =
      typeof body.out_of_stock === "boolean"
        ? body.out_of_stock
        : !set.has(itemId);

    if (desired) set.add(itemId);
    else set.delete(itemId);

    const next = Array.from(set).slice(0, 500);
    const updated = await updateSettings({ eighty_six_list: next });
    return NextResponse.json({
      eighty_six_list: updated.eighty_six_list ?? next,
      item_id: itemId,
      out_of_stock: desired,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
