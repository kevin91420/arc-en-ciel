/**
 * PATCH /api/staff/orders/[id]/flags — set the flags array on an order.
 *
 * Body : { flags: ("rush" | "allergy" | "birthday" | "vip")[] }
 *
 * Empty array clears all flags. Order is returned with items so the POS can
 * refresh in one shot.
 */

import { NextRequest, NextResponse } from "next/server";
import { setOrderFlags } from "@/lib/db/pos-client";
import type { OrderFlag } from "@/lib/db/pos-types";

export const dynamic = "force-dynamic";

const VALID_FLAGS: ReadonlySet<OrderFlag> = new Set([
  "rush",
  "allergy",
  "birthday",
  "vip",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { flags?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.flags)) {
    return NextResponse.json(
      { error: "flags doit être un tableau" },
      { status: 400 }
    );
  }

  const flags = Array.from(
    new Set(
      body.flags
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim().toLowerCase())
        .filter((f): f is OrderFlag => VALID_FLAGS.has(f as OrderFlag))
    )
  );

  try {
    const updated = await setOrderFlags(id, flags);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de mettre à jour les flags : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
