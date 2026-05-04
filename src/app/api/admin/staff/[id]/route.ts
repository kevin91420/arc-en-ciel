/**
 * PATCH  /api/admin/staff/[id] — édite un staff (nom, PIN, rôle, couleur, active)
 * DELETE /api/admin/staff/[id] — désactive un staff (soft-delete)
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { deactivateStaff, updateStaff } from "@/lib/db/pos-client";
import type { StaffRole } from "@/lib/auth/roles";
import { invalidateStaffCache } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const VALID_ROLES: ReadonlySet<StaffRole> = new Set([
  "manager",
  "server",
  "chef",
]);

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const patch: {
    name?: string;
    pin_code?: string;
    role?: StaffRole;
    color?: string;
    active?: boolean;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.pin_code === "string") {
    const pin = body.pin_code.trim();
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN doit contenir 4 chiffres" },
        { status: 400 }
      );
    }
    patch.pin_code = pin;
  }
  if (typeof body.role === "string") {
    if (!VALID_ROLES.has(body.role as StaffRole)) {
      return NextResponse.json(
        { error: "role invalide" },
        { status: 400 }
      );
    }
    patch.role = body.role as StaffRole;
  }
  if (typeof body.color === "string") {
    patch.color = body.color;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  try {
    const updated = await updateStaff(id, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Staff introuvable" },
        { status: 404 }
      );
    }
    invalidateStaffCache(id);
    return NextResponse.json({ staff: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await deactivateStaff(id);
    invalidateStaffCache(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
