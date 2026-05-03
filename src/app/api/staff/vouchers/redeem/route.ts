/**
 * POST /api/staff/vouchers/redeem
 * Body: { voucher_code: string, order_id: string, amount_cents: number,
 *         redeemed_by_staff_id?: string }
 *
 * Utilise un avoir sur une commande (paiement type "Avoir" en POS).
 * Crée une row voucher_redemptions, décrémente remaining_cents, marque
 * redeemed si 100% utilisé.
 *
 * Protégé par cookie staff.
 */

import { NextRequest, NextResponse } from "next/server";
import { redeemVoucher, VoucherRedemptionError } from "@/lib/db/vouchers-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    voucher_code?: string;
    order_id?: string;
    amount_cents?: number;
    redeemed_by_staff_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const code = (body.voucher_code || "").trim();
  const orderId = (body.order_id || "").trim();
  const amount = Number(body.amount_cents);

  if (!code) {
    return NextResponse.json(
      { error: "voucher_code requis" },
      { status: 400 }
    );
  }
  if (!orderId) {
    return NextResponse.json({ error: "order_id requis" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount_cents invalide (> 0)" },
      { status: 400 }
    );
  }

  try {
    const result = await redeemVoucher({
      voucher_code: code,
      order_id: orderId,
      amount_cents: Math.round(amount),
      redeemed_by_staff_id: body.redeemed_by_staff_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VoucherRedemptionError) {
      const status =
        err.code === "not_found"
          ? 404
          : err.code === "amount_too_high"
            ? 400
            : 409;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status }
      );
    }
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
