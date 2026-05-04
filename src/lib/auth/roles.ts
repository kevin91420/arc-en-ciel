/**
 * AUTH ROLES — Sprint 7b QW#9 : permissions multi-niveaux.
 *
 * 3 rôles : manager / server / chef.
 *
 * Chaque rôle a une matrice de permissions. Un utilisateur peut effectuer
 * une action si son rôle inclut la permission correspondante.
 *
 * Demandé par retour terrain (boulangerie patronne d'Angelo) :
 * "Avoir un code de sécurité superviseur et serveur, avec des options
 * différentes selon le rôle".
 *
 * Architecture :
 *   - Matrice statique ROLE_PERMISSIONS (single source of truth)
 *   - Côté serveur : `requirePermission(req, perm)` dans les API routes
 *   - Côté client : <PermGate perm="..."> + useHasPermission()
 *
 * Les 3 rôles correspondent aux 3 PINs demo (1234 manager, 2024 serveur,
 * 9999 chef). À termes les patrons définiront leurs propres staff dans
 * /admin/staff.
 */

import type { StaffMember } from "@/lib/db/pos-types";

export type StaffRole = "manager" | "server" | "chef";

/**
 * Toutes les permissions du système, en clés stables.
 * Convention : `<domain>.<action>` ou `<domain>.<sub_domain>.<action>`.
 */
export type Permission =
  /* ─── Commandes ─── */
  | "order.create"            // créer une nouvelle commande
  | "order.edit"              // ajouter/modifier des items
  | "order.fire"              // lancer en cuisine (fire-course)
  | "order.cancel"            // annuler une commande
  | "order.refund"            // rembourser
  | "order.discount.apply"    // appliquer une remise commerciale
  | "order.discount.remove"   // retirer une remise (manager seul)

  /* ─── Paiement ─── */
  | "payment.pay"             // encaisser
  | "payment.split"           // split par couverts/items
  | "payment.delete"          // supprimer un paiement enregistré

  /* ─── Avoirs ─── */
  | "voucher.create"          // créer un nouvel avoir
  | "voucher.cancel"          // annuler un avoir actif
  | "voucher.redeem"          // utiliser un avoir au paiement
  | "voucher.list"            // voir la console avoirs

  /* ─── Caisse ─── */
  | "cash.open"               // ouvrir une session
  | "cash.close"              // fermer une session
  | "cash.view"               // voir la caisse en cours

  /* ─── Cuisine (KDS) ─── */
  | "kds.view"                // accéder au KDS
  | "kds.mark_ready"          // marquer un item ready
  | "kds.mark_served"         // marquer un item servi (côté serveur)

  /* ─── Stats / reports ─── */
  | "stats.view_self"         // ses propres stats serveur
  | "stats.view_all"          // tous les stats équipe
  | "stats.z_report"          // accéder au Z fin de service
  | "stats.accounting"        // accéder à la Comptabilité (CA mens/ann)

  /* ─── Menu / catalogue ─── */
  | "menu.view"               // voir la carte
  | "menu.edit"               // éditer carte/items/combos
  | "menu.eighty_six"         // marquer/démarquer un plat en rupture

  /* ─── Personnel ─── */
  | "staff.view"              // voir la liste des staff
  | "staff.manage"            // créer/éditer/désactiver staff

  /* ─── Settings ─── */
  | "settings.view"           // voir les paramètres
  | "settings.edit"           // modifier les paramètres
  | "settings.legal"          // éditer SIRET/NAF/TVA (URSSAF-sensitive)

  /* ─── Réservations ─── */
  | "reservations.view"       // voir les résa
  | "reservations.manage"     // créer/éditer/annuler résa

  /* ─── Fidélité ─── */
  | "loyalty.stamp"           // donner un tampon (PIN scanner)
  | "loyalty.view_cards"      // voir la liste des cartes
  | "loyalty.config"          // éditer la config fidélité
  | "loyalty.birthdays"       // accéder à la page anniversaires

  /* ─── Console super-admin SaaS ─── */
  | "saas.manage_tenants";    // /admin/restaurants — uniquement super-admin

/**
 * Permissions communes à tout staff actif (utilisable par tous, sans rôle requis).
 * Garde minimum lock-in pour ne pas exclure les serveurs des actions de base.
 */
const SHARED_BASE: Permission[] = [
  "order.create",
  "order.edit",
  "order.fire",
  "payment.pay",
  "payment.split",
  "cash.view",
  "kds.view",
  "kds.mark_served",
  "menu.view",
  "stats.view_self",
  "loyalty.stamp",
  "voucher.redeem",
  "reservations.view",
];

/**
 * Permission matrix — single source of truth.
 *
 * Le manager a TOUT. Le serveur a les actions opérationnelles courantes.
 * Le chef a UNIQUEMENT le KDS (plus une vue read-only de la carte).
 */
const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  manager: new Set<Permission>([
    ...SHARED_BASE,
    /* Pouvoirs financiers — manager seul */
    "order.cancel",
    "order.refund",
    "order.discount.apply",
    "order.discount.remove",
    "payment.delete",
    /* Caisse */
    "cash.open",
    "cash.close",
    /* Avoirs */
    "voucher.create",
    "voucher.cancel",
    "voucher.list",
    /* Stats avancées */
    "stats.view_all",
    "stats.z_report",
    "stats.accounting",
    /* Menu */
    "menu.edit",
    "menu.eighty_six",
    /* Personnel + settings */
    "staff.view",
    "staff.manage",
    "settings.view",
    "settings.edit",
    "settings.legal",
    /* Réservations */
    "reservations.manage",
    /* Fidélité */
    "loyalty.view_cards",
    "loyalty.config",
    "loyalty.birthdays",
    /* KDS */
    "kds.mark_ready",
    /* Note : 'saas.manage_tenants' est gated séparément par cookie admin
     * (pas par rôle staff) — voir proxy.ts. */
  ]),

  server: new Set<Permission>([
    ...SHARED_BASE,
    /* Le serveur peut gérer la caisse pour son service */
    "cash.open",
    "cash.close",
    /* Le serveur peut appliquer une remise mais pas en retirer (audit) */
    "order.discount.apply",
    /* Voir la liste des avoirs (pour vérifier validité) — pas créer */
    "voucher.list",
    /* Marquer un plat en rupture (gestion du stock courant) */
    "menu.eighty_six",
    /* Réservations : peut gérer (passe les commandes liées) */
    "reservations.manage",
    /* Fidélité : voir les cartes pour scanner */
    "loyalty.view_cards",
  ]),

  chef: new Set<Permission>([
    /* Cuisine : KDS only */
    "kds.view",
    "kds.mark_ready",
    /* Voir la carte (read-only) pour vérifier les recettes */
    "menu.view",
    /* Marquer un plat en rupture (le chef sait quand il n'a plus de stock) */
    "menu.eighty_six",
  ]),
};

/**
 * Vérifie si un rôle a une permission donnée.
 */
export function hasPermission(
  role: StaffRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Vérifie qu'un staff a une permission, sinon throw.
 * Utilisé dans les API routes pour gate les endpoints sensibles.
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly role: StaffRole | null,
    public readonly permission: Permission
  ) {
    super(
      `Permission refusée : '${permission}' nécessite un rôle plus élevé (rôle actuel : ${role ?? "anonyme"}).`
    );
    this.name = "PermissionDeniedError";
  }
}

export function assertPermission(
  role: StaffRole | null | undefined,
  permission: Permission
): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(role ?? null, permission);
  }
}

/**
 * Liste les permissions accordées à un rôle (utile pour debug + UI).
 */
export function listPermissions(role: StaffRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? new Set())];
}

/**
 * Métadonnées des rôles pour l'UI (badge, libellé, ordre d'affichage).
 */
export const ROLE_META: Record<
  StaffRole,
  { label: string; icon: string; description: string; tone: string }
> = {
  manager: {
    label: "Manager",
    icon: "👔",
    description: "Accès complet : caisse, comptabilité, settings, staff.",
    tone: "bg-brown text-cream",
  },
  server: {
    label: "Serveur",
    icon: "🍽",
    description: "Prise de commandes, encaissement, vue de ses propres stats.",
    tone: "bg-gold/20 text-brown",
  },
  chef: {
    label: "Cuisinier",
    icon: "👨‍🍳",
    description: "Accès KDS uniquement, marquage prêt + rupture stock.",
    tone: "bg-amber-100 text-amber-900",
  },
};

/**
 * Type guard pour vérifier qu'un string est bien un StaffRole.
 */
export function isValidRole(s: unknown): s is StaffRole {
  return s === "manager" || s === "server" || s === "chef";
}

/**
 * Helper : extrait le rôle depuis un StaffMember (avec validation).
 */
export function getStaffRole(staff: StaffMember | null | undefined): StaffRole | null {
  if (!staff) return null;
  return isValidRole(staff.role) ? staff.role : null;
}
