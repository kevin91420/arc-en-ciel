/**
 * GET /api/loyalty/config — Public-safe loyalty program config.
 *
 * Used by the QR menu and the loyalty landing to show the reward teaser
 * ("5 tampons = 1 pizza offerte") before the customer has a card. Only
 * safe display fields — no IDs or admin metadata.
 */
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(
      {
        stamps_required: config.stamps_required,
        reward_label: config.reward_label,
        reward_description: config.reward_description,
        welcome_message: config.welcome_message,
        brand_color: config.brand_color,
        accent_color: config.accent_color,
        active: config.active,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
