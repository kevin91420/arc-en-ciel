"use client";

/**
 * PendingClosureBanner — alerte affichée si la veille a eu de l'activité
 * mais n'est pas encore clôturée.
 *
 * Sprint 7b QW#10. Banner discret (amber) pour rappeler au manager.
 * Cliquer mène vers /admin/cloture.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCents } from "@/lib/format";
import type { DailyStatusInfo } from "@/lib/db/closures-types";

export default function PendingClosureBanner() {
  const [pending, setPending] = useState<DailyStatusInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    /* On lit le dismiss key par jour pour ne pas spammer */
    const today = new Date().toISOString().slice(0, 10);
    try {
      const lastDismiss = window.localStorage.getItem(
        "pending-closure-dismiss"
      );
      if (lastDismiss === today) {
        setDismissed(true);
        return;
      }
    } catch {
      /* localStorage indisponible (SSR / private mode) — on continue */
    }

    fetch("/api/admin/closures/pending", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { pending: DailyStatusInfo | null } | null) => {
        if (data?.pending) setPending(data.pending);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem("pending-closure-dismiss", today);
    } catch {
      /* ignore */
    }
  }

  if (dismissed || !pending) return null;

  const dateLabel = new Date(
    `${pending.service_date}T12:00:00`
  ).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 flex items-start gap-3"
        role="alert"
      >
        <div className="text-2xl flex-shrink-0" aria-hidden>
          ⏰
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-amber-900">
            Clôture de journée en attente
          </p>
          <p className="text-sm text-amber-800 mt-0.5 capitalize">
            <strong>{dateLabel}</strong> — {pending.orders_count} commande
            {pending.orders_count > 1 ? "s" : ""} payée
            {pending.orders_count > 1 ? "s" : ""} ·{" "}
            {formatCents(pending.revenue_ttc_cents)} de CA non clôturé.
          </p>
          <p className="text-[11px] text-amber-700/90 mt-1.5">
            Pour la traçabilité comptable, le manager doit clôturer la journée
            avant de fermer la session.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Link
            href="/admin/cloture"
            className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition active:scale-95"
          >
            Clôturer
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
            title="Masquer pour aujourd'hui"
          >
            Plus tard
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
