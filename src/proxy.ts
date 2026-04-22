/**
 * Admin auth proxy (Next.js 16 — the file formerly known as `middleware.ts`).
 *
 * In Next.js 16 the `middleware` file convention was renamed to `proxy`.
 * The runtime + capabilities are identical. See node_modules/next/dist/docs/
 * 01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * Responsibility
 *   - Gate every /admin/* page behind a shared-secret cookie ("arc_admin_auth").
 *   - Gate sensitive admin-only API routes (list/edit reservations, waiter PATCH,
 *     stats, customers) behind the same cookie.
 *   - Always allow /admin/login (to avoid a redirect loop) and the auth API.
 *   - Public-facing routes (POST /api/reservations for the booking form,
 *     POST /api/waiter for the QR "call waiter" action, the marketing site,
 *     etc.) are never touched.
 *
 * Demo mode
 *   ADMIN_PASSWORD defaults to "admin2026" if the env var is unset.
 *
 * Security caveats (intentional, demo-grade)
 *   - The cookie stores the password verbatim. Acceptable for a demo; in
 *     production swap for a signed session token.
 *   - Protection is coarse-grained by path. Sensitive logic in Server Functions
 *     should still perform its own authorization check (see the Next 16 docs'
 *     warning about Server Functions bypassing matchers).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "arc_admin_auth";
const DEFAULT_PASSWORD = "admin2026";

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

/**
 * Admin-only API paths. Anything matching here requires the cookie.
 * Public endpoints (POST /api/reservations, POST /api/waiter) are NOT listed.
 */
function isProtectedApi(pathname: string, method: string): boolean {
  // Webhook endpoint is PUBLIC — auth is handled by token header inside the route.
  if (pathname === "/api/reservations/webhook") return false;

  // Loyalty public routes: enrollment + public card view
  if (pathname === "/api/loyalty/enroll" && method === "POST") return false;
  if (pathname.startsWith("/api/loyalty/card/") && method === "GET") return false;

  // Loyalty admin routes: adding stamps, listing cards, config
  if (pathname === "/api/loyalty/stamp") return true;

  // GET /api/reservations          — list (admin only)
  // PATCH /api/reservations/[id]   — admin only
  // DELETE /api/reservations/[id]  — admin only
  if (pathname === "/api/reservations" && method === "GET") return true;
  if (pathname.startsWith("/api/reservations/") && method !== "GET") return true;

  // GET /api/waiter                — list (admin only)
  // PATCH /api/waiter/[id]         — admin only
  if (pathname === "/api/waiter" && method === "GET") return true;
  if (pathname.startsWith("/api/waiter/") && method !== "GET") return true;

  // Stats + customers = admin only.
  if (pathname.startsWith("/api/stats")) return true;
  if (pathname.startsWith("/api/customers")) return true;

  // Admin-only API routes (except /api/admin/auth which is exempted above).
  // Includes /api/admin/webhook-token — must NOT be publicly readable.
  if (pathname.startsWith("/api/admin/")) return true;

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Login page is always public (otherwise: redirect loop).
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // 2. Auth API is always public (that's how you log in / log out).
  if (pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = cookieValue !== undefined && cookieValue === getExpectedPassword();

  // 3. Admin pages.
  if (pathname.startsWith("/admin")) {
    if (authed) return NextResponse.next();
    const loginUrl = new URL("/admin/login", request.url);
    // Preserve where they were going so we can bounce them back after login.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Protected API routes.
  if (isProtectedApi(pathname, method)) {
    if (authed) return NextResponse.next();
    return NextResponse.json(
      { error: "Unauthorized — admin session required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

/**
 * Match /admin/* and /api/* (we filter inside the function above because the
 * public parts of /api depend on the HTTP method, which matchers can't express
 * cleanly).
 */
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
