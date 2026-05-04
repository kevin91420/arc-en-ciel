/**
 * GET  /api/admin/staff?include_inactive=1 — liste les staff
 * POST /api/admin/staff                    — crée un staff
 *
 * Protégé par cookie admin (cf. proxy).
 */

import { NextRequest, NextResponse } from "next/server";
import { createStaff, listStaff } from "@/lib/db/pos-client";
import type { StaffRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const VALID_ROLES: ReadonlySet<StaffRole> = new Set([
  "manager",
  "server",
  "chef",
]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("include_inactive") === "1";
  try {
    const staff = await listStaff({ includeInactive });
    return NextResponse.json({ staff, count: staff.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const pin_code = String(body.pin_code || "").trim();
  const role = String(body.role || "").trim() as StaffRole;
  const color = body.color ? String(body.color) : undefined;

  if (!name) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin_code)) {
    return NextResponse.json(
      { error: "PIN doit contenir 4 chiffres" },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: "role doit être : manager, server ou chef" },
      { status: 400 }
    );
  }

  try {
    const created = await createStaff({ name, pin_code, role, color });
    return NextResponse.json({ staff: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
