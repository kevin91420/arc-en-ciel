/**
 * GET /api/admin/leads — Liste tous les leads, triés par recency.
 * Protégé par proxy.ts (cookie admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/db/leads-client";
import type { LeadStatus } from "@/lib/db/leads-types";

export const dynamic = "force-dynamic";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const statusParam = searchParams.get("status") ?? undefined;

  const filters: { status?: LeadStatus } = {};
  if (statusParam) {
    if (!LEAD_STATUSES.includes(statusParam as LeadStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${LEAD_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    filters.status = statusParam as LeadStatus;
  }

  try {
    const leads = await listLeads(filters);
    return NextResponse.json(leads, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list leads: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
