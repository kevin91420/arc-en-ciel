/**
 * GET /api/kitchen/tickets — Live kitchen queue (KDS).
 *
 * Returns the current KitchenTicket[] (one card per fired/ready order,
 * carrying only the items still in cooking/ready).
 *
 * Query params:
 *   - `station` (optional) — one of: main | pizza | grill | cold | dessert | bar
 *     When present, tickets are filtered server-side so that only items of
 *     the given station are returned, and only orders with at least one
 *     matching item appear. This is the core guardrail that prevents a chef
 *     from ever seeing a line that isn't his.
 *
 * Protection: staff cookie (arc_staff_auth) — enforced in src/proxy.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getKitchenTickets } from "@/lib/db/pos-client";
import type { Station } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const STATIONS: Station[] = ["main", "pizza", "grill", "cold", "dessert", "bar"];

function parseStation(raw: string | null): Station | undefined {
  if (!raw) return undefined;
  return STATIONS.includes(raw as Station) ? (raw as Station) : undefined;
}

export async function GET(req: NextRequest) {
  const stationParam = req.nextUrl.searchParams.get("station");

  /* Explicit invalid value → 400 (silent drop would be dangerous here:
   * a typo could accidentally show everything to a single-station chef). */
  if (stationParam && !STATIONS.includes(stationParam as Station)) {
    return NextResponse.json(
      {
        error: `Invalid station "${stationParam}". Must be one of: ${STATIONS.join(", ")}`,
        tickets: [],
      },
      { status: 400 }
    );
  }

  const station = parseStation(stationParam);

  try {
    const tickets = await getKitchenTickets(station ? { station } : {});
    return NextResponse.json({ tickets, station: station ?? null }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch kitchen tickets: " +
          ((err as Error).message || "unknown error"),
        tickets: [],
      },
      { status: 500 }
    );
  }
}
