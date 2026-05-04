/**
 * Admin + Staff auth proxy (Next.js 16 — the file formerly known as `middleware.ts`).
 *
 * In Next.js 16 the `middleware` file convention was renamed to `proxy`.
 * The runtime + capabilities are identical. See node_modules/next/dist/docs/
 * 01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * Responsibilities
 *   - Gate every /admin/* page behind the shared-secret cookie ("arc_admin_auth").
 *   - Gate the POS serveur under /staff/* behind the staff cookie ("arc_staff_auth").
 *   - Gate sensitive admin-only API routes behind the admin cookie.
 *   - Gate /api/staff/* routes behind the staff cookie (EXCEPT /api/staff/auth,
 *     which is how you actually log in / out).
 *   - Always allow /admin/login and /staff/login (otherwise: redirect loop).
 *   - Public-facing routes (POST /api/reservations, POST /api/waiter, etc.)
 *     are never touched.
 *
 * Demo mode
 *   ADMIN_PASSWORD defaults to "admin2026" if the env var is unset.
 *   Staff PINs are whatever findStaffByPin() accepts (demo: 1234/2024/9999).
 *
 * Security caveats (intentional, demo-grade)
 *   - The admin cookie stores the password verbatim; the staff cookie stores
 *     the staff UUID verbatim. Acceptable for a demo; swap for signed session
 *     tokens before going live.
 *   - Protection is coarse-grained by path. Sensitive logic in Server Functions
 *     should still perform its own authorization check (see the Next 16 docs'
 *     warning about Server Functions bypassing matchers).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "arc_admin_auth";
const STAFF_COOKIE = "arc_staff_auth";
const TENANT_COOKIE = "tenant_slug";
const DEFAULT_PASSWORD = "admin2026";

/* Sprint 7b — Multi-tenant : default fallback slug. Tant qu'aucune URL ne
 * commence par /r/{slug}/ et qu'aucun cookie tenant_slug n'est posé, on
 * cible le tenant historique Arc-en-Ciel. Ça garantit la compat 100%. */
const DEFAULT_TENANT_SLUG = "arc-en-ciel";

/**
 * Résout le slug du tenant pour cette requête, dans cet ordre :
 *   1. Préfixe URL `/r/{slug}/...` (futur — pas encore actif sur le code)
 *   2. Cookie `tenant_slug` (posé après login d'un super-admin)
 *   3. Fallback `arc-en-ciel`
 *
 * Renvoie aussi le `pathnameWithoutSlug` qui retire le préfixe `/r/{slug}`
 * de l'URL pour que le routing Next continue de matcher les routes existantes.
 */
function resolveTenantFromRequest(
  request: NextRequest
): { slug: string; pathnameWithoutSlug: string } {
  const { pathname } = request.nextUrl;

  /* 1. Préfixe URL `/r/{slug}/...` */
  const tenantPathMatch = pathname.match(/^\/r\/([a-z0-9-]+)(\/.*)?$/);
  if (tenantPathMatch) {
    const slug = tenantPathMatch[1];
    const rest = tenantPathMatch[2] || "/";
    return { slug, pathnameWithoutSlug: rest };
  }

  /* 2. Cookie tenant_slug */
  const cookieSlug = request.cookies.get(TENANT_COOKIE)?.value;
  if (cookieSlug && /^[a-z0-9-]+$/.test(cookieSlug)) {
    return { slug: cookieSlug, pathnameWithoutSlug: pathname };
  }

  /* 3. Fallback */
  return { slug: DEFAULT_TENANT_SLUG, pathnameWithoutSlug: pathname };
}

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

/**
 * Admin-only API paths. Anything matching here requires the admin cookie.
 * Public endpoints (POST /api/reservations, POST /api/waiter) are NOT listed.
 */
function isProtectedAdminApi(pathname: string, method: string): boolean {
  // Webhook endpoint is PUBLIC — auth is handled by token header inside the route.
  if (pathname === "/api/reservations/webhook") return false;

  // Loyalty public routes: enrollment + public card view
  if (pathname === "/api/loyalty/enroll" && method === "POST") return false;
  if (pathname.startsWith("/api/loyalty/card/") && method === "GET") return false;

  // Leads public endpoint: POST /api/leads is the landing /pro form submission.
  if (pathname === "/api/leads" && method === "POST") return false;

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
  if (pathname.startsWith("/api/admin/")) return true;

  return false;
}

/**
 * Any /api/staff/* path (other than /api/staff/auth) requires the staff cookie.
 * /api/kitchen/* (KDS) shares the same staff cookie — a chef logs in with a PIN
 * on /staff/login exactly like a server.
 */
function isProtectedStaffApi(pathname: string): boolean {
  if (pathname.startsWith("/api/staff/auth")) return false;
  if (pathname.startsWith("/api/staff/")) return true;
  if (pathname.startsWith("/api/kitchen/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  /* ─── Sprint 7b : résolution du tenant ────────────────────
   * On ajoute le slug en header pour que tenant.ts puisse le lire.
   * Cette logique est 100% backward-compatible : sans cookie ni URL
   * /r/{slug}, on tombe sur "arc-en-ciel" et tout marche comme avant. */
  const { slug: tenantSlug, pathnameWithoutSlug } = resolveTenantFromRequest(request);

  /* On clone les headers pour pouvoir injecter X-Tenant-Slug. */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);

  /* Helper pour produire un NextResponse.next() avec les headers tenant. */
  const passThrough = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  /* Si l'URL commence par /r/{slug}/, on rewrite vers le path sans préfixe.
   * L'app continue de fonctionner avec les routes existantes (/admin, /staff, etc.)
   * mais le tenant slug est maintenant en header. */
  if (pathname !== pathnameWithoutSlug) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = pathnameWithoutSlug;
    return NextResponse.rewrite(rewritten, {
      request: { headers: requestHeaders },
    });
  }

  /* ─── Always-public endpoints ─────────────────────────── */
  // Login pages (otherwise we redirect ourselves into a loop).
  if (pathname === "/admin/login") return passThrough();
  if (pathname === "/staff/login") return passThrough();

  // Auth APIs are always public (that's how you log in / log out).
  if (pathname.startsWith("/api/admin/auth")) return passThrough();
  if (pathname.startsWith("/api/staff/auth")) return passThrough();

  // Mobile / QR-menu public API (customer submits their cart from /m/carte).
  // Has its own IP rate limiting inside the route handler.
  if (pathname.startsWith("/api/m/")) return passThrough();

  /* Sprint 7b QW#10 — Vapi.ai webhooks (téléphonie IA). Sécurisé par
   * HMAC signature dans chaque route, pas besoin de cookie auth. */
  if (pathname.startsWith("/api/telephony/vapi/")) return passThrough();

  /* ─── Cookie lookups ──────────────────────────────────── */
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const adminAuthed =
    adminCookie !== undefined && adminCookie === getExpectedPassword();

  const staffCookie = request.cookies.get(STAFF_COOKIE)?.value;
  const staffAuthed = Boolean(staffCookie);

  /* ─── Admin pages ─────────────────────────────────────── */
  if (pathname.startsWith("/admin")) {
    if (adminAuthed) return passThrough();
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  /* ─── Staff (POS) pages ───────────────────────────────── */
  if (pathname.startsWith("/staff")) {
    if (staffAuthed) return passThrough();
    const loginUrl = new URL("/staff/login", request.url);
    if (pathname !== "/staff") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  /* ─── Kitchen display (KDS) pages ─────────────────────── */
  // Shares the staff cookie — the chef logs in on /staff/login with a PIN.
  if (pathname === "/kitchen" || pathname.startsWith("/kitchen/")) {
    if (staffAuthed) return passThrough();
    const loginUrl = new URL("/staff/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* ─── Protected API routes ────────────────────────────── */
  if (isProtectedStaffApi(pathname)) {
    if (staffAuthed) return passThrough();
    return NextResponse.json(
      { error: "Unauthorized — staff session required" },
      { status: 401 }
    );
  }

  if (isProtectedAdminApi(pathname, method)) {
    if (adminAuthed) return passThrough();
    return NextResponse.json(
      { error: "Unauthorized — admin session required" },
      { status: 401 }
    );
  }

  return passThrough();
}

/**
 * Match /admin/*, /staff/*, and /api/*. We filter inside the function above
 * because the public parts of /api depend on the HTTP method, which matchers
 * can't express cleanly.
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/kitchen",
    "/kitchen/:path*",
    "/api/:path*",
    /* Sprint 7b : tenant-prefixed URLs (futur). Le proxy rewrite vers
     * la route sans préfixe + injecte X-Tenant-Slug. */
    "/r/:slug/:path*",
    /* QR menu public (besoin du tenant pour charger le bon menu) */
    "/m/:path*",
  ],
};
