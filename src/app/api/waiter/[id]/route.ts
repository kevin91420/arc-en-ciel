import { NextRequest, NextResponse } from "next/server";
import { updateWaiterCall } from "@/lib/db/client";
import type { WaiterCall, WaiterCallStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const UPDATABLE_STATUSES: WaiterCallStatus[] = [
  "in_progress",
  "resolved",
  "cancelled",
];

/**
 * PATCH /api/waiter/[id] — Update a waiter call status.
 * When setting to "resolved", automatically stamps resolved_at.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Partial<WaiterCall>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.status) {
    return NextResponse.json(
      { error: "status is required" },
      { status: 400 }
    );
  }

  if (!UPDATABLE_STATUSES.includes(body.status as WaiterCallStatus)) {
    return NextResponse.json(
      {
        error: `status must be one of: ${UPDATABLE_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const updates: Partial<WaiterCall> = { status: body.status };

  if (body.status === "resolved") {
    updates.resolved_at = new Date().toISOString();
    if (typeof body.resolved_by === "string" && body.resolved_by.trim()) {
      updates.resolved_by = body.resolved_by.trim();
    }
  }

  try {
    const updated = await updateWaiterCall(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Waiter call not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update waiter call: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
