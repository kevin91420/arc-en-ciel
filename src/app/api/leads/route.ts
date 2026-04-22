/**
 * POST /api/leads — Public endpoint : réception des leads du landing /pro.
 *
 * Validation :
 *   - restaurant_name  (2–120)
 *   - contact_name     (2–120)
 *   - email            (regex)
 *   - phone            (optionnel, 6–20)
 *   - interest         (optionnel, ≤ 2000)
 *
 * Rate limit : 5 leads / heure / IP (globalThis Map, in-memory par instance).
 *
 * Succès : crée le lead + envoie 2 emails (prospect + admin) en fire-and-forget,
 * répond 201 { success: true, id }.
 */

import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/db/leads-client";
import type { CreateLeadPayload } from "@/lib/db/leads-types";
import { sendLeadEmails } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/* ── Rate limit store ──────────────────────────────────── */
type RateLimitEntry = { count: number; resetAt: number };
const globalAny = globalThis as unknown as {
  __leadsRateLimit?: Map<string, RateLimitEntry>;
};
function getRateLimitStore(): Map<string, RateLimitEntry> {
  if (!globalAny.__leadsRateLimit) {
    globalAny.__leadsRateLimit = new Map();
  }
  return globalAny.__leadsRateLimit;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

/* ── Validation ────────────────────────────────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{6,20}$/;

function validatePayload(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  const b = body as Record<string, unknown>;

  if (typeof b.restaurant_name !== "string" || b.restaurant_name.trim().length < 2) {
    return "restaurant_name requis (min 2 caractères)";
  }
  if (b.restaurant_name.length > 120) {
    return "restaurant_name trop long (max 120)";
  }

  if (typeof b.contact_name !== "string" || b.contact_name.trim().length < 2) {
    return "contact_name requis (min 2 caractères)";
  }
  if (b.contact_name.length > 120) {
    return "contact_name trop long (max 120)";
  }

  if (typeof b.email !== "string" || !EMAIL_REGEX.test(b.email.trim())) {
    return "email invalide";
  }
  if (b.email.length > 200) {
    return "email trop long";
  }

  if (b.phone !== undefined && b.phone !== null && b.phone !== "") {
    if (typeof b.phone !== "string" || !PHONE_REGEX.test(b.phone.trim())) {
      return "phone invalide (6–20 caractères)";
    }
  }

  if (b.interest !== undefined && b.interest !== null && b.interest !== "") {
    if (typeof b.interest !== "string") {
      return "interest doit être une chaîne";
    }
    if (b.interest.length > 2000) {
      return "interest trop long (max 2000)";
    }
  }

  return null;
}

/* ── POST /api/leads ───────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Trop de demandes. Réessayez dans " +
          (rate.retryAfter ? `${Math.ceil(rate.retryAfter / 60)} min` : "quelques minutes") +
          ".",
      },
      {
        status: 429,
        headers: rate.retryAfter
          ? { "Retry-After": String(rate.retryAfter) }
          : undefined,
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const b = body as Record<string, string>;
  const payload: CreateLeadPayload = {
    restaurant_name: b.restaurant_name.trim(),
    contact_name: b.contact_name.trim(),
    email: b.email.trim().toLowerCase(),
    phone: b.phone ? b.phone.trim() : undefined,
    interest: b.interest ? b.interest.trim() : undefined,
    source: typeof b.source === "string" && b.source ? b.source : "landing",
  };

  try {
    const lead = await createLead(payload);

    /* Fire-and-forget : on ne bloque pas la réponse sur les emails. */
    sendLeadEmails(lead).catch((err) => {
      console.error("[email] Failed to send lead emails:", err);
    });

    return NextResponse.json(
      { success: true, id: lead.id },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Erreur lors de l'enregistrement du lead : " +
          ((err as Error).message || "inconnu"),
      },
      { status: 500 }
    );
  }
}
