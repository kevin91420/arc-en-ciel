/**
 * GET    /api/admin/vouchers/[id]    — détail + redemptions
 * DELETE /api/admin/vouchers/[id]    — annule l'avoir (status = cancelled)
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelVoucher, getVoucherById } from "@/lib/db/vouchers-client";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const voucher = await getVoucherById(id);
    if (!voucher) {
      return NextResponse.json(
        { error: "Avoir introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ voucher });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const reason = url.searchParams.get("reason") || undefined;
  try {
    const voucher = await cancelVoucher(id, reason);
    if (!voucher) {
      return NextResponse.json(
        { error: "Avoir introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ voucher });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
