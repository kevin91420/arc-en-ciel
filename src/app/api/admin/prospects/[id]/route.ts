/**
 * GET    /api/admin/prospects/[id] — Lecture d'un prospect.
 * PATCH  /api/admin/prospects/[id] — Modifie statut / notes / tags / email / etc.
 * Protégé par proxy.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProspect, updateProspect } from "@/lib/db/prospects-client";
import type { Prospect, ProspectStatus } from "@/lib/db/prospects-types";
import { PROSPECT_STATUSES } from "@/lib/db/prospects-types";

export const dynamic = "force-dynamic";

/** Champs que le client a le droit de modifier via PATCH. */
const WRITABLE: Array<keyof Prospect> = [
  "status",
  "notes",
  "email",
  "phone",
  "website",
  "cuisine_type",
  "price_range",
  "tags",
  "address",
  "city",
  "postal_code",
  "country",
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
    const prospect = await getProspect(id);
    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(prospect, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to fetch prospect: " +
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

  let body: Partial<Prospect>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Partial<Prospect> = {};

  for (const key of WRITABLE) {
    if (!(key in body)) continue;
    const val = body[key];

    if (key === "status") {
      if (
        typeof val !== "string" ||
        !PROSPECT_STATUSES.includes(val as ProspectStatus)
      ) {
        return NextResponse.json(
          { error: `status must be one of: ${PROSPECT_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = val as ProspectStatus;
      continue;
    }

    if (key === "notes" && typeof val === "string" && val.length > 5000) {
      return NextResponse.json(
        { error: "notes too long (max 5000)" },
        { status: 400 }
      );
    }

    if (key === "tags") {
      if (!Array.isArray(val)) {
        return NextResponse.json(
          { error: "tags must be an array of strings" },
          { status: 400 }
        );
      }
      updates.tags = val.filter((t) => typeof t === "string");
      continue;
    }

    // Null | string passthrough for the rest.
    (updates as Record<string, unknown>)[key] = val;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateProspect(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Failed to update prospect: " +
          ((err as Error).message || "unknown error"),
      },
      { status: 500 }
    );
  }
}
