"use client";

/**
 * /staff/historique — Historique des tables payées (vue serveur).
 * Auth via le cookie staff (proxy.ts protège /staff/*).
 */

import OrderHistoryView from "@/components/OrderHistoryView";

export default function StaffHistoryPage() {
  return (
    <OrderHistoryView
      endpoint="/api/staff/orders/history"
      additionBaseHref="/staff/addition"
      title="Historique des tables"
    />
  );
}
