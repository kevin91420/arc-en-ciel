/**
 * GET /api/kitchen/tickets — Live kitchen queue (KDS).
 *
 * Returns the current KitchenTicket[] (one card per fired/ready order,
 * carrying only the items still in cooking/ready).
 *
 * Protection: staff cookie (arc_staff_auth) — enforced in src/proxy.ts.
 */

import { NextResponse } from "next/server";
import { getKitchenTickets } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tickets = await getKitchenTickets();
    return NextResponse.json({ tickets }, { status: 200 });
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
