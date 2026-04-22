/**
 * GET/PATCH /api/admin/loyalty/config — Config du programme (admin-only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    /* Only allow specific keys to be updated */
    const allowed = [
      "stamps_required",
      "reward_label",
      "reward_description",
      "welcome_message",
      "brand_color",
      "accent_color",
      "active",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    /* Clamp stamps_required to reasonable range */
    if (typeof updates.stamps_required === "number") {
      updates.stamps_required = Math.max(
        2,
        Math.min(20, updates.stamps_required)
      );
    }

    const config = await updateConfig(updates);
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
