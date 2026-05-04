/**
 * GET /api/admin/stock?filter=all|tracked|alerts
 *
 * Liste les items avec leur stock + meta catégorie + dernier mouvement.
 * Inclut les stats globales pour le dashboard.
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStockStats,
  listItemsWithStock,
} from "@/lib/db/stock-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";

  try {
    const [items, stats] = await Promise.all([
      listItemsWithStock({
        onlyTracked: filter === "tracked" || filter === "alerts",
        onlyAlerts: filter === "alerts",
      }),
      getStockStats(),
    ]);
    return NextResponse.json({
      items,
      stats,
      filter,
      count: items.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
