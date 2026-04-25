/**
 * /kitchen/runner/[itemId] — Runner ticket print page.
 *
 * Auto-printed mini receipt that the chef places ON or NEXT TO the plate at
 * the pass. The server picks up plate + ticket → instantly knows where it
 * goes (table, customer notes, special flags). Solves the classic rush
 * confusion: "this pizza, is it for table 4 or 7?"
 *
 * Server component wrapper. Auth via /kitchen/* proxy (staff cookie).
 */

import type { Metadata } from "next";
import RunnerPrint from "./RunnerPrint";
import { getSettings } from "@/lib/db/settings-client";

export async function generateMetadata(): Promise<Metadata> {
  let brand = "Bon de service";
  try {
    const s = await getSettings();
    if (s.name?.trim()) brand = `Bon · ${s.name.trim()}`;
  } catch {}
  return { title: brand, robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function RunnerTicketPage({ params }: PageProps) {
  const { itemId } = await params;
  const settings = await getSettings().catch(() => null);
  return (
    <RunnerPrint
      itemId={itemId}
      brandName={settings?.name?.trim() || "Service"}
    />
  );
}
