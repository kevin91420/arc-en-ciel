/**
 * GET /api/staff/orders/history?date=YYYY-MM-DD
 *
 * Returns the paid orders for the given day (default = today, server local TZ).
 * Used by /staff/historique and /admin/historique. Auth via staff cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { listPaidOrdersForDay } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const isoDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : todayISO();

  try {
    const orders = await listPaidOrdersForDay(isoDate);
    const totalRevenueCents = orders.reduce(
      (s, o) => s + o.total_cents + o.tip_cents,
      0
    );
    const totalGuests = orders.reduce((s, o) => s + (o.guest_count || 0), 0);
    return NextResponse.json({
      date: isoDate,
      orders,
      summary: {
        orders_count: orders.length,
        guests_count: totalGuests,
        revenue_cents: totalRevenueCents,
        avg_ticket_cents:
          orders.length > 0
            ? Math.round(totalRevenueCents / orders.length)
            : 0,
        avg_per_guest_cents:
          totalGuests > 0
            ? Math.round(totalRevenueCents / totalGuests)
            : 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger l'historique : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
