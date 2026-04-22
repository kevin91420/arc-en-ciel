/**
 * PATCH /api/admin/leads/[id] — Modifie statut, notes, next_followup.
 * GET   /api/admin/leads/[id] — Lecture d'un lead individuel.
 * Protégé par proxy.ts (cookie admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/db/leads-client";
import type { PackLead, LeadStatus } from "@/lib/db/leads-types";

export const dynamic = "force-dynamic";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch lead: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Partial<PackLead>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Partial<PackLead> = {};

  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${LEAD_STATUSES.join(", ")}` },
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
    if (typeof body.notes === "string" && body.notes.length > 5000) {
      return NextResponse.json(
        { error: "notes too long (max 5000)" },
        { status: 400 }
      );
    }
    updates.notes = body.notes;
  }

  if (body.next_followup !== undefined) {
    if (body.next_followup === null || body.next_followup === "") {
      updates.next_followup = null;
    } else {
      if (typeof body.next_followup !== "string") {
        return NextResponse.json(
          { error: "next_followup must be YYYY-MM-DD or null" },
          { status: 400 }
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.next_followup)) {
        return NextResponse.json(
          { error: "next_followup must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      const parsed = new Date(body.next_followup + "T00:00:00");
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "next_followup is invalid" },
          { status: 400 }
        );
      }
      updates.next_followup = body.next_followup;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid fields to update (status, notes, next_followup)",
      },
      { status: 400 }
    );
  }

  try {
    const updated = await updateLead(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update lead: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
