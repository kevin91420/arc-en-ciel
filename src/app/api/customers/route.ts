import { NextRequest, NextResponse } from "next/server";
import { listCustomers } from "@/lib/db/client";
import type { Customer } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers?q=search — List all customers, optional search on
 * name / email / phone (case-insensitive substring).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  try {
    const customers = await listCustomers();

    if (!q) {
      return NextResponse.json(customers, { status: 200 });
    }

    const filtered = customers.filter((c: Customer) => {
      const name = c.name?.toLowerCase() ?? "";
      const email = c.email?.toLowerCase() ?? "";
      const phone = c.phone?.toLowerCase() ?? "";
      return (
        name.includes(q) || email.includes(q) || phone.includes(q)
      );
    });

    return NextResponse.json(filtered, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list customers: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
