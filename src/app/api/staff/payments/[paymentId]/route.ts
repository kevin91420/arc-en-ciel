/**
 * DELETE /api/staff/payments/[paymentId] — undo a payment row.
 *
 * Useful when the server taps the wrong "Encaisser" button. The Supabase
 * trigger automatically reverts orders.status to 'served' if the deletion
 * brings the cumulative paid amount below the order total.
 */

import { NextRequest, NextResponse } from "next/server";
import { deletePayment } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId requis" }, { status: 400 });
  }
  try {
    await deletePayment(paymentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible d'annuler le paiement : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
