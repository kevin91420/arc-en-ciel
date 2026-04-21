import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — Dashboard stats.
 */
export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch dashboard stats: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
