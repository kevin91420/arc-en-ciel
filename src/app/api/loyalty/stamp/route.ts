/**
 * POST /api/loyalty/stamp — Staff ajoute un tampon (admin-only via proxy)
 * Body: { card_number: string, staff_member?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { addStamp } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const card_number = String(body.card_number || "").trim().toUpperCase();
  const staff_member = body.staff_member
    ? String(body.staff_member).slice(0, 80)
    : undefined;

  if (!card_number) {
    return NextResponse.json(
      { error: "card_number required" },
      { status: 400 }
    );
  }

  try {
    const result = await addStamp(card_number, staff_member);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("not found") ? 404 : 500 }
    );
  }
}
