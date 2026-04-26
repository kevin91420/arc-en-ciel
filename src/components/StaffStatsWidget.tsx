"use client";

/**
 * StaffStatsWidget — Live performance par serveur.
 *
 * Sait pioche les chiffres dans /api/admin/z-report (dans lequel `by_staff`
 * + `by_method` sont déjà calculés). Refresh toutes les 30 s pour le suivi
 * de service en temps réel.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";

interface ByStaff {
  staff_id: string;
  staff_name: string;
  orders_count: number;
  revenue_cents: number;
  tip_cents: number;
}

interface ByMethod {
  method: string;
  amount_cents: number;
  count: number;
}

interface ZReportLite {
  totals: {
    orders_count: number;
    revenue_ttc_cents: number;
    avg_ticket_cents: number;
  };
  by_staff: ByStaff[];
  by_method: ByMethod[];
}

const METHOD_LABELS: Record<string, { label: string; icon: string }> = {
  card: { label: "Carte", icon: "💳" },
  cash: { label: "Espèces", icon: "💵" },
  ticket_resto: { label: "TR", icon: "🎟" },
  other: { label: "Autre", icon: "•" },
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StaffStatsWidget() {
  const [data, setData] = useState<ZReportLite | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/z-report?date=${todayISO()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const d = (await res.json()) as ZReportLite;
      setData(d);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white-warm border border-terracotta/20 p-5 animate-pulse h-32" />
    );
  }

  if (!data || data.by_staff.length === 0) {
    return (
      <div className="rounded-2xl bg-white-warm border border-terracotta/20 p-6 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-brown-light/70 font-bold">
          Performance équipe
        </p>
        <p className="text-sm text-brown-light mt-2">
          Aucune commande encaissée aujourd&apos;hui pour l&apos;instant.
          Les statistiques par serveur s&apos;afficheront ici dès la première
          vente.
        </p>
      </div>
    );
  }

  const topRevenue = data.by_staff[0]?.revenue_cents ?? 1;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-bold">
            Performance équipe — aujourd&apos;hui
          </p>
          <p className="text-xs text-brown-light/70 mt-0.5">
            {data.totals.orders_count} commande
            {data.totals.orders_count > 1 ? "s" : ""} ·{" "}
            {formatCents(data.totals.revenue_ttc_cents)} encaissés ·
            ticket moyen{" "}
            <span className="font-bold text-brown">
              {formatCents(data.totals.avg_ticket_cents)}
            </span>
          </p>
        </div>
        <Link
          href="/admin/z-rapport"
          className="text-xs font-semibold text-gold hover:text-brown transition underline underline-offset-4"
        >
          Z complet →
        </Link>
      </div>

      <div className="rounded-2xl bg-white-warm border border-terracotta/20 overflow-hidden">
        <ul className="divide-y divide-terracotta/15">
          {data.by_staff.map((s, i) => {
            const ratio = s.revenue_cents / topRevenue;
            return (
              <motion.li
                key={s.staff_id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[40px_1fr_auto_auto_auto] items-center gap-3 px-4 py-3"
              >
                <span
                  className={[
                    "w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold",
                    i === 0
                      ? "bg-gold text-brown"
                      : i === 1
                        ? "bg-brown/20 text-brown"
                        : "bg-cream text-brown-light",
                  ].join(" ")}
                >
                  {i === 0 ? "👑" : `#${i + 1}`}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brown truncate">
                    {s.staff_name}
                  </p>
                  <div className="mt-1 h-1 rounded-full bg-cream overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: `${Math.max(8, ratio * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-brown-light tabular-nums w-14 text-right">
                  {s.orders_count} cmd
                </span>
                {s.tip_cents > 0 ? (
                  <span className="text-xs text-gold font-bold tabular-nums w-20 text-right">
                    +{formatCents(s.tip_cents)}
                  </span>
                ) : (
                  <span className="w-20" />
                )}
                <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums w-24 text-right">
                  {formatCents(s.revenue_cents)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Méthodes de paiement — barre stack */}
      {data.by_method.length > 0 && (
        <div className="rounded-2xl bg-white-warm border border-terracotta/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light/70 font-bold mb-2">
            Méthodes de paiement
          </p>
          <div className="flex gap-1 mb-2 h-2 rounded-full overflow-hidden bg-cream">
            {data.by_method.map((m, i) => {
              const ratio = m.amount_cents / data.totals.revenue_ttc_cents;
              const colors = [
                "bg-gold",
                "bg-brown",
                "bg-terracotta",
                "bg-brown-light/60",
              ];
              return (
                <div
                  key={m.method}
                  className={colors[i % colors.length]}
                  style={{ width: `${ratio * 100}%` }}
                  title={`${METHOD_LABELS[m.method]?.label ?? m.method} : ${formatCents(m.amount_cents)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-brown-light">
            {data.by_method.map((m) => {
              const opt = METHOD_LABELS[m.method];
              return (
                <span key={m.method} className="inline-flex items-center gap-1">
                  <span aria-hidden>{opt?.icon ?? "•"}</span>
                  <span className="font-semibold text-brown">
                    {opt?.label ?? m.method}
                  </span>
                  <span className="tabular-nums">
                    {formatCents(m.amount_cents)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
