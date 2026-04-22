/**
 * RESERVATION WEBHOOK — Endpoint universel pour recevoir les résas
 * depuis TheFork, Google Reserve, Deliveroo, Zapier, Make.com, etc.
 *
 * Auth: Bearer token via header Authorization
 * Body JSON: {
 *   source: "thefork" | "google" | "deliveroo" | "walk_in" | "phone" | "other",
 *   customer_name: string,
 *   customer_phone: string,
 *   customer_email?: string,
 *   date: "YYYY-MM-DD",
 *   time: "HH:MM",
 *   guests: number,
 *   external_id?: string,  // pour éviter les doublons si retry
 *   notes?: string,
 *   special_occasion?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createReservation } from "@/lib/db/client";
import type { ReservationSource } from "@/lib/db/types";
import { sendReservationEmails } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const VALID_SOURCES: ReservationSource[] = [
  "website",
  "phone",
  "google",
  "thefork",
  "walk_in",
  "other",
];

export async function POST(req: NextRequest) {
  /* ── Auth check ────────────────────────────────────────── */
  const expectedToken = process.env.WEBHOOK_SECRET;
  if (!expectedToken) {
    return NextResponse.json(
      {
        error:
          "Webhook not configured. Set WEBHOOK_SECRET env var on the server.",
      },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
  const tokenFromQuery = req.nextUrl.searchParams.get("token") || "";
  const providedToken = tokenFromHeader || tokenFromQuery;

  if (providedToken !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing token" },
      { status: 401 }
    );
  }

  /* ── Parse body ────────────────────────────────────────── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  /* ── Validation ────────────────────────────────────────── */
  const errors: string[] = [];
  const customer_name = String(body.customer_name || body.name || "").trim();
  if (customer_name.length < 2) errors.push("customer_name too short");

  const customer_phone = String(
    body.customer_phone || body.phone || ""
  ).trim();
  if (!customer_phone) errors.push("customer_phone required");

  const date = String(body.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("date must be YYYY-MM-DD");
  }

  const time = String(body.time || "").trim();
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    errors.push("time must be HH:MM");
  }

  const guests = Number(body.guests || body.party_size || 0);
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
    errors.push("guests must be integer 1–50");
  }

  const sourceRaw = String(body.source || "other").toLowerCase();
  const source = (VALID_SOURCES as string[]).includes(sourceRaw)
    ? (sourceRaw as ReservationSource)
    : "other";

  const customer_email = body.customer_email
    ? String(body.customer_email).trim()
    : undefined;
  const external_id = body.external_id
    ? String(body.external_id).trim().slice(0, 200)
    : undefined;
  const notes = body.notes ? String(body.notes).slice(0, 1000) : undefined;
  const special_occasion = body.special_occasion
    ? String(body.special_occasion).slice(0, 200)
    : undefined;

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  /* Normalize time to HH:MM (zero-pad hour) */
  const normalizedTime = `${timeMatch![1].padStart(2, "0")}:${timeMatch![2]}`;

  /* ── Create (or dedupe if external_id already exists) ──── */
  try {
    const reservation = await createReservation({
      customer_name,
      customer_email,
      customer_phone,
      date,
      time: normalizedTime,
      guests,
      source,
      external_id,
      notes,
      special_occasion,
    });

    /* Only send emails for NEW reservations (not deduped retries) */
    const isDedup = Boolean(
      external_id && reservation.external_id === external_id
    );
    /* For new entries, reservation.created_at is very recent (<5s).
       If older, it's a dedup hit. */
    const isRecent =
      Date.now() - new Date(reservation.created_at).getTime() < 10_000;
    if (isRecent && !isDedup) {
      sendReservationEmails(reservation).catch((err) => {
        console.error("[email] Webhook email send failed:", err);
      });
    }

    return NextResponse.json(
      {
        success: true,
        reservation,
        deduped: isDedup && !isRecent,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create reservation", details: msg },
      { status: 500 }
    );
  }
}

/* Healthcheck GET — returns status without exposing the token */
export async function GET() {
  const configured = Boolean(process.env.WEBHOOK_SECRET);
  return NextResponse.json({
    status: "ok",
    webhook_configured: configured,
    docs: "https://arc-en-ciel-theta.vercel.app/admin/integrations",
  });
}
