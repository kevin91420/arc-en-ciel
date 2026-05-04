/**
 * GET /api/admin/loyalty/birthdays?month=5
 *
 * Liste les clients (avec consentement RGPD) qui ont leur anniversaire
 * dans le mois donné. Default = mois courant.
 *
 * Réponse :
 *   {
 *     month: number,
 *     month_label: string,
 *     count: number,
 *     birthdays: BirthdayCustomer[],
 *   }
 *
 * Protégé par cookie admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { listBirthdaysForMonth } from "@/lib/db/loyalty-client";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const month = monthParam
    ? parseInt(monthParam, 10)
    : new Date().getMonth() + 1; // 1-12

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Paramètre 'month' invalide (1-12 attendu)." },
      { status: 400 }
    );
  }

  try {
    const birthdays = await listBirthdaysForMonth(month);
    return NextResponse.json({
      month,
      month_label: MONTH_LABELS[month - 1],
      count: birthdays.length,
      birthdays,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Erreur" },
      { status: 500 }
    );
  }
}
