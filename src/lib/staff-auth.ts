/**
 * Staff auth — cookie utilities shared by `/api/staff/*` route handlers and
 * the `proxy` file. The cookie is NOT signed (demo-grade); hardening comes
 * later when we wire a real session store.
 *
 * Name:   arc_staff_auth
 * Value:  the staff member's `id` (UUID / "demo-…" string)
 * Age:    7 days, httpOnly, sameSite=lax, secure in prod.
 */

import { NextResponse } from "next/server";

export const STAFF_COOKIE = "arc_staff_auth";
export const STAFF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setStaffCookie(res: NextResponse, staffId: string): void {
  res.cookies.set({
    name: STAFF_COOKIE,
    value: staffId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_COOKIE_MAX_AGE,
  });
}

export function clearStaffCookie(res: NextResponse): void {
  res.cookies.set({
    name: STAFF_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
