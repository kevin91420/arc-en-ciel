/**
 * POST   /api/admin/auth  — log in by sending { password }.
 * DELETE /api/admin/auth  — log out (clears the cookie).
 *
 * The cookie is httpOnly + sameSite=lax so the browser sends it automatically
 * on same-origin navigations (admin pages) and fetches with credentials.
 *
 * Demo mode: if ADMIN_PASSWORD isn't set, the password is "admin2026".
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTH_COOKIE = "arc_admin_auth";
const DEFAULT_PASSWORD = "admin2026";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days.

function expectedPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

export async function POST(req: NextRequest) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const submitted =
    typeof body?.password === "string" ? body.password : undefined;

  if (!submitted) {
    return NextResponse.json(
      { error: "password is required" },
      { status: 400 }
    );
  }

  if (submitted !== expectedPassword()) {
    // Small delay to slow down brute force on a demo environment.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: submitted,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/**
 * GET /api/admin/auth — lightweight status check used by the admin layout to
 * show the "DEMO" badge (when ADMIN_PASSWORD is unset) and to confirm the
 * session is still valid.
 */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = cookie !== undefined && cookie === expectedPassword();
  return NextResponse.json({
    authed,
    demo: !process.env.ADMIN_PASSWORD,
  });
}
