/**
 * Returns the webhook token to the admin UI.
 * Protected by middleware (proxy.ts) — only authenticated admins can read it.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.WEBHOOK_SECRET;
  if (!token) {
    return NextResponse.json(
      {
        configured: false,
        token: null,
        hint: "Set WEBHOOK_SECRET env var in Vercel to enable webhook",
      },
      { status: 200 }
    );
  }
  return NextResponse.json({
    configured: true,
    token,
    webhook_url:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://arc-en-ciel-theta.vercel.app",
  });
}
