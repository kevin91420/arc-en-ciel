/**
 * VOUCHERS CLIENT — CRUD + redemption pour les avoirs (Sprint 7b QW#6).
 *
 * Tenant-aware : tous les filtres incluent `restaurant_id`. Pattern aligné
 * sur loyalty-client / pos-client.
 */

import type {
  CreateVoucherPayload,
  RedeemVoucherPayload,
  VoucherRedemptionRow,
  VoucherRow,
  VoucherStats,
  VoucherStatus,
  VoucherWithRedemptions,
} from "./vouchers-types";
import { generateVoucherCode } from "./vouchers-types";
import { getCurrentTenantId } from "./tenant";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!USE_SUPABASE) throw new Error("Supabase not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY!}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function resolveTenantId(explicit?: string): Promise<string> {
  return explicit ?? (await getCurrentTenantId());
}

function tc(tenantId: string): string {
  return `&restaurant_id=eq.${encodeURIComponent(tenantId)}`;
}

/* ═══════════════════════════════════════════════════════════
   READ
   ═══════════════════════════════════════════════════════════ */

export async function listVouchers(
  options: {
    status?: VoucherStatus;
    customerId?: string;
    limit?: number;
    tenantId?: string;
  } = {}
): Promise<VoucherRow[]> {
  if (!USE_SUPABASE) return [];
  const tid = await resolveTenantId(options.tenantId);

  const filters: string[] = [];
  if (options.status) {
    filters.push(`&status=eq.${encodeURIComponent(options.status)}`);
  }
  if (options.customerId) {
    filters.push(`&customer_id=eq.${encodeURIComponent(options.customerId)}`);
  }
  const limitClause = options.limit ? `&limit=${options.limit}` : "";

  return sb<VoucherRow[]>(
    `vouchers?select=*${tc(tid)}${filters.join("")}&order=created_at.desc${limitClause}`
  );
}

/**
 * Récupère un avoir par son code (lookup au moment du redeem).
 * Renvoie null si introuvable, non-actif ou expiré.
 */
export async function findVoucherByCode(
  code: string,
  tenantId?: string
): Promise<VoucherRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) return null;

  const rows = await sb<VoucherRow[]>(
    `vouchers?select=*&code=eq.${encodeURIComponent(trimmedCode)}${tc(tid)}&limit=1`
  );
  return rows[0] ?? null;
}

export async function getVoucherById(
  id: string,
  tenantId?: string
): Promise<VoucherWithRedemptions | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const [voucher] = await sb<VoucherRow[]>(
    `vouchers?select=*&id=eq.${encodeURIComponent(id)}${tc(tid)}&limit=1`
  );
  if (!voucher) return null;

  const redemptions = await sb<VoucherRedemptionRow[]>(
    `voucher_redemptions?select=*&voucher_id=eq.${encodeURIComponent(id)}${tc(tid)}&order=redeemed_at.desc`
  );

  return { ...voucher, redemptions };
}

/* ═══════════════════════════════════════════════════════════
   CREATE
   ═══════════════════════════════════════════════════════════ */

/**
 * Crée un nouvel avoir. Génère un code unique (retry si collision dans le
 * tenant). Pré-remplit expires_at à +12 mois si non fourni.
 */
export async function createVoucher(
  payload: CreateVoucherPayload,
  tenantId?: string
): Promise<VoucherRow> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const tid = await resolveTenantId(tenantId);

  if (payload.amount_cents <= 0) {
    throw new Error("Le montant doit être supérieur à 0.");
  }
  if (!payload.customer_name && !payload.customer_email && !payload.customer_id) {
    throw new Error("Un avoir doit être nominatif (nom OU email du client).");
  }

  /* Génère un code unique — retry max 8x en cas de collision. */
  let code = generateVoucherCode();
  for (let i = 0; i < 8; i++) {
    const existing = await sb<Array<{ id: string }>>(
      `vouchers?select=id&code=eq.${encodeURIComponent(code)}${tc(tid)}&limit=1`
    );
    if (existing.length === 0) break;
    code = generateVoucherCode();
  }

  /* Expiration par défaut : +12 mois (CGV France). */
  const expiresAt =
    payload.expires_at ??
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    restaurant_id: tid,
    code,
    customer_id: payload.customer_id ?? null,
    customer_name: payload.customer_name ?? null,
    customer_email: payload.customer_email ?? null,
    customer_phone: payload.customer_phone ?? null,
    amount_cents: Math.round(payload.amount_cents),
    remaining_cents: Math.round(payload.amount_cents),
    reason: payload.reason ?? null,
    notes: payload.notes ?? null,
    status: "active" as const,
    created_by_staff_id: payload.created_by_staff_id ?? null,
    expires_at: expiresAt,
    source_order_id: payload.source_order_id ?? null,
    source_cancellation_id: payload.source_cancellation_id ?? null,
  };

  const [created] = await sb<VoucherRow[]>("vouchers", {
    method: "POST",
    body: JSON.stringify(row),
  });
  return created;
}

/* ═══════════════════════════════════════════════════════════
   UPDATE — annulation manuelle, marquer expiré
   ═══════════════════════════════════════════════════════════ */

export async function cancelVoucher(
  id: string,
  reason?: string,
  tenantId?: string
): Promise<VoucherRow | null> {
  if (!USE_SUPABASE) return null;
  const tid = await resolveTenantId(tenantId);

  const [updated] = await sb<VoucherRow[]>(
    `vouchers?id=eq.${encodeURIComponent(id)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "cancelled",
        notes: reason
          ? `[Annulé] ${reason}`
          : null,
      }),
    }
  );
  return updated ?? null;
}

/**
 * Marque tous les avoirs actifs dont expires_at est dépassé comme "expired".
 * Idéal en cron job quotidien — pour l'instant on l'appelle au listing.
 */
export async function markExpiredVouchers(tenantId?: string): Promise<number> {
  if (!USE_SUPABASE) return 0;
  const tid = await resolveTenantId(tenantId);
  const nowISO = new Date().toISOString();

  const updated = await sb<VoucherRow[]>(
    `vouchers?status=eq.active&expires_at=lt.${encodeURIComponent(nowISO)}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "expired" }),
    }
  );
  return updated.length;
}

/* ═══════════════════════════════════════════════════════════
   REDEEM — utilisation d'un avoir sur une commande
   ═══════════════════════════════════════════════════════════ */

export class VoucherRedemptionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_found"
      | "not_active"
      | "expired"
      | "exhausted"
      | "amount_too_high"
      | "wrong_tenant"
  ) {
    super(message);
    this.name = "VoucherRedemptionError";
  }
}

export async function redeemVoucher(
  payload: RedeemVoucherPayload,
  tenantId?: string
): Promise<{
  voucher: VoucherRow;
  redemption: VoucherRedemptionRow;
}> {
  if (!USE_SUPABASE) throw new Error("Supabase requis");
  const tid = await resolveTenantId(tenantId);

  const voucher = await findVoucherByCode(payload.voucher_code, tid);
  if (!voucher) {
    throw new VoucherRedemptionError(
      "Avoir introuvable.",
      "not_found"
    );
  }
  if (voucher.status === "cancelled") {
    throw new VoucherRedemptionError(
      "Cet avoir a été annulé.",
      "not_active"
    );
  }
  if (voucher.status === "redeemed") {
    throw new VoucherRedemptionError(
      "Cet avoir a déjà été entièrement utilisé.",
      "exhausted"
    );
  }
  if (
    voucher.expires_at &&
    new Date(voucher.expires_at).getTime() < Date.now()
  ) {
    /* Marque expired si pas déjà fait */
    if (voucher.status === "active") {
      await sb(`vouchers?id=eq.${voucher.id}${tc(tid)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "expired" }),
      }).catch(() => null);
    }
    throw new VoucherRedemptionError(
      `Cet avoir a expiré le ${new Date(voucher.expires_at).toLocaleDateString("fr-FR")}.`,
      "expired"
    );
  }

  const requested = Math.round(payload.amount_cents);
  if (requested <= 0) {
    throw new VoucherRedemptionError(
      "Le montant doit être supérieur à 0.",
      "amount_too_high"
    );
  }
  if (requested > voucher.remaining_cents) {
    throw new VoucherRedemptionError(
      `Solde insuffisant : reste ${(voucher.remaining_cents / 100).toFixed(2)}€ sur l'avoir.`,
      "amount_too_high"
    );
  }

  /* Création de la row redemption + décrément remaining + check status final */
  const newRemaining = voucher.remaining_cents - requested;
  const fullyUsed = newRemaining === 0;

  const [redemption] = await sb<VoucherRedemptionRow[]>(
    "voucher_redemptions",
    {
      method: "POST",
      body: JSON.stringify({
        restaurant_id: tid,
        voucher_id: voucher.id,
        order_id: payload.order_id,
        amount_cents: requested,
        redeemed_by_staff_id: payload.redeemed_by_staff_id ?? null,
      }),
    }
  );

  const [updated] = await sb<VoucherRow[]>(
    `vouchers?id=eq.${voucher.id}${tc(tid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        remaining_cents: newRemaining,
        status: fullyUsed ? "redeemed" : "active",
        redeemed_at: fullyUsed ? new Date().toISOString() : voucher.redeemed_at,
      }),
    }
  );

  return { voucher: updated, redemption };
}

/* ═══════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════ */

export async function getVoucherStats(tenantId?: string): Promise<VoucherStats> {
  if (!USE_SUPABASE) {
    return {
      total_count: 0,
      active_count: 0,
      redeemed_count: 0,
      cancelled_count: 0,
      expired_count: 0,
      total_emitted_cents: 0,
      total_redeemed_cents: 0,
      outstanding_cents: 0,
      expiring_soon_count: 0,
    };
  }

  /* Soft auto-marker des expirés avant le calcul des stats */
  await markExpiredVouchers(tenantId).catch(() => 0);

  const all = await listVouchers({ tenantId, limit: 10_000 });
  const now = Date.now();
  const in30Days = now + 30 * 24 * 60 * 60 * 1000;

  let total_emitted = 0;
  let total_redeemed = 0;
  let outstanding = 0;
  let active = 0;
  let redeemed = 0;
  let cancelled = 0;
  let expired = 0;
  let expiring_soon = 0;

  for (const v of all) {
    total_emitted += v.amount_cents;
    total_redeemed += v.amount_cents - v.remaining_cents;
    if (v.status === "active") {
      active++;
      outstanding += v.remaining_cents;
      if (
        v.expires_at &&
        new Date(v.expires_at).getTime() < in30Days
      ) {
        expiring_soon++;
      }
    } else if (v.status === "redeemed") {
      redeemed++;
    } else if (v.status === "cancelled") {
      cancelled++;
    } else if (v.status === "expired") {
      expired++;
    }
  }

  return {
    total_count: all.length,
    active_count: active,
    redeemed_count: redeemed,
    cancelled_count: cancelled,
    expired_count: expired,
    total_emitted_cents: total_emitted,
    total_redeemed_cents: total_redeemed,
    outstanding_cents: outstanding,
    expiring_soon_count: expiring_soon,
  };
}
