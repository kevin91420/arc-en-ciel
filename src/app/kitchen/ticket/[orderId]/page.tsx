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

export const metadata: Metadata = {
  title: "Ticket cuisine · L'Arc en Ciel",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function KitchenTicketPage({ params }: PageProps) {
  const { orderId } = await params;
  return <TicketPrint orderId={orderId} />;
}
