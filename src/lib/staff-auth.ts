/**
 * Staff auth — cookie utilities shared by `/api/staff/*` route handlers and
 * the `proxy` file. The cookie is NOT signed (demo-grade); hardening comes
 * later when we wire a real session store.
 *
 * Name:   arc_staff_auth
 * Value:  the staff member's `id` (UUID / "demo-…" string)
 * Age:    7 days, httpOnly, sameSite=lax, secure in prod.
 *
 * Sprint 7b QW#9 — getCurrentStaff() résout le staff connecté côté serveur
 * pour les API routes qui veulent appliquer des permissions par rôle.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStaffById } from "@/lib/db/pos-client";
import type { StaffMember } from "@/lib/db/pos-types";
import {
  assertPermission,
  PermissionDeniedError,
  type Permission,
  type StaffRole,
} from "@/lib/auth/roles";

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

/**
 * Cache léger en mémoire pour ne pas hammer la DB à chaque API call.
 * 30s TTL — la session staff change rarement pendant un service.
 */
const staffCache = new Map<
  string,
  { staff: StaffMember; expires: number }
>();
const STAFF_CACHE_TTL_MS = 30_000;

/**
 * Récupère le staff actuellement connecté (à partir du cookie).
 * Renvoie null si pas connecté ou si le cookie pointe vers un staff
 * inactif/inexistant.
 *
 * À utiliser dans les API routes :
 *   const staff = await getCurrentStaff();
 *   if (!staff) return 401;
 */
export async function getCurrentStaff(): Promise<StaffMember | null> {
  let staffId: string | undefined;
  try {
    const c = await cookies();
    staffId = c.get(STAFF_COOKIE)?.value;
  } catch {
    return null;
  }

  if (!staffId) return null;

  /* Special-case les staff demo pour ne pas hit la DB inutilement */
  if (staffId.startsWith("demo-")) {
    return resolveDemoStaff(staffId);
  }

  /* Cache hit ? */
  const cached = staffCache.get(staffId);
  if (cached && cached.expires > Date.now()) {
    return cached.staff;
  }

  try {
    const staff = await getStaffById(staffId);
    if (!staff || !staff.active) {
      staffCache.delete(staffId);
      return null;
    }
    staffCache.set(staffId, {
      staff,
      expires: Date.now() + STAFF_CACHE_TTL_MS,
    });
    return staff;
  } catch {
    return null;
  }
}

/**
 * Helper raccourci : ne renvoie que le rôle (typé) du staff connecté.
 */
export async function getCurrentStaffRole(): Promise<StaffRole | null> {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  if (
    staff.role === "manager" ||
    staff.role === "server" ||
    staff.role === "chef"
  ) {
    return staff.role;
  }
  return null;
}

/**
 * Garde une API route — throw PermissionDeniedError si le staff n'a pas la perm.
 *
 * Usage dans une route :
 *   try {
 *     await requirePermission("order.cancel");
 *     // ... logique
 *   } catch (e) {
 *     if (e instanceof PermissionDeniedError) return 403;
 *   }
 */
export async function requirePermission(
  permission: Permission
): Promise<StaffMember> {
  const staff = await getCurrentStaff();
  const role: StaffRole | null =
    staff &&
    (staff.role === "manager" ||
      staff.role === "server" ||
      staff.role === "chef")
      ? staff.role
      : null;
  assertPermission(role, permission);
  if (!staff) {
    /* assertPermission devrait déjà avoir throw mais TS perd le suivi */
    throw new PermissionDeniedError(null, permission);
  }
  return staff;
}

/**
 * Helper : invalide le cache pour un staff donné (utile après update).
 */
export function invalidateStaffCache(staffId?: string): void {
  if (staffId) staffCache.delete(staffId);
  else staffCache.clear();
}

/**
 * Demo fallback — résout les 3 staffs hardcodés du mode demo.
 * Garde la cohérence avec findStaffByPin() dans pos-client.
 */
function resolveDemoStaff(id: string): StaffMember | null {
  const now = new Date().toISOString();
  if (id === "demo-manager")
    return {
      id,
      name: "Kevin",
      pin_code: "1234",
      role: "manager",
      color: "#C0392B",
      active: true,
      created_at: now,
    };
  if (id === "demo-server")
    return {
      id,
      name: "Sophie",
      pin_code: "2024",
      role: "server",
      color: "#B8922F",
      active: true,
      created_at: now,
    };
  if (id === "demo-chef")
    return {
      id,
      name: "Chef Luca",
      pin_code: "9999",
      role: "chef",
      color: "#8B6914",
      active: true,
      created_at: now,
    };
  return null;
}
