/**
 * POST /api/loyalty/enroll — Inscription publique au programme fidélité
 * Body: { customer_name, customer_phone, customer_email? }
 * Returns: { card_number } pour redirect vers /fidelite/carte/[number]
 */
import { NextRequest, NextResponse } from "next/server";
import { enrollCustomer } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customer_name = String(body.customer_name || "").trim();
  const customer_phone = String(body.customer_phone || "").trim();
  const customer_email = body.customer_email
    ? String(body.customer_email).trim()
    : undefined;

  if (customer_name.length < 2) {
    return NextResponse.json(
      { error: "Nom trop court" },
      { status: 400 }
    );
  }
  if (!/^[+]?[\d\s().-]{6,20}$/.test(customer_phone)) {
    return NextResponse.json(
      { error: "Numéro de téléphone invalide" },
      { status: 400 }
    );
  }
  if (
    customer_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)
  ) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  try {
    const card = await enrollCustomer({
      customer_name,
      customer_phone,
      customer_email,
    });
    return NextResponse.json(
      {
        success: true,
        card_number: card.card_number,
        card_id: card.id,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
