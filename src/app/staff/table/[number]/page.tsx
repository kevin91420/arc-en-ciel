"use client";

/**
 * /staff/table/[number] — Wrapper page that resolves the table number and
 * loads the active order (or offers to open one). All the heavy lifting lives
 * in the <OrderEditor /> client component so this page can stay tiny.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import OrderEditor from "../../_components/OrderEditor";
import type { OrderWithItems } from "@/lib/db/pos-types";

type PageProps = {
  params: Promise<{ number: string }>;
};

export default function TablePage({ params }: PageProps) {
  const { number } = use(params);
  const tableNumber = Number.parseInt(number, 10);
  const router = useRouter();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Pull the most recent active order for the table. If none → the user
   * is offered a "Nouvelle commande" button that prompts for covers. */
  useEffect(() => {
    if (!Number.isFinite(tableNumber)) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/staff/orders", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) router.push("/staff/login");
          throw new Error("Impossible de charger les commandes");
        }
        const data = (await res.json()) as { orders: OrderWithItems[] };
        if (cancelled) return;
        const existing =
          data.orders?.find(
            (o) =>
              o.table_number === tableNumber &&
              o.status !== "paid" &&
              o.status !== "cancelled"
          ) || null;
        setOrder(existing);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tableNumber, router]);

  if (!Number.isFinite(tableNumber) || tableNumber < 1 || tableNumber > 50) {
    return (
      <div className="px-8 py-10">
        <h1 className="text-2xl text-brown font-semibold">Table inconnue</h1>
        <p className="text-brown-light mt-1">Le numéro « {number} » n&apos;est pas valide.</p>
        <Link
          href="/staff/tables"
          className="inline-block mt-4 text-gold underline underline-offset-2"
        >
          ← Retour au plan de salle
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-8 py-10 text-brown-light">Chargement de la table {tableNumber}…</div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-10">
        <p className="text-red">{error}</p>
        <Link href="/staff/tables" className="text-gold underline mt-2 inline-block">
          ← Retour
        </Link>
      </div>
    );
  }

  if (!order) {
    return <NewOrderPrompt tableNumber={tableNumber} onCreated={setOrder} />;
  }

  return <OrderEditor order={order} tableNumber={tableNumber} onChange={setOrder} />;
}

/* ═════════════════════════════════════════════════════════ */
/*  New-order prompt — asks for guest count, creates the order */
/* ═════════════════════════════════════════════════════════ */

function NewOrderPrompt({
  tableNumber,
  onCreated,
}: {
  tableNumber: number;
  onCreated: (order: OrderWithItems) => void;
}) {
  const router = useRouter();
  const [covers, setCovers] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/staff/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          table_number: tableNumber,
          guest_count: covers,
          source: "dine_in",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de créer la commande");
      }
      const base = await res.json();
      /* The POST returns the raw Order row — fetch the full OrderWithItems
       * so the editor starts with an empty items array. */
      const full = await fetch(`/api/staff/orders/${base.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const order = (await full.json()) as OrderWithItems;
      onCreated(order);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <Link
        href="/staff/tables"
        className="inline-flex items-center gap-1.5 text-sm text-brown-light hover:text-gold transition"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Plan de salle
      </Link>

      <div className="mt-6 bg-white-warm border border-terracotta/40 rounded-2xl shadow-xl shadow-brown/10 p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brown text-cream flex items-center justify-center font-[family-name:var(--font-display)] text-3xl font-bold">
            {tableNumber}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-brown-light">
              Nouvelle commande
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-brown font-semibold">
              Table {tableNumber}
            </h1>
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-xs uppercase tracking-[0.2em] text-brown-light font-semibold mb-3">
            Nombre de couverts
          </label>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <button
                key={n}
                onClick={() => setCovers(n)}
                className={[
                  "h-14 min-w-[56px] px-5 rounded-xl border-2 text-lg font-bold transition",
                  covers === n
                    ? "bg-gold text-brown border-gold shadow-md"
                    : "bg-cream border-terracotta/40 text-brown hover:border-gold",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
            <div className="flex items-center gap-2 bg-cream border-2 border-terracotta/40 rounded-xl px-3">
              <button
                aria-label="Retirer un couvert"
                onClick={() => setCovers((c) => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-full hover:bg-brown/10 transition text-xl font-bold text-brown-light"
              >
                −
              </button>
              <span className="tabular-nums text-brown font-semibold w-6 text-center">
                {covers}
              </span>
              <button
                aria-label="Ajouter un couvert"
                onClick={() => setCovers((c) => Math.min(20, c + 1))}
                className="w-8 h-8 rounded-full hover:bg-brown/10 transition text-xl font-bold text-brown-light"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-sm text-red bg-red/5 border border-red/20 rounded px-3 py-2"
            >
              {err}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={create}
            disabled={submitting}
            className="flex-1 h-14 rounded-xl bg-brown text-cream text-base font-semibold tracking-wide hover:bg-brown-light disabled:opacity-60 transition"
          >
            {submitting
              ? "Ouverture…"
              : `Ouvrir la table ${tableNumber} (${covers} couvert${covers > 1 ? "s" : ""})`}
          </button>
          <button
            onClick={() => router.push("/staff/tables")}
            className="h-14 px-5 rounded-xl bg-cream border border-terracotta/40 text-brown hover:bg-cream-dark transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
