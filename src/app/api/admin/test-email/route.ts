/**
 * POST /api/admin/test-email — Envoie un email de test à l'admin
 * Body: { to?: string }  (défaut: ADMIN_EMAIL)
 */
import { NextRequest, NextResponse } from "next/server";
import { sendReservationEmails } from "@/lib/email/send";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email non configuré. Ajoutez RESEND_API_KEY dans les variables d'environnement Vercel.",
      },
      { status: 503 }
    );
  }

  let to: string | undefined;
  try {
    const body = await req.json();
    to = body?.to ? String(body.to).trim() : undefined;
  } catch {
    /* No body — use default admin email */
  }

  const emailCfg = getEmailConfig();
  const recipient = to || emailCfg.admin;

  /* Build a fake reservation to trigger the template */
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const fakeReservation = {
    id: "TEST-" + now.getTime(),
    customer_id: null,
    customer_name: "Test Arc-en-Ciel",
    customer_email: recipient,
    customer_phone: "01 64 54 00 30",
    date: tomorrow.toISOString().split("T")[0],
    time: "20:00",
    guests: 4,
    table_number: null,
    status: "pending" as const,
    source: "website" as const,
    external_id: null,
    notes: "Ceci est un email de test envoyé depuis /admin/parametres",
    special_occasion: "Test système",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const results = await sendReservationEmails(fakeReservation);

  return NextResponse.json({
    ok: true,
    recipient,
    from: emailCfg.from,
    results,
  });
}
