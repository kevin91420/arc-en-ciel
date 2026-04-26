"use client";

/**
 * /admin/historique — Historique des tables payées (vue manager).
 * Même composant que /staff/historique, auth admin (proxy.ts).
 */

import OrderHistoryView from "@/components/OrderHistoryView";

export default function AdminHistoryPage() {
  return (
    <OrderHistoryView
      endpoint="/api/admin/orders/history"
      additionBaseHref="/staff/addition"
      title="Historique des services"
    />
  );
}
