"use client";

/**
 * PERM GATE — composant wrapper qui affiche conditionnellement son enfant
 * selon le rôle / les permissions du staff connecté.
 *
 * Sprint 7b QW#9 — permissions multi-niveaux.
 *
 * Usage :
 *   <PermGate perm="order.cancel">
 *     <button>Annuler</button>
 *   </PermGate>
 *
 *   <PermGate role="manager" fallback={<span>Manager only</span>}>
 *     <RestrictedSection />
 *   </PermGate>
 *
 *   <PermGate anyOf={["order.cancel", "order.refund"]}>
 *     <button>Action manager</button>
 *   </PermGate>
 *
 * Comportement par défaut pendant le chargement : on N'AFFICHE PAS le
 * contenu (caché). Évite un flash "bouton annuler visible" pour un
 * serveur qui aurait juste à le cliquer le temps que /me résolve.
 */

import { useCurrentStaff } from "@/lib/hooks/useCurrentStaff";
import type { Permission, StaffRole } from "@/lib/auth/roles";

type PermGateProps = {
  children: React.ReactNode;
  /** Si fourni, affiche le contenu si le staff a CETTE permission. */
  perm?: Permission;
  /** Si fourni, affiche le contenu si le staff a AU MOINS UNE permission de la liste. */
  anyOf?: Permission[];
  /** Si fourni, affiche le contenu si le staff a TOUTES les permissions. */
  allOf?: Permission[];
  /** Si fourni, affiche le contenu uniquement pour ce rôle exact. */
  role?: StaffRole;
  /** Si fourni, affiche le contenu pour un de ces rôles. */
  anyRole?: StaffRole[];
  /** Optionnel : ce qui s'affiche si l'accès est refusé. Default = null. */
  fallback?: React.ReactNode;
  /** Optionnel : afficher pendant le loading initial. Default = null (caché). */
  loadingFallback?: React.ReactNode;
};

export default function PermGate({
  children,
  perm,
  anyOf,
  allOf,
  role,
  anyRole,
  fallback = null,
  loadingFallback = null,
}: PermGateProps) {
  const { staff, hasPerm, loading } = useCurrentStaff();

  if (loading) return <>{loadingFallback}</>;

  let allowed = true;

  if (perm) {
    allowed = allowed && hasPerm(perm);
  }
  if (anyOf && anyOf.length > 0) {
    allowed = allowed && anyOf.some((p) => hasPerm(p));
  }
  if (allOf && allOf.length > 0) {
    allowed = allowed && allOf.every((p) => hasPerm(p));
  }
  if (role) {
    allowed = allowed && staff?.role === role;
  }
  if (anyRole && anyRole.length > 0) {
    allowed = allowed && Boolean(staff?.role && anyRole.includes(staff.role));
  }

  return <>{allowed ? children : fallback}</>;
}
