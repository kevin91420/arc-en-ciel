/**
 * GET/PATCH /api/admin/replaced-tools
 *
 * Stores the list of platform IDs the restaurant declared it used to pay for,
 * so the admin "Command Center" can show monthly/yearly savings.
 *
 * Persistence is currently in-process (globalThis) — localStorage is the
 * client-side source of truth. Wire this to Supabase `restaurant_settings`
 * when a `replaced_tool_ids jsonb` column is added.
 *
 * Admin-only — protection is handled by the global /api/admin/* proxy.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Cache = { ids: string[] };

const cacheHolder = globalThis as unknown as { __arcReplacedTools?: Cache };

function readCache(): string[] {
  if (!cacheHolder.__arcReplacedTools) {
    cacheHolder.__arcReplacedTools = { ids: [] };
  }
  return cacheHolder.__arcReplacedTools.ids;
}

function writeCache(ids: string[]) {
  cacheHolder.__arcReplacedTools = { ids };
}

export async function GET() {
  return NextResponse.json({ platform_ids: readCache() });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { platform_ids?: unknown };
    const raw = Array.isArray(body.platform_ids) ? body.platform_ids : [];
    const ids = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 200);

    writeCache(ids);
    return NextResponse.json({ platform_ids: ids });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
