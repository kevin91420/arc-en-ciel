"use client";

/**
 * /staff/order/[id] — edit a specific order by id.
 *
 * Used for takeaway / delivery orders (no table number) and as a deep link
 * target from realtime notifications. Table-bound orders are edited via
 * /staff/table/[number] instead.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OrderEditor from "../../_components/OrderEditor";
import type { OrderWithItems } from "@/lib/db/pos-types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function OrderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/staff/orders/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) router.push("/staff/login");
          throw new Error("Commande introuvable");
        }
        const fresh = (await res.json()) as OrderWithItems;
        if (!cancelled) setOrder(fresh);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return <div className="px-8 py-10 text-brown-light">Chargement…</div>;
  }

  if (error || !order) {
    return (
      <div className="px-8 py-10">
        <p className="text-red">{error || "Commande introuvable"}</p>
        <Link href="/staff/tables" className="text-gold underline mt-2 inline-block">
          ← Retour au plan de salle
        </Link>
      </div>
    );
  }

  return (
    <OrderEditor
      order={order}
      tableNumber={order.table_number ?? undefined}
      onChange={setOrder}
    />
  );
}
