/**
 * POST /api/admin/prospects/[id]/send
 *
 * Body: { template_id: "intro" | "follow_up_1" | "follow_up_2" | "last_chance" }
 *
 * - Charge le prospect
 * - Refuse si pas d'email (400)
 * - Envoie via Resend
 * - Log dans prospect_emails
 * - Incrémente emails_sent, updated last_email_at
 * - Si template=intro et status in (new|queued) -> passe à contacted
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getProspect,
  updateProspect,
  addProspectEmail,
} from "@/lib/db/prospects-client";
import { sendProspectEmail, prospectSubject } from "@/lib/email/send";
import type {
  Prospect,
  ProspectTemplateId,
} from "@/lib/db/prospects-types";
import { PROSPECT_TEMPLATES } from "@/lib/db/prospects-types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { template_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const templateId = body.template_id;
  if (
    typeof templateId !== "string" ||
    !PROSPECT_TEMPLATES.includes(templateId as ProspectTemplateId)
  ) {
    return NextResponse.json(
      {
        error: `template_id must be one of: ${PROSPECT_TEMPLATES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const prospect = await getProspect(id);
  if (!prospect) {
    return NextResponse.json(
      { error: "Prospect not found" },
      { status: 404 }
    );
  }

  if (!prospect.email) {
    return NextResponse.json(
      { error: "Prospect has no email" },
      { status: 400 }
    );
  }

  const send = await sendProspectEmail(
    prospect,
    templateId as ProspectTemplateId
  );

  if (!send.result.ok) {
    // Resend not configured in demo env? On log quand même pour traçabilité.
    const isSkipped = "skipped" in send.result && send.result.skipped;
    const logged = await addProspectEmail(
      prospect.id,
      templateId,
      send.subject ||
        prospectSubject(
          templateId as ProspectTemplateId,
          prospect.restaurant_name
        ),
      send.html || `template:${templateId}`,
      null
    );

    // On n'incrémente pas emails_sent / status si Resend a effectivement
    // renvoyé une erreur — sauf si c'est juste un skip (pas de clé API).
    if (isSkipped) {
      await applyPostSendEffects(prospect, templateId as ProspectTemplateId);
    }

    return NextResponse.json(
      {
        success: false,
        skipped: Boolean(isSkipped),
        email_id: logged.id,
        error: send.result.error,
      },
      { status: isSkipped ? 200 : 502 }
    );
  }

  const logged = await addProspectEmail(
    prospect.id,
    templateId,
    send.subject,
    send.html,
    send.result.id
  );
  await applyPostSendEffects(prospect, templateId as ProspectTemplateId);

  return NextResponse.json(
    {
      success: true,
      email_id: logged.id,
      resend_id: send.result.id,
    },
    { status: 200 }
  );
}

/**
 * Après envoi réussi (ou skipped en demo) : incrémente le compteur,
 * met à jour last_email_at, transitionne le status si besoin.
 */
async function applyPostSendEffects(
  prospect: Prospect,
  templateId: ProspectTemplateId
) {
  const now = new Date().toISOString();
  const patch: Partial<Prospect> = {
    emails_sent: (prospect.emails_sent || 0) + 1,
    last_email_at: now,
  };

  if (
    templateId === "intro" &&
    (prospect.status === "new" || prospect.status === "queued")
  ) {
    patch.status = "contacted";
  }

  await updateProspect(prospect.id, patch);
}
