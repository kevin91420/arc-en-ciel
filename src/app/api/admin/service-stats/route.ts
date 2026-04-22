/**
 * GET /api/admin/service-stats — Live service dashboard feed.
 *
 * Returns:
 *   - stats        → getServiceStats()    (day KPIs + current queue + top items)
 *   - activeOrders → listActiveOrders()   (open/fired/ready/served, with items)
 *
 * Protected via the /api/admin/* rule in src/proxy.ts.
 */

import { NextResponse } from "next/server";
import { getServiceStats, listActiveOrders } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, activeOrders] = await Promise.all([
      getServiceStats(),
      listActiveOrders(),
    ]);
    return NextResponse.json({ stats, activeOrders }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch service stats: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
