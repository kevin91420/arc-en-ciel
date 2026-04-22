/**
 * GET /api/admin/prospects — Liste tous les prospects, triés par recency.
 * Filtres : ?status=new|queued|...  &city=Orly
 * Protégé par proxy.ts (cookie admin via /api/admin/*).
 */

import { NextRequest, NextResponse } from "next/server";
import { listProspects } from "@/lib/db/prospects-client";
import type { ProspectStatus } from "@/lib/db/prospects-types";
import { PROSPECT_STATUSES } from "@/lib/db/prospects-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const statusParam = searchParams.get("status") ?? undefined;
  const cityParam = searchParams.get("city") ?? undefined;

  const filters: { status?: ProspectStatus; city?: string } = {};
  if (statusParam) {
    if (!PROSPECT_STATUSES.includes(statusParam as ProspectStatus)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${PROSPECT_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    filters.status = statusParam as ProspectStatus;
  }
  if (cityParam && cityParam.trim().length > 0) {
    filters.city = cityParam.trim();
  }

  try {
    const rows = await listProspects(filters);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list prospects: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
