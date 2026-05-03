"use client";

/**
 * /admin/comptabilite — Rapports CA mensuel / annuel / custom (Sprint 7b QW#3).
 *
 * Page dédiée aux rapports compta. Trois onglets :
 *   - Mois (sélecteur YYYY-MM, default = mois courant)
 *   - Année (sélecteur YYYY, default = année courante)
 *   - Personnalisé (deux date pickers, default = 30 derniers jours)
 *
 * Pour chaque période on affiche :
 *   - 6 stat cards : CA TTC, CA HT, TVA, nb commandes, panier moyen, jours actifs
 *   - Bloc identité société (pour export PDF)
 *   - Ventilation par moyen de paiement
 *   - Graphique simple par jour (CA quotidien)
 *   - Top 20 plats vendus avec quantités et CA
 *   - Bouton imprimer (window.print)
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Avoir le chiffre d'affaires du mois et de l'année pour les comptables,
 * avec le nombre d'articles vendus et la TVA."
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import {
  useRestaurantBranding,
  formatLegalLines,
} from "@/lib/hooks/useRestaurantBranding";
import type { PeriodReport } from "@/lib/db/reports-client";

type PeriodTab = "month" | "year" | "custom";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function currentYear(): string {
  return String(new Date().getFullYear());
}

export default function ComptabilitePage() {
  const [tab, setTab] = useState<PeriodTab>("month");
  const [monthValue, setMonthValue] = useState<string>(currentYearMonth());
  const [yearValue, setYearValue] = useState<string>(currentYear());
  const [customStart, setCustomStart] = useState<string>(thirtyDaysAgoISO());
  const [customEnd, setCustomEnd] = useState<string>(todayISO());
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const branding = useRestaurantBranding();

  /* Construit l'URL d'API selon l'onglet courant */
  const apiUrl = useMemo(() => {
    if (tab === "month") {
      return `/api/admin/reports/month?value=${encodeURIComponent(monthValue)}`;
    }
    if (tab === "year") {
      return `/api/admin/reports/year?value=${encodeURIComponent(yearValue)}`;
    }
    return `/api/admin/reports/custom?start=${encodeURIComponent(customStart)}&end=${encodeURIComponent(customEnd)}`;
  }, [tab, monthValue, yearValue, customStart, customEnd]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PeriodReport;
      setReport(data);
    } catch (e) {
      setError((e as Error).message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:py-4">
      {/* En-tête (caché à l'impression) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 print:hidden"
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-brown-light/70 hover:text-brown font-semibold mb-3 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour
        </Link>
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Comptabilité
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Rapports CA
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          CA mensuel, annuel ou personnalisé. Exporte un PDF imprimable pour
          ton expert-comptable.
        </p>
      </motion.div>

      {/* Tabs + sélecteurs (cachés à l'impression) */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5 print:hidden"
      >
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <TabButton
            active={tab === "month"}
            onClick={() => setTab("month")}
            label="Mois"
          />
          <TabButton
            active={tab === "year"}
            onClick={() => setTab("year")}
            label="Année"
          />
          <TabButton
            active={tab === "custom"}
            onClick={() => setTab("custom")}
            label="Personnalisé"
          />
        </div>

        <div className="bg-white-warm border border-terracotta/20 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          {tab === "month" && (
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="h-11 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          )}
          {tab === "year" && (
            <select
              value={yearValue}
              onChange={(e) => setYearValue(e.target.value)}
              className="h-11 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            >
              {Array.from({ length: 7 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                );
              })}
            </select>
          )}
          {tab === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-11 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <span className="text-brown-light text-sm">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-11 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="h-11 px-4 rounded-lg bg-cream border border-terracotta/30 hover:border-gold text-brown text-sm font-semibold transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "Chargement…" : "Actualiser"}
            </button>
            {report && !loading && (
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition active:scale-95 inline-flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"
                  />
                </svg>
                Imprimer
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3 print:hidden">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement du rapport…
        </p>
      )}

      {!loading && report && (
        <article className="bg-white-warm rounded-2xl shadow-sm border border-terracotta/20 print:shadow-none print:border-0 px-6 py-8 sm:px-10">
          {/* Header report */}
          <header className="mb-8 text-center pb-6 border-b border-terracotta/20">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">
              Rapport comptable
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-brown mt-2">
              {report.label}
            </h2>
            <p className="text-xs text-brown-light/70 mt-2">
              {periodKindLabel(report.kind)} · {report.totals.active_days} jour
              {report.totals.active_days > 1 ? "s" : ""} d&apos;activité sur{" "}
              {report.days_in_period} jour{report.days_in_period > 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-brown-light/50 mt-1">
              Généré le{" "}
              {new Date(report.generated_at).toLocaleString("fr-FR")}
            </p>
          </header>

          {/* Stats principales */}
          <section className="mb-10">
            <SectionTitle>Chiffre d&apos;affaires</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="CA TTC"
                value={formatCents(report.totals.revenue_ttc_cents)}
                tone="primary"
                emphasis
              />
              <StatCard
                label="CA HT"
                value={formatCents(report.totals.revenue_ht_cents)}
              />
              <StatCard
                label="TVA collectée"
                value={formatCents(report.totals.tax_cents)}
                tone="accent"
              />
              <StatCard
                label="Nb commandes"
                value={String(report.totals.orders_count)}
              />
              <StatCard
                label="Couverts"
                value={String(report.totals.guests_count)}
              />
              <StatCard
                label="Panier moyen"
                value={formatCents(report.totals.avg_ticket_cents)}
              />
            </div>

            {report.totals.tip_cents > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-cream/50 border border-terracotta/15 text-xs text-brown-light flex justify-between">
                <span>
                  Pourboires reçus (hors CA — versés au personnel)
                </span>
                <span className="font-bold text-brown tabular-nums">
                  {formatCents(report.totals.tip_cents)}
                </span>
              </div>
            )}

            {report.totals.cancelled_orders > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex justify-between">
                <span>Commandes annulées</span>
                <span className="font-bold tabular-nums">
                  {report.totals.cancelled_orders}
                </span>
              </div>
            )}
          </section>

          {/* Moyennes utiles */}
          {report.totals.active_days > 0 && (
            <section className="mb-10">
              <SectionTitle>Moyennes</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                  label="CA moyen / jour actif"
                  value={formatCents(report.totals.avg_daily_revenue_cents)}
                />
                <StatCard
                  label="CA / couvert"
                  value={formatCents(report.totals.avg_per_guest_cents)}
                />
                <StatCard
                  label="Commandes / jour actif"
                  value={(
                    report.totals.orders_count / report.totals.active_days
                  ).toFixed(1)}
                />
              </div>
            </section>
          )}

          {/* By payment method */}
          {report.by_method.length > 0 && (
            <section className="mb-10">
              <SectionTitle>Ventilation par moyen de paiement</SectionTitle>
              <div className="overflow-hidden rounded-xl border border-terracotta/20">
                <table className="w-full text-sm">
                  <thead className="bg-cream/50">
                    <tr className="text-left">
                      <th className="px-4 py-2.5 font-semibold text-brown">
                        Méthode
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown text-right">
                        Transactions
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown text-right">
                        Montant
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown text-right">
                        Part
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_method.map((m) => (
                      <tr
                        key={m.method}
                        className="border-t border-terracotta/15"
                      >
                        <td className="px-4 py-2.5 font-medium text-brown">
                          {prettyMethod(m.method)}
                        </td>
                        <td className="px-4 py-2.5 text-brown-light tabular-nums text-right">
                          {m.count}
                        </td>
                        <td className="px-4 py-2.5 text-brown font-semibold tabular-nums text-right">
                          {formatCents(m.amount_cents)}
                        </td>
                        <td className="px-4 py-2.5 text-brown-light tabular-nums text-right">
                          {m.pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* By weekday */}
          {report.totals.orders_count > 5 && (
            <section className="mb-10">
              <SectionTitle>Répartition par jour de la semaine</SectionTitle>
              <WeekdayChart data={report.by_weekday} />
            </section>
          )}

          {/* By day */}
          {report.by_day.length > 1 && (
            <section className="mb-10">
              <SectionTitle>Évolution quotidienne</SectionTitle>
              <DayChart data={report.by_day} />
            </section>
          )}

          {/* Top items */}
          {report.top_items.length > 0 && (
            <section className="mb-10">
              <SectionTitle>Top des plats vendus</SectionTitle>
              <div className="overflow-hidden rounded-xl border border-terracotta/20">
                <table className="w-full text-sm">
                  <thead className="bg-cream/50">
                    <tr className="text-left">
                      <th className="px-4 py-2.5 font-semibold text-brown">
                        #
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown">
                        Plat
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown text-right">
                        Quantité
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-brown text-right">
                        CA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_items.map((it, i) => (
                      <tr
                        key={it.menu_item_id}
                        className="border-t border-terracotta/15"
                      >
                        <td className="px-4 py-2.5 text-brown-light tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-brown">
                          {it.menu_item_name}
                        </td>
                        <td className="px-4 py-2.5 text-brown tabular-nums text-right">
                          {it.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-brown-light tabular-nums text-right">
                          {formatCents(it.revenue_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Footer — bloc identité société (pour expert-comptable) */}
          <footer className="mt-10 pt-6 border-t-2 border-double border-brown/20 text-center text-xs text-brown-light space-y-1">
            <div className="text-[11px] leading-relaxed">
              {formatLegalLines(branding).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-brown-light/50">
              Rapport généré par {branding.name} · v0.7b
            </p>
          </footer>
        </article>
      )}

      {!loading && report && report.totals.orders_count === 0 && (
        <div className="text-center py-16 text-brown-light/70 print:hidden">
          <p className="text-5xl mb-3" aria-hidden>
            📊
          </p>
          <p>Aucune commande payée sur cette période.</p>
        </div>
      )}

      {/* Styles d'impression */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════════════════ */

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 px-5 rounded-full text-sm font-semibold transition active:scale-95",
        active
          ? "bg-brown text-cream shadow-md"
          : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
      {children}
    </h3>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  emphasis,
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent";
  emphasis?: boolean;
}) {
  const toneClasses: Record<typeof tone, { text: string; border: string }> = {
    default: { text: "text-brown", border: "border-terracotta/20" },
    primary: { text: "text-brown", border: "border-gold/40 bg-gold/5" },
    accent: { text: "text-amber-900", border: "border-amber-300 bg-amber-50" },
  };
  const cls = toneClasses[tone];
  return (
    <div
      className={[
        "rounded-xl bg-white-warm border p-4",
        cls.border,
        emphasis ? "shadow-sm" : "",
      ].join(" ")}
    >
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold leading-none tabular-nums",
          emphasis ? "text-3xl" : "text-2xl",
          cls.text,
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-2">
        {label}
      </div>
    </div>
  );
}

function WeekdayChart({
  data,
}: {
  data: Array<{
    weekday: number;
    weekday_label: string;
    orders: number;
    revenue_cents: number;
  }>;
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue_cents), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((d) => {
        const pct = (d.revenue_cents / maxRevenue) * 100;
        return (
          <div key={d.weekday} className="text-center">
            <div className="h-32 flex items-end justify-center bg-cream/30 rounded-t-lg overflow-hidden border border-terracotta/15 border-b-0">
              <div
                className="w-full bg-gold/70 transition-all"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${d.weekday_label}: ${formatCents(d.revenue_cents)}`}
              />
            </div>
            <div className="border-t-2 border-brown/30 pt-1.5 text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
              {d.weekday_label.slice(0, 3)}
            </div>
            <div className="text-[10px] text-brown tabular-nums mt-0.5">
              {formatCents(d.revenue_cents)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayChart({
  data,
}: {
  data: Array<{ date: string; orders: number; revenue_cents: number }>;
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue_cents), 1);
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-1 min-w-max h-32 px-1"
        style={{ minWidth: `${data.length * 24}px` }}
      >
        {data.map((d) => {
          const pct = (d.revenue_cents / maxRevenue) * 100;
          return (
            <div
              key={d.date}
              className="flex-1 min-w-5 bg-gold/60 hover:bg-gold transition rounded-t-sm group relative"
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${d.date}: ${formatCents(d.revenue_cents)} · ${d.orders} cmd`}
            >
              <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-brown text-cream text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                {formatCents(d.revenue_cents)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-brown-light/60 mt-1 px-1">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function periodKindLabel(kind: PeriodReport["kind"]): string {
  switch (kind) {
    case "day":
      return "Journée";
    case "week":
      return "Semaine";
    case "month":
      return "Mensuel";
    case "year":
      return "Annuel";
    case "custom":
      return "Période personnalisée";
  }
}

function prettyMethod(m: string): string {
  const map: Record<string, string> = {
    card: "Carte bancaire",
    cash: "Espèces",
    ticket_resto: "Ticket restaurant",
    voucher: "Avoir",
    other: "Autre",
  };
  return map[m] ?? m;
}
