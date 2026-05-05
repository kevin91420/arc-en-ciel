"use client";

/**
 * LowStockBanner — alerte affichée si des items / ingrédients sont en
 * rupture ou seuil bas. Sprint 7b QW#12 + Niveau 2.
 *
 * Priorité affichage :
 *   1. Ruptures ingrédients (risque immédiat)
 *   2. Alertes seuil bas ingrédients
 *   3. Ruptures items (Niveau 1)
 *
 * Posé sur le dashboard admin.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ItemStockStats {
  tracked_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value_cents: number;
}

interface IngredientStockStats {
  total_ingredients: number;
  active_ingredients: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value_cents: number;
}

export default function LowStockBanner() {
  const [itemStats, setItemStats] = useState<ItemStockStats | null>(null);
  const [ingStats, setIngStats] = useState<IngredientStockStats | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    /* Dismiss key par jour pour ne pas spammer */
    const today = new Date().toISOString().slice(0, 10);
    try {
      const last = window.localStorage.getItem("low-stock-dismiss");
      if (last === today) {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }

    const ac = new AbortController();
    Promise.all([
      fetch("/api/admin/stock?filter=alerts", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/admin/ingredients?filter=alerts", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([s, ing]) => {
      if (s?.stats) setItemStats(s.stats);
      if (ing?.stats) setIngStats(ing.stats);
    });

    return () => ac.abort();
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem("low-stock-dismiss", today);
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null;

  const ingTotal =
    (ingStats?.low_stock_count ?? 0) + (ingStats?.out_of_stock_count ?? 0);
  const itemTotal =
    (itemStats?.low_stock_count ?? 0) + (itemStats?.out_of_stock_count ?? 0);
  if (ingTotal === 0 && itemTotal === 0) return null;

  /* Priorité ingrédients (vrai stock) */
  const showIngredients = ingTotal > 0;
  const linkHref = showIngredients
    ? "/admin/stock/ingredients?filter=alerts"
    : "/admin/stock/items?filter=alerts";

  const title = showIngredients
    ? (ingStats?.out_of_stock_count ?? 0) > 0
      ? "Ingrédients en rupture"
      : "Stock ingrédients bas"
    : (itemStats?.out_of_stock_count ?? 0) > 0
      ? "Plats en rupture"
      : "Stock bas";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="rounded-xl border-2 border-red/30 bg-red/5 p-4 flex items-start gap-3"
        role="alert"
      >
        <div className="text-2xl flex-shrink-0" aria-hidden>
          {showIngredients ? "🥬" : "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-red-dark">
            {title}
          </p>
          <p className="text-sm text-brown mt-0.5">
            {showIngredients ? (
              <>
                {(ingStats?.out_of_stock_count ?? 0) > 0 && (
                  <strong className="text-red-dark">
                    {ingStats?.out_of_stock_count} en rupture
                  </strong>
                )}
                {(ingStats?.out_of_stock_count ?? 0) > 0 &&
                  (ingStats?.low_stock_count ?? 0) > 0 &&
                  " · "}
                {(ingStats?.low_stock_count ?? 0) > 0 && (
                  <span className="text-amber-700">
                    <strong>{ingStats?.low_stock_count}</strong> en alerte seuil bas
                  </span>
                )}
              </>
            ) : (
              <>
                {(itemStats?.out_of_stock_count ?? 0) > 0 && (
                  <strong className="text-red-dark">
                    {itemStats?.out_of_stock_count} en rupture
                  </strong>
                )}
                {(itemStats?.out_of_stock_count ?? 0) > 0 &&
                  (itemStats?.low_stock_count ?? 0) > 0 &&
                  " · "}
                {(itemStats?.low_stock_count ?? 0) > 0 && (
                  <span className="text-amber-700">
                    <strong>{itemStats?.low_stock_count}</strong> en alerte seuil bas
                  </span>
                )}
              </>
            )}
          </p>
          <p className="text-[11px] text-brown-light/80 mt-1.5">
            {showIngredients
              ? "Programme ta livraison fournisseur pour pas tomber en rade."
              : "Pense à ré-approvisionner pour ne pas perdre de ventes ce service."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Link
            href={linkHref}
            className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-red hover:bg-red-dark text-cream text-xs font-bold transition active:scale-95"
          >
            Voir le stock
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-[11px] text-brown-light/70 hover:text-brown font-semibold"
          >
            Plus tard
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
