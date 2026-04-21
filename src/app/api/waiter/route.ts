import { NextRequest, NextResponse } from "next/server";
import { createWaiterCall, listWaiterCalls } from "@/lib/db/client";
import type {
  CreateWaiterCallPayload,
  WaiterCallStatus,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

const WAITER_CALL_STATUSES: WaiterCallStatus[] = [
  "pending",
  "in_progress",
  "resolved",
  "cancelled",
];

/* ──────────────────────────────────────────────────────────
   Rate limiting — simple in-memory per-IP sliding window
   Max 5 calls / 60s / IP
   ────────────────────────────────────────────────────────── */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitEntry = { timestamps: number[] };

/**
 * Store on globalThis so hot-reload in dev doesn't reset state too aggressively.
 */
const globalStore = globalThis as unknown as {
  __waiterRateLimit?: Map<string, RateLimitEntry>;
};
const rateLimitMap: Map<string, RateLimitEntry> =
  globalStore.__waiterRateLimit ?? new Map();
globalStore.__waiterRateLimit = rateLimitMap;

/**
 * Get client IP from common proxy headers, fallback to "unknown".
 */
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Returns true if the request passes rate limiting.
 */
function checkRateLimit(ip: string): {
  ok: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };
  // Drop stale timestamps
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = entry.timestamps[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    );
    rateLimitMap.set(ip, entry);
    return { ok: false, retryAfterSec };
  }

  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return { ok: true, retryAfterSec: 0 };
}

/**
 * POST /api/waiter — Create a waiter call (public from QR menu).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Too many requests. Please wait ${limit.retryAfterSec}s and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  let body: Partial<CreateWaiterCallPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // table_number 1–50
  if (
    typeof body.table_number !== "number" ||
    !Number.isInteger(body.table_number) ||
    body.table_number < 1 ||
    body.table_number > 50
  ) {
    return NextResponse.json(
      { error: "table_number must be an integer between 1 and 50" },
      { status: 400 }
    );
  }

  // request_type min 1, max 100 chars
  if (
    !body.request_type ||
    typeof body.request_type !== "string" ||
    body.request_type.trim().length < 1
  ) {
    return NextResponse.json(
      { error: "request_type is required (min 1 char)" },
      { status: 400 }
    );
  }
  if (body.request_type.length > 100) {
    return NextResponse.json(
      { error: "request_type too long (max 100 characters)" },
      { status: 400 }
    );
  }

  try {
    const call = await createWaiterCall({
      table_number: body.table_number,
      request_type: body.request_type.trim(),
    });
    return NextResponse.json(call, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to create waiter call: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waiter?status=pending — List waiter calls.
 */
export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status") ?? undefined;
  const filters: { status?: WaiterCallStatus } = {};

  if (statusParam) {
    if (!WAITER_CALL_STATUSES.includes(statusParam as WaiterCallStatus)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${WAITER_CALL_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    filters.status = statusParam as WaiterCallStatus;
  }

  try {
    const calls = await listWaiterCalls(filters);
    return NextResponse.json(calls, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list waiter calls: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
