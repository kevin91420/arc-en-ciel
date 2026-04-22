/**
 * GET /api/loyalty/card/[number] — Lecture publique d'une carte
 * Retourne carte + config active pour l'affichage PWA
 */
import { NextResponse } from "next/server";
import { getCardByNumber, getConfig } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  if (!number || !/^[A-Z0-9-]{3,20}$/.test(number)) {
    return NextResponse.json(
      { error: "Invalid card number" },
      { status: 400 }
    );
  }

  try {
    const card = await getCardByNumber(number);
    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    const config = await getConfig();
    return NextResponse.json({ card, config });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
