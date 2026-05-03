/**
 * GET /api/admin/reports/[period]?value=...
 *
 * Period kinds supported:
 *   - month        ?value=2026-04
 *   - year         ?value=2026
 *   - custom       ?start=2026-04-01&end=2026-04-15
 *
 * Returns a `PeriodReport` for the current tenant.
 * Protégé par cookie admin (cf. proxy).
 */

import { NextResponse } from "next/server";
import {
  getCustomRangeReport,
  getMonthlyReport,
  getYearlyReport,
} from "@/lib/db/reports-client";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ period: string }>;
}

export async function GET(request: Request, ctx: Ctx) {
  const { period } = await ctx.params;
  const url = new URL(request.url);

  try {
    if (period === "month") {
      const value = url.searchParams.get("value");
      if (!value) {
        return NextResponse.json(
          { error: "value param required (format YYYY-MM)" },
          { status: 400 }
        );
      }
      const report = await getMonthlyReport(value);
      return NextResponse.json(report);
    }

    if (period === "year") {
      const value = url.searchParams.get("value");
      if (!value) {
        return NextResponse.json(
          { error: "value param required (format YYYY)" },
          { status: 400 }
        );
      }
      const report = await getYearlyReport(value);
      return NextResponse.json(report);
    }

    if (period === "custom") {
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) {
        return NextResponse.json(
          { error: "start & end params required (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const report = await getCustomRangeReport(start, end);
      return NextResponse.json(report);
    }

    return NextResponse.json(
      { error: `Unknown period kind: ${period}. Use month/year/custom.` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
