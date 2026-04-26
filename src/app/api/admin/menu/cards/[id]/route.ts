/**
 * PATCH  /api/admin/menu/cards/[id]
 * DELETE /api/admin/menu/cards/[id] (refuse de supprimer "default")
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase non configuré");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

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
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 60);
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.is_default === "boolean") patch.is_default = body.is_default;
  if (typeof body.schedule_start === "string" || body.schedule_start === null) {
    patch.schedule_start = body.schedule_start;
  }
  if (typeof body.schedule_end === "string" || body.schedule_end === null) {
    patch.schedule_end = body.schedule_end;
  }
  if (Array.isArray(body.schedule_days)) {
    patch.schedule_days = (body.schedule_days as string[]).filter((d) =>
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(d)
    );
  }
  if (typeof body.position === "number") {
    patch.position = Math.max(0, Math.min(99, Math.floor(body.position)));
  }

  try {
    const rows = await sb(`menu_cards?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return NextResponse.json(rows);
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
  if (id === "default") {
    return NextResponse.json(
      { error: "Impossible de supprimer la carte par défaut." },
      { status: 400 }
    );
  }
  try {
    await sb(`menu_cards?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
