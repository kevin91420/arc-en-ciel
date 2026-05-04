/**
 * POST /api/telephony/vapi/tools/restaurant-info
 *
 * Tool Vapi : renvoie les infos statiques du resto (nom, adresse, horaires,
 * tel, mail, allergies). L'IA appelle ça quand un client demande "vous êtes
 * où ?", "vous ouvrez à quelle heure dimanche ?", etc.
 *
 * On récupère depuis restaurant_settings + restaurants pour avoir un payload
 * complet. Renvoyé en JSON pour que l'IA puisse parser directement.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/tenant";
import { getSettings } from "@/lib/db/settings-client";
import {
  verifyVapiSignature,
  extractTenantSlugFromVapiPayload,
} from "@/lib/auth/vapi-secret";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-vapi-signature");
  if (!(await verifyVapiSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = extractTenantSlugFromVapiPayload(payload);
  if (!slug) {
    return NextResponse.json(
      { error: "tenant_slug missing" },
      { status: 400 }
    );
  }

  const tenant = await getRestaurantBySlug(slug);
  if (!tenant) {
    return NextResponse.json(
      { error: `tenant not found` },
      { status: 404 }
    );
  }

  const settings = await getSettings(tenant.id);

  /* Payload structuré pour l'IA — clés simples, peu d'imbrication. */
  const info = {
    name: settings.name,
    tagline: settings.tagline ?? null,
    address: settings.address ?? null,
    postal_code: settings.postal_code ?? null,
    city: settings.city ?? null,
    phone: settings.phone ?? null,
    email: settings.email ?? null,
    hours: settings.hours ?? [],
    features: {
      reservations: settings.feature_reservations,
      qr_menu: settings.feature_qr_menu,
      delivery: settings.feature_delivery,
      takeaway: settings.feature_takeaway,
      terrace: settings.feature_terrace,
      pmr: settings.feature_pmr,
      halal: settings.feature_halal,
    },
    payment_methods: settings.payment_methods ?? [],
  };

  return NextResponse.json({
    results: [
      {
        toolCallId: extractToolCallId(payload),
        result: JSON.stringify(info),
      },
    ],
  });
}

function extractToolCallId(payload: Record<string, unknown>): string | null {
  const message = payload.message as
    | { toolCalls?: Array<{ id?: string }> }
    | undefined;
  return message?.toolCalls?.[0]?.id ?? null;
}
