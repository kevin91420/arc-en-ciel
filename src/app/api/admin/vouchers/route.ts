/**
 * GET  /api/admin/vouchers           — liste les avoirs (filtre status)
 * POST /api/admin/vouchers           — crée un avoir manuellement
 *
 * Protégé par cookie admin (cf. proxy).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createVoucher,
  listVouchers,
  markExpiredVouchers,
} from "@/lib/db/vouchers-client";
import type {
  CreateVoucherPayload,
  VoucherStatus,
} from "@/lib/db/vouchers-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as VoucherStatus | null;
  const customerId = url.searchParams.get("customer_id");

  try {
    /* Auto-mark expired avant chaque list */
    await markExpiredVouchers().catch(() => 0);
    const rows = await listVouchers({
      status: status || undefined,
      customerId: customerId || undefined,
      limit: 500,
    });
    return NextResponse.json({ vouchers: rows, count: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<CreateVoucherPayload>;
  try {
    body = (await req.json()) as Partial<CreateVoucherPayload>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  /* Validation */
  const amount = Number(body.amount_cents);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Montant invalide (en cents, > 0)" },
      { status: 400 }
    );
  }
  if (
    !body.customer_name &&
    !body.customer_email &&
    !body.customer_id
  ) {
    return NextResponse.json(
      { error: "Un avoir doit être nominatif (nom OU email du client)." },
      { status: 400 }
    );
  }

  try {
    const created = await createVoucher({
      customer_name: body.customer_name?.trim() || undefined,
      customer_email: body.customer_email?.trim().toLowerCase() || undefined,
      customer_phone: body.customer_phone?.trim() || undefined,
      customer_id: body.customer_id,
      amount_cents: Math.round(amount),
      reason: body.reason?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      expires_at: body.expires_at,
      created_by_staff_id: body.created_by_staff_id,
      source_order_id: body.source_order_id,
      source_cancellation_id: body.source_cancellation_id,
    });
    return NextResponse.json({ voucher: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
