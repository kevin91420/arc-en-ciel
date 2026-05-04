/**
 * POST /api/telephony/vapi/tools/check-busy
 *
 * Tool appelé par Vapi au début d'un appel pour décider si l'IA doit
 * répondre ou si elle doit transférer immédiatement à l'humain.
 *
 * Body Vapi (typique) :
 *   {
 *     "message": { "type": "tool-calls", "toolCalls": [...] },
 *     "call": { "id": "...", "metadata": { "tenant_slug": "arc-en-ciel" } }
 *   }
 *
 * Réponse :
 *   {
 *     "results": [{
 *       "toolCallId": "...",
 *       "result": "ai_should_answer:true reason:fallback_default"
 *     }]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { shouldAITakeCallNow } from "@/lib/db/phone-client";
import { getRestaurantBySlug } from "@/lib/db/tenant";
import {
  verifyVapiSignature,
  extractTenantSlugFromVapiPayload,
} from "@/lib/auth/vapi-secret";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-vapi-signature");
  const signatureValid = await verifyVapiSignature(rawBody, signature);
  if (!signatureValid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
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
      { error: "tenant_slug missing in metadata" },
      { status: 400 }
    );
  }

  const tenant = await getRestaurantBySlug(slug);
  if (!tenant) {
    return NextResponse.json(
      { error: `tenant '${slug}' not found` },
      { status: 404 }
    );
  }

  const decision = await shouldAITakeCallNow(tenant.id);

  return NextResponse.json({
    results: [
      {
        toolCallId: extractToolCallId(payload),
        result: JSON.stringify(decision),
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
