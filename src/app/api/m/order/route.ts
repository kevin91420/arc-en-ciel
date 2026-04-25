/**
 * POST /api/m/order — PUBLIC endpoint used by the QR menu (`/m/carte`).
 *
 * Lets a customer seated at a table submit a cart to the POS without any
 * staff authentication. The proxy (src/proxy.ts) allow-lists this route so
 * the staff cookie is NOT required.
 *
 * Contract
 *   Body: {
 *     table_number: number (1-50),
 *     items: [{
 *       menu_item_id, menu_item_name, menu_item_category?, price_cents,
 *       quantity?, modifiers?, notes?, station?
 *     }]
 *   }
 *
 * Logic
 *   1. Look up any OPEN order (status in open/fired/ready/served) for that table.
 *   2. If one exists → append items as `pending` on the SAME order. `source`
 *      is preserved (server may have already opened a dine_in order for the
 *      table — we don't clobber it).
 *   3. If none exists → create a fresh order with source `dine_in_qr`,
 *      status `open`, `guest_count: 1` (server adjusts later at the POS).
 *   4. Totals are recomputed inside `addItemsToOrder`.
 *
 * Rate limiting: 10 requests / 60s / IP.
 *
 * Returns the updated OrderWithItems so the client can show a success
 * confirmation (and, later, display "your order number" if needed).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  addItemsToOrder,
  createOrder,
  getActiveOrderForTable,
  isPosConfigured,
} from "@/lib/db/pos-client";
import { getSettings } from "@/lib/db/settings-client";
import type { AddItemsPayload, Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const STATIONS: Station[] = ["main", "pizza", "grill", "cold", "dessert", "bar"];

/* ──────────────────────────────────────────────────────────
   Rate limiting — in-memory sliding window per IP
   Max 10 requests / 60s / IP
   ────────────────────────────────────────────────────────── */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitEntry = { timestamps: number[] };

const globalStore = globalThis as unknown as {
  __mobileOrderRateLimit?: Map<string, RateLimitEntry>;
};
const rateLimitMap: Map<string, RateLimitEntry> =
  globalStore.__mobileOrderRateLimit ?? new Map();
globalStore.__mobileOrderRateLimit = rateLimitMap;

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function checkRateLimit(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = entry.timestamps[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    );
    rateLimitMap.set(ip, entry);
    return { ok: false, retryAfterSec };
  }
  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return { ok: true, retryAfterSec: 0 };
}

/* ─────────────────────────────────────────────────────── */

interface MobileOrderBody {
  table_number: number;
  items: unknown;
}

export async function POST(req: NextRequest) {
  /* Rate limit first — cheap. */
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Trop de requêtes. Réessayez dans ${limit.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  if (!isPosConfigured()) {
    return NextResponse.json(
      { error: "POS non configuré — contactez le serveur." },
      { status: 503 }
    );
  }

  let body: Partial<MobileOrderBody>;
  try {
    body = (await req.json()) as Partial<MobileOrderBody>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  /* Validate table number (1–50, matches DB constraint). */
  if (
    typeof body.table_number !== "number" ||
    !Number.isInteger(body.table_number) ||
    body.table_number < 1 ||
    body.table_number > 50
  ) {
    return NextResponse.json(
      { error: "table_number doit être un entier entre 1 et 50" },
      { status: 400 }
    );
  }
  const tableNumber = body.table_number;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items: tableau non vide requis" },
      { status: 400 }
    );
  }

  /* Cap at 50 lines per submission — defensive, a real cart shouldn't grow
   * past 20 and beyond that we're likely facing abuse. */
  if (body.items.length > 50) {
    return NextResponse.json(
      { error: "Trop d'items dans une seule commande (max 50)" },
      { status: 400 }
    );
  }

  const items: AddItemsPayload["items"] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    if (typeof r.menu_item_id !== "string" || !r.menu_item_id) {
      return NextResponse.json(
        { error: "menu_item_id manquant sur un item" },
        { status: 400 }
      );
    }
    if (typeof r.menu_item_name !== "string" || !r.menu_item_name) {
      return NextResponse.json(
        { error: "menu_item_name manquant sur un item" },
        { status: 400 }
      );
    }
    if (
      typeof r.price_cents !== "number" ||
      !Number.isInteger(r.price_cents) ||
      r.price_cents < 0 ||
      r.price_cents > 100_000
    ) {
      return NextResponse.json(
        {
          error: `price_cents invalide pour "${r.menu_item_name}" (entier 0..100000 attendu)`,
        },
        { status: 400 }
      );
    }

    const quantity =
      typeof r.quantity === "number" && r.quantity > 0
        ? Math.min(20, Math.floor(r.quantity))
        : 1;

    let station: Station = "main";
    if (
      typeof r.station === "string" &&
      STATIONS.includes(r.station as Station)
    ) {
      station = r.station as Station;
    }

    const modifiers =
      Array.isArray(r.modifiers) &&
      r.modifiers.every((m) => typeof m === "string")
        ? (r.modifiers as string[]).slice(0, 10).map((m) => m.slice(0, 60))
        : undefined;

    const notes =
      typeof r.notes === "string" ? r.notes.slice(0, 200) : undefined;

    items.push({
      menu_item_id: r.menu_item_id.slice(0, 80),
      menu_item_name: r.menu_item_name.slice(0, 120),
      menu_item_category:
        typeof r.menu_item_category === "string"
          ? r.menu_item_category.slice(0, 40)
          : undefined,
      price_cents: r.price_cents,
      quantity,
      modifiers,
      notes,
      station,
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Aucun item valide" },
      { status: 400 }
    );
  }

  /* 86 guard — refuse if any requested item is flagged out of stock. Prevents
   * a stale QR menu from leaking a sold-out plate past client-side checks. */
  try {
    const settings = await getSettings();
    const eightySix = new Set(settings.eighty_six_list ?? []);
    const sold = items.filter((i) => eightySix.has(i.menu_item_id));
    if (sold.length > 0) {
      const label =
        sold[0].menu_item_name + (sold.length > 1 ? ` (+ ${sold.length - 1})` : "");
      return NextResponse.json(
        {
          error: `Désolé, plus disponible ce soir : ${label}.`,
          unavailable: sold.map((i) => i.menu_item_id),
        },
        { status: 409 }
      );
    }
  } catch {
    /* Settings unavailable → fail open (don't block dining on missing config). */
  }

  try {
    /* Check for an existing open order on the table. We DO NOT override its
     * source — if a server already opened a dine_in ticket, we graft onto it
     * and the "📱 Client" badge keys on the per-item status instead. */
    const existing = await getActiveOrderForTable(tableNumber);

    let orderId: string;
    if (existing) {
      orderId = existing.id;
    } else {
      const created = await createOrder({
        table_number: tableNumber,
        source: "dine_in_qr",
        guest_count: 1,
        /* No staff_id — this is a customer-initiated order. The server will
         * claim it from the POS when they validate. */
      });
      orderId = created.id;
    }

    const updated = await addItemsToOrder(orderId, { items });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible d'envoyer la commande : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
