/**
 * GET   /api/admin/telephony/config — récupère la config IA téléphone
 * PATCH /api/admin/telephony/config — met à jour la config
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPhoneAIConfig,
  updatePhoneAIConfig,
  type UpdatePhoneAIConfigPayload,
} from "@/lib/db/phone-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPhoneAIConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Configuration introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  let body: Partial<UpdatePhoneAIConfigPayload>;
  try {
    body = (await req.json()) as Partial<UpdatePhoneAIConfigPayload>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  /* Validation soft */
  if (
    body.mode !== undefined &&
    body.mode !== "off" &&
    body.mode !== "fallback" &&
    body.mode !== "always"
  ) {
    return NextResponse.json(
      { error: "mode invalide (off / fallback / always)" },
      { status: 400 }
    );
  }
  if (body.fallback_seconds !== undefined) {
    const s = Number(body.fallback_seconds);
    if (!Number.isFinite(s) || s < 5 || s > 60) {
      return NextResponse.json(
        { error: "fallback_seconds doit être entre 5 et 60" },
        { status: 400 }
      );
    }
  }

  try {
    await updatePhoneAIConfig(body);
    const config = await getPhoneAIConfig();
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
