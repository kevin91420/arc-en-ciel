/**
 * POST /api/staff/orders/[id]/fire-course — fire only the pending items
 * belonging to a given course (entree / plat / dessert / boisson).
 *
 * Body: { course: "entree" | "plat" | "dessert" | "boisson" }
 *   or:  { categories: string[] } (explicit category list)
 *
 * Returns the updated order.
 */

import { NextRequest, NextResponse } from "next/server";
import { fireOrderByCategories } from "@/lib/db/pos-client";
import {
  COURSES,
  type Course,
  courseForCategory,
} from "@/lib/courses";
import { CARTE } from "@/data/carte";

export const dynamic = "force-dynamic";

/* Compute, at module load, the category list per course from the current
 * CARTE. Adding a new category in src/data/carte.ts auto-feeds this map. */
const CATEGORIES_BY_COURSE: Record<Course, string[]> = {
  entree: [],
  plat: [],
  dessert: [],
  boisson: [],
};
for (const cat of CARTE) {
  CATEGORIES_BY_COURSE[courseForCategory(cat.id)].push(cat.id);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { course?: unknown; categories?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let categories: string[] = [];

  if (
    typeof body.course === "string" &&
    (COURSES as readonly string[]).includes(body.course)
  ) {
    categories = CATEGORIES_BY_COURSE[body.course as Course];
  } else if (
    Array.isArray(body.categories) &&
    body.categories.every((c: unknown) => typeof c === "string")
  ) {
    categories = (body.categories as string[]).map((c) => c.trim()).filter(Boolean);
  } else {
    return NextResponse.json(
      {
        error:
          'course requis ("entree" | "plat" | "dessert" | "boisson") ou categories (string[])',
      },
      { status: 400 }
    );
  }

  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Aucune catégorie correspondant à ce cours." },
      { status: 400 }
    );
  }

  try {
    const updated = await fireOrderByCategories(id, categories);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Impossible de lancer le cours : " +
          ((err as Error).message || "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
