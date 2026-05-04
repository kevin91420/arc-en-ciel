/**
 * POST /api/telephony/vapi/tools/log-call
 *
 * Tool Vapi : enregistre l'appel à la fin de la conversation.
 * Vapi appelle ce tool en hook "end-of-call" avec le récap.
 *
 * Args attendus :
 *   {
 *     "vapi_call_id": "uuid",
 *     "started_at": "ISO",
 *     "ended_at": "ISO",
 *     "duration_seconds": 142,
 *     "caller_number": "+33612345678",
 *     "transcript": "...",                       // texte complet
 *     "outcome": "ai_answered" | "transferred_to_human" | "voicemail",
 *     "detected_intent": "reservation" | "hours" | "menu" | "other",
 *     "reservation_id": "uuid" | null,
 *     "callback_requested": false,
 *     "callback_phone": null,
 *     "callback_notes": null,
 *     "audio_url": null,
 *     "cost_cents": 12
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  logPhoneCallStart,
  updatePhoneCall,
} from "@/lib/db/phone-client";
import { getRestaurantBySlug } from "@/lib/db/tenant";
import {
  verifyVapiSignature,
  extractTenantSlugFromVapiPayload,
} from "@/lib/auth/vapi-secret";
import type {
  PhoneCallIntent,
  PhoneCallOutcome,
} from "@/lib/db/phone-types";

export const dynamic = "force-dynamic";

const VALID_OUTCOMES: ReadonlySet<PhoneCallOutcome> = new Set([
  "staff_answered",
  "ai_answered",
  "voicemail",
  "no_answer",
  "transferred_to_human",
  "unknown",
]);

const VALID_INTENTS: ReadonlySet<PhoneCallIntent> = new Set([
  "reservation",
  "hours",
  "menu",
  "address",
  "complaint",
  "callback",
  "other",
]);

interface ToolCall {
  id: string;
  function?: {
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
      { error: "No tool call" },
      { status: 400 }
    );
  }

  let args: Record<string, unknown>;
  try {
    const raw = toolCall.function?.arguments;
    args = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
  } catch {
    return NextResponse.json({ error: "Bad args" }, { status: 400 });
  }

  const vapiCallId =
    typeof args.vapi_call_id === "string" ? args.vapi_call_id : undefined;

  /* Pattern : on tente d'upsert. Si l'appel a déjà une row (créée au début
   * via /check-busy), on update. Sinon on crée. */
  let callId: string;
  try {
    const existing = await logPhoneCallStart(
      {
        vapi_call_id: vapiCallId,
        caller_number:
          typeof args.caller_number === "string"
            ? args.caller_number
            : undefined,
      },
      tenant.id
    );
    callId = existing.id;
  } catch (err) {
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: toolCall.id,
            result: `Erreur log create : ${(err as Error).message}`,
          },
        ],
      },
      { status: 200 }
    );
  }

  /* Update avec les détails finaux */
  const outcome: PhoneCallOutcome = VALID_OUTCOMES.has(
    args.outcome as PhoneCallOutcome
  )
    ? (args.outcome as PhoneCallOutcome)
    : "ai_answered";
  const intent: PhoneCallIntent | undefined = VALID_INTENTS.has(
    args.detected_intent as PhoneCallIntent
  )
    ? (args.detected_intent as PhoneCallIntent)
    : undefined;

  try {
    await updatePhoneCall(
      { id: callId },
      {
        ended_at:
          typeof args.ended_at === "string"
            ? args.ended_at
            : new Date().toISOString(),
        duration_seconds:
          typeof args.duration_seconds === "number"
            ? args.duration_seconds
            : undefined,
        outcome,
        transcript:
          typeof args.transcript === "string" ? args.transcript : undefined,
        audio_url:
          typeof args.audio_url === "string" ? args.audio_url : undefined,
        detected_intent: intent,
        reservation_id:
          typeof args.reservation_id === "string"
            ? args.reservation_id
            : null,
        callback_requested: Boolean(args.callback_requested),
        callback_phone:
          typeof args.callback_phone === "string"
            ? args.callback_phone
            : undefined,
        callback_notes:
          typeof args.callback_notes === "string"
            ? args.callback_notes
            : undefined,
        cost_cents:
          typeof args.cost_cents === "number"
            ? Math.round(args.cost_cents)
            : undefined,
      },
      tenant.id
    );
  } catch (err) {
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: toolCall.id,
            result: `Erreur update : ${(err as Error).message}`,
          },
        ],
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    results: [
      {
        toolCallId: toolCall.id,
        result: JSON.stringify({ success: true, call_id: callId }),
      },
    ],
  });
}
