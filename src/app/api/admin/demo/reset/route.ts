/**
 * POST /api/admin/demo/reset — Wipe les données fictives.
 *
 * Filtre par `notes ~ '__demo__'` pour ne supprimer QUE le scénario démo,
 * pas les commandes réelles. Ordres en cascade : d'abord items, puis
 * orders ; idem pour les réservations.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_TAG = "__demo__";

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

export async function POST() {
  try {
    /* On récupère d'abord les orders demo pour pouvoir wiper leurs items
     * (cascade ON delete normalement, mais on est défensif). */
    const orders = await sb<{ id: string }[]>(
      `orders?select=id&notes=ilike.*${encodeURIComponent(DEMO_TAG)}*`
    );
    let ordersDeleted = 0;
    if (orders.length > 0) {
      const ids = orders.map((o) => o.id);
      const idList = ids.map((i) => `"${i}"`).join(",");
      try {
        await sb(`order_items?order_id=in.(${idList})`, { method: "DELETE" });
      } catch {}
      await sb(`orders?id=in.(${idList})`, { method: "DELETE" });
      ordersDeleted = ids.length;
    }

    /* Reservations — match by demo tag in name or notes. */
    let reservationsDeleted = 0;
    try {
      const resas = await sb<{ id: string }[]>(
        `reservations?select=id&notes=ilike.*${encodeURIComponent(DEMO_TAG)}*`
      );
      if (resas.length > 0) {
        const idList = resas.map((r) => `"${r.id}"`).join(",");
        await sb(`reservations?id=in.(${idList})`, { method: "DELETE" });
        reservationsDeleted = resas.length;
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      orders_deleted: ordersDeleted,
      reservations_deleted: reservationsDeleted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
