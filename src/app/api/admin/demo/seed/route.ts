/**
 * POST /api/admin/demo/seed — Inject a realistic demo scenario.
 *
 * Crée 8 commandes (états variés : open/fired/ready/served/paid), 3
 * réservations à venir, quelques annulations et un Z partiellement
 * rempli. Toutes les rows sont marquées `notes` contenant `__demo__`
 * pour pouvoir les supprimer sélectivement via /api/admin/demo/reset.
 *
 * Usage : depuis /admin/parcours-demo, bouton "Charger un scénario démo".
 */

import { NextResponse } from "next/server";
import { getMenu } from "@/lib/db/menu-client";

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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SeededOrder {
  id: string;
}

export async function POST() {
  try {
    /* Pull the live menu so the seeded items match the actual catalog. */
    const menu = await getMenu({ includeInactive: false });
    const flatItems = menu.flatMap((c) =>
      c.items.map((it) => ({
        id: it.id,
        name: it.name,
        category: c.id,
        price_cents: it.price_cents,
        station: c.station,
      }))
    );
    if (flatItems.length === 0) {
      return NextResponse.json(
        { error: "Aucun plat dans le menu — impossible de seeder." },
        { status: 400 }
      );
    }

    /* ── Scenarios for the 8 demo orders ── */
    const scenarios = [
      { table: 1, status: "fired", count: 3, label: "Famille de 4" },
      { table: 2, status: "fired", count: 2, label: "Couple anniversaire" },
      { table: 3, status: "ready", count: 4, label: "Groupe d'amis" },
      { table: 4, status: "served", count: 3, label: "Habitués VIP" },
      { table: 5, status: "open", count: 2, label: "Vient d'arriver" },
      { table: 7, status: "fired", count: 5, label: "Table grand groupe" },
      { table: 9, status: "ready", count: 2, label: "Pressé midi" },
      { table: null /* takeaway */, status: "fired", count: 2, label: "À emporter" },
    ];

    const createdOrders: SeededOrder[] = [];

    for (const sc of scenarios) {
      const itemsToAdd = Array.from({ length: sc.count }).map(() =>
        pickRandom(flatItems)
      );
      const subtotal = itemsToAdd.reduce((s, it) => s + it.price_cents, 0);
      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax;

      const orderRow = {
        table_number: sc.table,
        status: sc.status,
        source: sc.table == null ? "takeaway" : "dine_in",
        guest_count: sc.table == null ? 1 : Math.min(sc.count, 6),
        notes: `${DEMO_TAG} ${sc.label}`,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        fired_at: ["fired", "ready", "served"].includes(sc.status)
          ? new Date(Date.now() - Math.floor(Math.random() * 30 * 60_000)).toISOString()
          : null,
        ready_at: ["ready", "served"].includes(sc.status)
          ? new Date(Date.now() - Math.floor(Math.random() * 10 * 60_000)).toISOString()
          : null,
        served_at: sc.status === "served"
          ? new Date(Date.now() - Math.floor(Math.random() * 5 * 60_000)).toISOString()
          : null,
        flags: sc.label.includes("anniversaire")
          ? ["birthday"]
          : sc.label.includes("VIP")
            ? ["vip"]
            : sc.label.includes("Pressé")
              ? ["rush"]
              : [],
      };

      const [order] = await sb<{ id: string }[]>("orders", {
        method: "POST",
        body: JSON.stringify(orderRow),
      });

      const itemRows = itemsToAdd.map((it) => ({
        order_id: order.id,
        menu_item_id: it.id,
        menu_item_name: it.name,
        menu_item_category: it.category,
        price_cents: it.price_cents,
        quantity: 1,
        modifiers: [],
        notes: DEMO_TAG,
        status:
          sc.status === "open"
            ? "pending"
            : sc.status === "served"
              ? "served"
              : sc.status === "ready"
                ? "ready"
                : "cooking",
        station: it.station,
        fired_at: orderRow.fired_at,
        ready_at: orderRow.ready_at,
        served_at: orderRow.served_at,
      }));
      await sb("order_items", {
        method: "POST",
        body: JSON.stringify(itemRows),
      });

      createdOrders.push({ id: order.id });
    }

    /* ── 3 réservations à venir ── */
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const reservations = [
      {
        customer_name: `__demo__ Anniversaire Sophie`,
        customer_email: "demo-sophie@example.com",
        customer_phone: "06 12 34 56 78",
        date: fmt(today),
        time: "19:30",
        guests: 4,
        status: "confirmed",
        source: "website",
        notes: `${DEMO_TAG} Demo : anniversaire surprise, prévoir gâteau`,
        special_occasion: "Anniversaire",
      },
      {
        customer_name: `__demo__ Famille Renard`,
        customer_email: "demo-renard@example.com",
        customer_phone: "06 98 76 54 32",
        date: fmt(today),
        time: "20:00",
        guests: 6,
        status: "confirmed",
        source: "thefork",
        notes: `${DEMO_TAG} Demo`,
        special_occasion: null,
      },
      {
        customer_name: `__demo__ Groupe entreprise`,
        customer_email: "demo-entreprise@example.com",
        customer_phone: "06 44 55 66 77",
        date: fmt(new Date(today.getTime() + 86400000)),
        time: "12:30",
        guests: 8,
        status: "pending",
        source: "google",
        notes: `${DEMO_TAG} Demo : pause déjeuner équipe`,
        special_occasion: null,
      },
    ];

    let resaCount = 0;
    for (const r of reservations) {
      try {
        await sb("reservations", {
          method: "POST",
          body: JSON.stringify(r),
        });
        resaCount++;
      } catch {
        /* table reservations may not exist on every tenant — soft fail */
      }
    }

    return NextResponse.json({
      ok: true,
      orders: createdOrders.length,
      reservations: resaCount,
      message:
        "Scénario démo injecté — va sur /staff/tables et /admin/historique pour voir.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
