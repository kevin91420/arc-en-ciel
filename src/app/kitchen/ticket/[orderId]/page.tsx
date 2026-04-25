/**
 * /kitchen/ticket/[orderId] — Kitchen ticket print page.
 *
 * Server component wrapper. Auth is enforced at the proxy level for /kitchen/*
 * (staff cookie). The real work happens in the TicketPrint client component:
 * it fetches the order, renders a thermal-printer-style layout (80mm wide,
 * monospace), and auto-triggers window.print() on mount.
 *
 * In Next.js 16, `params` is a Promise and must be awaited.
 */

import type { Metadata } from "next";
import TicketPrint from "./TicketPrint";
import { getSettings } from "@/lib/db/settings-client";

export async function generateMetadata(): Promise<Metadata> {
  let brand = "Ticket cuisine";
  try {
    const s = await getSettings();
    if (s.name?.trim()) brand = `Ticket cuisine · ${s.name.trim()}`;
  } catch {}
  return { title: brand, robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function KitchenTicketPage({ params }: PageProps) {
  const { orderId } = await params;
  /* Resolve branding server-side so the print head is correct on the very
   * first paint (no flash of "L'ARC EN CIEL" while the API is hydrating). */
  const settings = await getSettings().catch(() => null);
  return (
    <TicketPrint
      orderId={orderId}
      brandName={settings?.name?.trim() || "Cuisine"}
    />
  );
}
