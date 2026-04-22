import { NextRequest, NextResponse } from "next/server";
import {
  listReservations,
  createReservation,
} from "@/lib/db/client";
import type {
  CreateReservationPayload,
  ReservationStatus,
} from "@/lib/db/types";
import { sendReservationEmails } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

/**
 * Validate the incoming reservation payload.
 * Returns an error message or null if valid.
 */
function validateReservationPayload(
  body: Partial<CreateReservationPayload>
): string | null {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  // customer_name
  if (
    !body.customer_name ||
    typeof body.customer_name !== "string" ||
    body.customer_name.trim().length < 2
  ) {
    return "customer_name is required (min 2 characters)";
  }
  if (body.customer_name.length > 120) {
    return "customer_name too long (max 120 characters)";
  }

  // customer_phone (basic international / FR friendly regex)
  if (!body.customer_phone || typeof body.customer_phone !== "string") {
    return "customer_phone is required";
  }
  const phoneRegex = /^[+]?[\d\s().-]{6,20}$/;
  if (!phoneRegex.test(body.customer_phone.trim())) {
    return "customer_phone has invalid format";
  }

  // customer_email (optional but validated if provided)
  if (body.customer_email) {
    if (typeof body.customer_email !== "string") {
      return "customer_email must be a string";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      return "customer_email has invalid format";
    }
  }

  // date YYYY-MM-DD
  if (!body.date || typeof body.date !== "string") {
    return "date is required (YYYY-MM-DD)";
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.date)) {
    return "date must be in YYYY-MM-DD format";
  }
  const parsedDate = new Date(body.date + "T00:00:00");
  if (Number.isNaN(parsedDate.getTime())) {
    return "date is invalid";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate.getTime() < today.getTime()) {
    return "date cannot be in the past";
  }

  // time HH:MM
  if (!body.time || typeof body.time !== "string") {
    return "time is required (HH:MM)";
  }
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(body.time)) {
    return "time must be in HH:MM format";
  }

  // guests 1-20
  if (
    typeof body.guests !== "number" ||
    !Number.isFinite(body.guests) ||
    !Number.isInteger(body.guests)
  ) {
    return "guests must be an integer";
  }
  if (body.guests < 1 || body.guests > 20) {
    return "guests must be between 1 and 20";
  }

  return null;
}

/**
 * POST /api/reservations — Create a reservation (public).
 */
export async function POST(req: NextRequest) {
  let body: Partial<CreateReservationPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validationError = validateReservationPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const payload: CreateReservationPayload = {
      customer_name: body.customer_name!.trim(),
      customer_phone: body.customer_phone!.trim(),
      customer_email: body.customer_email?.trim(),
      date: body.date!,
      time: body.time!,
      guests: body.guests!,
      notes: body.notes?.toString().trim() || undefined,
      special_occasion:
        body.special_occasion?.toString().trim() || undefined,
      source: body.source || "website",
    };

    const reservation = await createReservation(payload);

    /* Fire-and-forget: send confirmation + admin alert emails.
       We don't await so the API response isn't delayed. */
    sendReservationEmails(reservation).catch((err) => {
      console.error("[email] Failed to send reservation emails:", err);
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to create reservation: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations?date=2026-04-15&status=confirmed — List reservations.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;

  const filters: { date?: string; status?: ReservationStatus } = {};

  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "date filter must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    filters.date = date;
  }

  if (statusParam) {
    if (!RESERVATION_STATUSES.includes(statusParam as ReservationStatus)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${RESERVATION_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    filters.status = statusParam as ReservationStatus;
  }

  try {
    const reservations = await listReservations(filters);
    return NextResponse.json(reservations, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to list reservations: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
