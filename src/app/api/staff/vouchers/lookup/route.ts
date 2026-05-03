/**
 * GET /api/staff/vouchers/lookup?code=AVR-XXXX
 *
 * Cherche un avoir par son code dans le tenant courant. Utilisé par le POS
 * au moment de l'encaissement quand un client présente son avoir.
 *
 * Renvoie 404 si introuvable, sinon le voucher avec son statut.
 *
 * Protégé par cookie staff.
 */

import { NextRequest, NextResponse } from "next/server";
import { findVoucherByCode } from "@/lib/db/vouchers-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || code.trim().length < 3) {
    return NextResponse.json(
      { error: "code requis (min 3 chars)" },
      { status: 400 }
    );
  }
  try {
    const voucher = await findVoucherByCode(code.trim());
    if (!voucher) {
      return NextResponse.json(
        { error: "Avoir introuvable" },
        { status: 404 }
      );
    }
    /* Ne renvoie pas les notes internes au staff de service. */
    const { notes: _notes, ...publicView } = voucher;
    void _notes;
    return NextResponse.json({ voucher: publicView });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
