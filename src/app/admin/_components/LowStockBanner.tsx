"use client";

/**
 * LowStockBanner — alerte affichée si des items sont en rupture ou seuil bas.
 * Sprint 7b QW#12. Posé sur le dashboard admin.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StockStats {
  tracked_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value_cents: number;
}

export default function LowStockBanner() {
  const [stats, setStats] = useState<StockStats | null>(null);
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

    fetch("/api/admin/stock?filter=alerts", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stats: StockStats } | null) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {});
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

  if (dismissed || !stats) return null;
  const total = stats.low_stock_count + stats.out_of_stock_count;
  if (total === 0) return null;

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
          📦
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-red-dark">
            {stats.out_of_stock_count > 0
              ? "Plats en rupture"
              : "Stock bas"}
          </p>
          <p className="text-sm text-brown mt-0.5">
            {stats.out_of_stock_count > 0 && (
              <strong className="text-red-dark">
                {stats.out_of_stock_count} en rupture
              </strong>
            )}
            {stats.out_of_stock_count > 0 && stats.low_stock_count > 0 && " · "}
            {stats.low_stock_count > 0 && (
              <span className="text-amber-700">
                <strong>{stats.low_stock_count}</strong> en alerte seuil bas
              </span>
            )}
          </p>
          <p className="text-[11px] text-brown-light/80 mt-1.5">
            Pense à ré-approvisionner pour ne pas perdre de ventes ce service.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Link
            href="/admin/stock?filter=alerts"
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
