/**
 * AUTH GUARDS — helpers serveur pour gate les API routes par permission.
 *
 * Sprint 7b QW#9.
 *
 * Usage :
 *
 *   import { withPermission } from "@/lib/auth/guards";
 *
 *   export async function POST(req, ctx) {
 *     const guard = await withPermission("order.cancel");
 *     if (!guard.ok) return guard.response;
 *     const staff = guard.staff;  // typé StaffMember
 *
 *     // ... logique métier, on peut utiliser staff.id pour audit
 *   }
 *
 * Le helper retourne soit { ok: true, staff } soit { ok: false, response }
 * — pas d'exception throw, on évite les try/catch qui pollueraient les
 * routes.
 */

import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/staff-auth";
import {
  hasPermission,
  isValidRole,
  type Permission,
  type StaffRole,
} from "./roles";
import type { StaffMember } from "@/lib/db/pos-types";

type GuardSuccess = {
  ok: true;
  staff: StaffMember;
  role: StaffRole;
};

type GuardFailure = {
  ok: false;
  response: NextResponse;
};

export type GuardResult = GuardSuccess | GuardFailure;

/**
 * Vérifie que le staff connecté a la permission donnée.
 * Renvoie soit la session staff, soit une NextResponse 401/403 prête à
 * être returned par la route.
 */
export async function withPermission(
  permission: Permission
): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Non authentifié", code: "unauthenticated" },
        { status: 401 }
      ),
    };
  }
  const role: StaffRole | null = isValidRole(staff.role) ? staff.role : null;
  if (!role || !hasPermission(role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Action réservée — votre rôle (${role ?? "?"}) ne permet pas '${permission}'.`,
          code: "permission_denied",
          required_permission: permission,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, staff, role };
}

/**
 * Vérifie qu'au moins UNE des permissions est accordée.
 */
export async function withAnyPermission(
  permissions: Permission[]
): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Non authentifié", code: "unauthenticated" },
        { status: 401 }
      ),
    };
  }
  const role: StaffRole | null = isValidRole(staff.role) ? staff.role : null;
  const ok = role && permissions.some((p) => hasPermission(role, p));
  if (!ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Action réservée — votre rôle (${role ?? "?"}) n'a aucune des permissions requises.`,
          code: "permission_denied",
          required_any_of: permissions,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, staff, role: role! };
}
