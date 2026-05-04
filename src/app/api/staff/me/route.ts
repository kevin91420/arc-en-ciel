/**
 * GET /api/staff/me — Renvoie le staff connecté + son rôle + la liste de
 * ses permissions (pour que le client puisse cacher/afficher des éléments).
 *
 * Renvoie 401 si pas connecté.
 *
 * Note : ce endpoint est exempté du proxy guard (auth path) car il sert
 * justement à vérifier l'auth depuis le client. Mais en pratique notre proxy
 * gate /api/staff/* SAUF /api/staff/auth, donc /api/staff/me passe par le
 * gate. C'est OK : le getCurrentStaff() renverra null si pas authentifié et
 * on renvoie 401 proprement.
 */

import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/staff-auth";
import { listPermissions, isValidRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401 }
    );
  }

  const role = isValidRole(staff.role) ? staff.role : null;
  const permissions = role ? listPermissions(role) : [];

  /* Vue publique sans le PIN code (sécurité). */
  return NextResponse.json({
    staff: {
      id: staff.id,
      name: staff.name,
      role,
      color: staff.color,
    },
    permissions,
  });
}
