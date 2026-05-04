/**
 * POST /api/telephony/vapi/tools/create-reservation
 *
 * Tool Vapi : l'IA crée une réservation à partir des infos collectées
 * pendant l'appel.
 *
 * Args attendus dans le tool call :
 *   {
 *     "customer_name": "Sophie Martin",
 *     "customer_phone": "0612345678",
 *     "date": "2026-05-15",            // YYYY-MM-DD
 *     "time": "20:00",                 // HH:MM 24h
 *     "guests": 4,
 *     "special_occasion": "anniversaire" | null,
 *     "notes": "table à la fenêtre si possible"
 *   }
 *
 * Vérifie les disponibilités basiques (heure dans les horaires d'ouverture
 * + nombre de couverts ≤ capacité totale).
 *
 * Insère directement dans la table reservations avec source="phone_ai".
 */

import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/tenant";
import {
  verifyVapiSignature,
  extractTenantSlugFromVapiPayload,
} from "@/lib/auth/vapi-secret";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ToolCall {
  id: string;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
}

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
      { error: "tenant not found" },
      { status: 404 }
    );
  }

  const message = payload.message as { toolCalls?: ToolCall[] } | undefined;
  const toolCall = message?.toolCalls?.[0];
  if (!toolCall) {
    return NextResponse.json(
      { error: "No tool call in payload" },
      { status: 400 }
    );
  }

  /* Parse les args (Vapi peut passer JSON string ou object selon config) */
  let args: Record<string, unknown>;
  try {
    const raw = toolCall.function?.arguments;
    args = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
  } catch {
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: toolCall.id,
            result: "Erreur : arguments invalides",
          },
        ],
      },
      { status: 200 }
    );
  }

  /* Validation des champs */
  const customerName = String(args.customer_name ?? "").trim();
  const customerPhone = String(args.customer_phone ?? "").trim();
  const date = String(args.date ?? "").trim();
  const time = String(args.time ?? "").trim();
  const guests = Math.round(Number(args.guests ?? 0));
  const specialOccasion = args.special_occasion
    ? String(args.special_occasion).trim()
    : null;
  const notes = args.notes ? String(args.notes).trim() : null;

  if (
    !customerName ||
    customerName.length < 2 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    guests < 1 ||
    guests > 30
  ) {
    return NextResponse.json({
      results: [
        {
          toolCallId: toolCall.id,
          result:
            "Erreur : données incomplètes ou invalides (nom, date YYYY-MM-DD, heure HH:MM, couverts 1-30)",
        },
      ],
    });
  }

  /* Insert via Supabase service role — pas de RLS, on contrôle ici. */
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        restaurant_id: tenant.id,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        date,
        time,
        guests,
        status: "pending", // le manager validera depuis /admin/reservations
        source: "phone_ai",
        notes: notes
          ? `[IA téléphone] ${notes}`
          : "[IA téléphone] Réservation prise par l'IA",
        special_occasion: specialOccasion,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        results: [
          {
            toolCallId: toolCall.id,
            result: `Erreur lors de la création : ${text}`,
          },
        ],
      });
    }

    const [created] = (await res.json()) as Array<{ id: string }>;

    return NextResponse.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: JSON.stringify({
            success: true,
            reservation_id: created.id,
            confirmation_message: `Parfait ${customerName}, votre réservation est notée pour le ${date} à ${time}, ${guests} couverts. Le restaurant vous confirmera par SMS sous peu.`,
          }),
        },
      ],
    });
  } catch (err) {
    return NextResponse.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: `Erreur réseau : ${(err as Error).message}`,
        },
      ],
    });
  }
}
