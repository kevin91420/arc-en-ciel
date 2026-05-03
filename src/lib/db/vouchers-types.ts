/**
 * VOUCHERS TYPES — Système d'avoirs client (Sprint 7b QW#6).
 *
 * Un avoir = crédit nominatif remis par le restaurateur à un client
 * (geste commercial sans décaissement). Utilisable lors d'une prochaine
 * visite. Code court QR-able. Expiration légale 12 mois.
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Proposer un avoir pour la prochaine venue du client si pas content".
 */

export type VoucherStatus =
  | "active"      // peut être utilisé
  | "redeemed"    // entièrement consommé (remaining_cents = 0)
  | "expired"     // expires_at dépassé sans utilisation
  | "cancelled";  // annulé manuellement par le manager

/**
 * Row DB d'un avoir.
 */
export interface VoucherRow {
  id: string;                       // UUID
  restaurant_id: string;            // tenant
  code: string;                     // ex "AVR-X7Y2"

  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  amount_cents: number;             // montant initial
  remaining_cents: number;          // solde restant

  reason: string | null;
  notes: string | null;

  status: VoucherStatus;

  created_by_staff_id: string | null;
  created_at: string;               // ISO
  updated_at: string;               // ISO
  expires_at: string | null;        // ISO

  redeemed_at: string | null;       // ISO — date de la dernière utilisation totale

  source_order_id: string | null;
  source_cancellation_id: string | null;
}

/**
 * Row d'utilisation (partielle ou totale) d'un avoir sur une commande.
 */
export interface VoucherRedemptionRow {
  id: string;
  restaurant_id: string;
  voucher_id: string;
  order_id: string;
  amount_cents: number;             // montant utilisé sur cette commande
  redeemed_by_staff_id: string | null;
  redeemed_at: string;              // ISO
}

/**
 * Vue enrichie d'un avoir (avec ses redemptions).
 */
export interface VoucherWithRedemptions extends VoucherRow {
  redemptions: VoucherRedemptionRow[];
}

/**
 * Payload de création d'un avoir.
 */
export interface CreateVoucherPayload {
  /* Au moins l'un des deux : nom OU email pour identifier le client */
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;

  amount_cents: number;
  reason?: string;
  notes?: string;
  expires_at?: string;              // ISO — par défaut +12 mois

  /* Audit — d'où vient l'avoir */
  created_by_staff_id?: string;
  source_order_id?: string;
  source_cancellation_id?: string;
}

/**
 * Payload pour utiliser un avoir sur une commande.
 */
export interface RedeemVoucherPayload {
  voucher_code: string;             // code court ou UUID
  order_id: string;
  amount_cents: number;             // montant à utiliser (≤ remaining_cents)
  redeemed_by_staff_id?: string;
}

/**
 * Stats globales sur les avoirs (page /admin/avoirs).
 */
export interface VoucherStats {
  total_count: number;
  active_count: number;
  redeemed_count: number;
  cancelled_count: number;
  expired_count: number;

  /* Montants en cents */
  total_emitted_cents: number;      // somme amount_cents
  total_redeemed_cents: number;     // somme amount_cents - remaining_cents
  outstanding_cents: number;        // somme remaining_cents des active
  expiring_soon_count: number;      // active expirant dans les 30j
}

/**
 * Génère un code voucher humainement lisible (8 chars max).
 * Format : "AVR-XXXX" où XXXX évite les caractères ambigus (0/O, 1/I).
 */
export function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AVR-${code}`;
}
