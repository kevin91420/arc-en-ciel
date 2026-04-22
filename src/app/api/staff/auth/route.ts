/**
 * POST   /api/staff/auth   — log in with { pin }. Sets `arc_staff_auth` cookie
 *                            containing the staff member's id.
 * DELETE /api/staff/auth   — log out (clears the cookie).
 * GET    /api/staff/auth   — returns the current staff member, or 401.
 *
 * NOTE: proxy marks this endpoint public — DO NOT remove that exemption
 * (otherwise you can't ever log in).
 */

import { NextRequest, NextResponse } from "next/server";
import { findStaffByPin, getStaffById } from "@/lib/db/pos-client";
import {
  STAFF_COOKIE,
  clearStaffCookie,
  setStaffCookie,
} from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

function publicStaff(
  staff: { id: string; name: string; role: string; color: string }
) {
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    color: staff.color,
  };
}

export async function POST(req: NextRequest) {
  let body: { pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{3,8}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN invalide (3 à 8 chiffres attendus)" },
      { status: 400 }
    );
  }

  try {
    const staff = await findStaffByPin(pin);
    if (!staff) {
      /* Small delay to slow down brute force guesses. */
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "PIN incorrect" }, { status: 401 });
    }

    const res = NextResponse.json(publicStaff(staff), { status: 200 });
    setStaffCookie(res, staff.id);
    return res;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Authentification impossible : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearStaffCookie(res);
  return res;
}

export async function GET(req: NextRequest) {
  const id = req.cookies.get(STAFF_COOKIE)?.value;
  if (!id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const staff = await getStaffById(id);
    /* Fallback for the demo PINs when Supabase isn't configured: they have
     * deterministic ids but are never persisted, so getStaffById returns null.
     * Accept the cookie as-is and return a minimal stub. */
    if (!staff) {
      if (id === "demo-manager")
        return NextResponse.json({
          id,
          name: "Kevin",
          role: "manager",
          color: "#C0392B",
        });
      if (id === "demo-server")
        return NextResponse.json({
          id,
          name: "Sophie",
          role: "server",
          color: "#B8922F",
        });
      if (id === "demo-chef")
        return NextResponse.json({
          id,
          name: "Chef Luca",
          role: "chef",
          color: "#8B6914",
        });
      return NextResponse.json(
        { error: "Staff introuvable" },
        { status: 401 }
      );
    }
    return NextResponse.json(publicStaff(staff));
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Staff lookup failed: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
