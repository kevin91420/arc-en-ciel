import { NextRequest, NextResponse } from "next/server";
import { listReservations, updateReservation } from "@/lib/db/client";
import type { Reservation, ReservationStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

/**
 * Find a reservation by id by scanning the full list.
 * (Client exposes a list-only read API; we filter in memory.)
 */
async function findReservation(id: string): Promise<Reservation | undefined> {
  const all = await listReservations();
  return all.find((r) => r.id === id);
}

/**
 * GET /api/reservations/[id] — Get a single reservation.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const reservation = await findReservation(id);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(reservation, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch reservation: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reservations/[id] — Update status, notes, table_number.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Partial<Reservation>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const updates: Partial<Reservation> = {};

  if (body.status !== undefined) {
    if (!RESERVATION_STATUSES.includes(body.status as ReservationStatus)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${RESERVATION_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string or null" },
        { status: 400 }
      );
    }
    updates.notes = body.notes;
  }

  if (body.table_number !== undefined) {
    if (body.table_number !== null) {
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
    }
    updates.table_number = body.table_number;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update (status, notes, table_number)" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateReservation(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update reservation: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reservations/[id] — Soft delete (set status to "cancelled").
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const updated = await updateReservation(id, { status: "cancelled" });
    if (!updated) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to cancel reservation: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
