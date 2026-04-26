"use client";

/**
 * /admin/z-rapport — Z de fin de service.
 *
 * Imprimable (window.print) — le manager garde un papier signé chaque jour.
 * Date par défaut = aujourd'hui, navigation jour par jour comme l'historique.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import { useRestaurantBranding } from "@/lib/hooks/useRestaurantBranding";

interface ZReport {
  date: string;
  generated_at: string;
  totals: {
    orders_count: number;
    guests_count: number;
    revenue_ht_cents: number;
    revenue_ttc_cents: number;
    tax_cents: number;
    tip_cents: number;
    avg_ticket_cents: number;
    avg_per_guest_cents: number;
    cancelled_orders: number;
    refund_total_cents: number;
  };
  by_method: Array<{ method: string; amount_cents: number; count: number }>;
  by_staff: Array<{
    staff_id: string;
    staff_name: string;
    orders_count: number;
    revenue_cents: number;
    tip_cents: number;
  }>;
  top_items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    revenue_cents: number;
  }>;
  by_hour: Array<{ hour: number; orders: number; revenue_cents: number }>;
  cash_sessions: Array<{
    id: string;
    opened_at: string;
    closed_at: string | null;
    opening_amount_cents: number;
    expected_cash_cents: number | null;
    actual_cash_cents: number | null;
    variance_cents: number | null;
  }>;
  cancellations: Array<{
    order_id: string;
    table_number: number | null;
    reason: string;
    refund_amount_cents: number;
    cancelled_at: string;
  }>;
}

const METHOD_LABELS: Record<string, string> = {
  card: "Carte bancaire",
  cash: "Espèces",
  ticket_resto: "Ticket Restaurant",
  other: "Autre",
};

const REASON_LABELS: Record<string, string> = {
  error: "Erreur de commande",
  refused: "Plat refusé",
  gesture: "Geste commercial",
  other: "Autre",
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDay(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function frenchDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeFR(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ZReportPage() {
  const [date, setDate] = useState(todayISO());
  const [report, setReport] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const branding = useRestaurantBranding();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/z-report?date=${date}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ZReport;
      setReport(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isToday = date === todayISO();
  const peakHour = report?.by_hour.reduce(
    (max, h) => (h.orders > max.orders ? h : max),
    { hour: 0, orders: 0, revenue_cents: 0 }
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .z-report { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="no-print flex items-end justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-brown-light hover:text-brown font-semibold transition mb-3"
          >
            ← Retour au tableau de bord
          </Link>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-bold">
            Service
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown font-semibold mt-1">
            Z de fin de service
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-white-warm border border-terracotta/30 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, -1))}
              className="w-8 h-8 rounded-full text-brown-light hover:bg-cream hover:text-brown transition flex items-center justify-center"
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-brown font-semibold border-0 focus:outline-none focus:ring-0 tabular-nums"
            />
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, 1))}
              disabled={isToday}
              className="w-8 h-8 rounded-full text-brown-light hover:bg-cream hover:text-brown transition flex items-center justify-center disabled:opacity-30"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-lg bg-brown text-cream text-sm font-semibold hover:bg-brown-light transition inline-flex items-center gap-2 active:scale-95"
          >
            🖨 Imprimer le Z
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print rounded-xl bg-red/10 border border-red/30 text-red-dark p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-center py-12">Chargement…</p>
      )}

      {report && !loading && (
        <article className="z-report bg-white-warm border border-terracotta/30 rounded-2xl px-6 sm:px-10 py-8 shadow-sm">
          {/* ── Header ── */}
          <header className="text-center pb-4 border-b-2 border-double border-brown/20">
            <p className="font-[family-name:var(--font-script)] text-gold-light text-xl">
              {branding.name}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown mt-1">
              Z de fin de service
            </h2>
            <p className="text-sm text-brown-light mt-1 capitalize">
              {frenchDate(report.date)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-brown-light/70 mt-2 font-mono">
              Émis le {new Date(report.generated_at).toLocaleString("fr-FR")}
              {" · "}#{report.date.replace(/-/g, "")}
            </p>
          </header>

          {/* ── Totaux ── */}
          <section className="mt-6">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
              Récapitulatif
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat
                label="Commandes"
                value={String(report.totals.orders_count)}
              />
              <Stat
                label="Couverts"
                value={String(report.totals.guests_count)}
              />
              <Stat
                label="Ticket moyen"
                value={formatCents(report.totals.avg_ticket_cents)}
              />
              <Stat
                label="Par couvert"
                value={formatCents(report.totals.avg_per_guest_cents)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat
                label="CA HT"
                value={formatCents(report.totals.revenue_ht_cents)}
                tone="muted"
              />
              <Stat
                label="TVA"
                value={formatCents(report.totals.tax_cents)}
                tone="muted"
              />
              <Stat
                label="CA TTC"
                value={formatCents(report.totals.revenue_ttc_cents)}
                tone="hero"
              />
            </div>

            {report.totals.tip_cents > 0 && (
              <p className="mt-3 text-sm text-brown-light text-right">
                Pourboires perçus :{" "}
                <span className="font-bold text-gold tabular-nums">
                  {formatCents(report.totals.tip_cents)}
                </span>
              </p>
            )}
          </section>

          {/* ── Méthodes de paiement ── */}
          <section className="mt-6 pt-6 border-t border-brown/10">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
              Ventilation par méthode
            </h3>
            {report.by_method.length === 0 ? (
              <p className="text-sm text-brown-light italic">
                Aucun paiement enregistré.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {report.by_method.map((m) => (
                    <tr
                      key={m.method}
                      className="border-b border-brown/5 last:border-0"
                    >
                      <td className="py-2 text-brown">
                        {METHOD_LABELS[m.method] ?? m.method}
                      </td>
                      <td className="py-2 text-right text-brown-light text-xs">
                        {m.count} encaissement{m.count > 1 ? "s" : ""}
                      </td>
                      <td className="py-2 text-right font-bold text-brown tabular-nums">
                        {formatCents(m.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── Caisse ── */}
          {report.cash_sessions.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Caisse
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                    <th className="py-1 text-left">Ouverte</th>
                    <th className="py-1 text-left">Fermée</th>
                    <th className="py-1 text-right">Fond</th>
                    <th className="py-1 text-right">Attendu</th>
                    <th className="py-1 text-right">Compté</th>
                    <th className="py-1 text-right">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cash_sessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-brown/5 last:border-0"
                    >
                      <td className="py-1.5 text-brown tabular-nums">
                        {timeFR(s.opened_at)}
                      </td>
                      <td className="py-1.5 text-brown tabular-nums">
                        {s.closed_at ? timeFR(s.closed_at) : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCents(s.opening_amount_cents)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {s.expected_cash_cents != null
                          ? formatCents(s.expected_cash_cents)
                          : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {s.actual_cash_cents != null
                          ? formatCents(s.actual_cash_cents)
                          : "—"}
                      </td>
                      <td
                        className={[
                          "py-1.5 text-right font-bold tabular-nums",
                          s.variance_cents == null
                            ? "text-brown-light/50"
                            : s.variance_cents === 0
                              ? "text-green-700"
                              : s.variance_cents > 0
                                ? "text-amber-700"
                                : "text-red",
                        ].join(" ")}
                      >
                        {s.variance_cents == null
                          ? "—"
                          : s.variance_cents === 0
                            ? "± 0,00 €"
                            : `${s.variance_cents > 0 ? "+" : ""}${formatCents(s.variance_cents)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Performance par serveur ── */}
          {report.by_staff.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Par serveur
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                    <th className="py-1 text-left">Serveur</th>
                    <th className="py-1 text-right">Cmd</th>
                    <th className="py-1 text-right">Pourboires</th>
                    <th className="py-1 text-right">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_staff.map((s) => (
                    <tr
                      key={s.staff_id}
                      className="border-b border-brown/5 last:border-0"
                    >
                      <td className="py-1.5 text-brown font-semibold">
                        {s.staff_name}
                      </td>
                      <td className="py-1.5 text-right text-brown-light tabular-nums">
                        {s.orders_count}
                      </td>
                      <td className="py-1.5 text-right text-gold tabular-nums">
                        {formatCents(s.tip_cents)}
                      </td>
                      <td className="py-1.5 text-right font-bold text-brown tabular-nums">
                        {formatCents(s.revenue_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Top plats ── */}
          {report.top_items.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Top des plats vendus
              </h3>
              <ol className="space-y-1 text-sm">
                {report.top_items.map((it, i) => (
                  <li
                    key={it.menu_item_id}
                    className="flex items-center gap-3 py-1 border-b border-brown/5 last:border-0"
                  >
                    <span className="w-6 text-brown-light/60 text-xs font-bold tabular-nums">
                      #{i + 1}
                    </span>
                    <span className="flex-1 text-brown truncate">
                      {it.menu_item_name}
                    </span>
                    <span className="text-brown-light text-xs tabular-nums">
                      ×{it.quantity}
                    </span>
                    <span className="font-bold text-brown tabular-nums w-20 text-right">
                      {formatCents(it.revenue_cents)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ── Heatmap heures ── */}
          {report.by_hour.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Activité par heure
                {peakHour && peakHour.orders > 0 && (
                  <span className="ml-3 text-xs text-brown-light font-normal">
                    Pic à {peakHour.hour}h ({peakHour.orders} cmd)
                  </span>
                )}
              </h3>
              <div className="flex items-end gap-1 h-20">
                {Array.from({ length: 24 }).map((_, h) => {
                  const slot = report.by_hour.find((x) => x.hour === h);
                  const ratio =
                    peakHour && peakHour.orders > 0 && slot
                      ? slot.orders / peakHour.orders
                      : 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 flex flex-col items-center gap-0.5"
                    >
                      <div
                        className="w-full rounded-t bg-gold/70"
                        style={{ height: `${Math.max(2, ratio * 64)}px` }}
                        title={`${h}h — ${slot?.orders ?? 0} commandes`}
                      />
                      <span className="text-[8px] text-brown-light/60 tabular-nums">
                        {h % 3 === 0 ? `${h}h` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Annulations ── */}
          {report.cancellations.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Annulations & remboursements
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                    <th className="py-1 text-left">Heure</th>
                    <th className="py-1 text-left">Table</th>
                    <th className="py-1 text-left">Motif</th>
                    <th className="py-1 text-right">Remboursé</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cancellations.map((c) => (
                    <tr
                      key={c.order_id}
                      className="border-b border-brown/5 last:border-0"
                    >
                      <td className="py-1.5 text-brown-light tabular-nums">
                        {timeFR(c.cancelled_at)}
                      </td>
                      <td className="py-1.5 text-brown">
                        {c.table_number != null ? `T${c.table_number}` : "—"}
                      </td>
                      <td className="py-1.5 text-brown-light text-xs">
                        {REASON_LABELS[c.reason] ?? c.reason}
                      </td>
                      <td className="py-1.5 text-right font-bold text-red tabular-nums">
                        {c.refund_amount_cents > 0
                          ? `− ${formatCents(c.refund_amount_cents)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Footer ── */}
          <footer className="mt-8 pt-6 border-t-2 border-double border-brown/20 text-center text-xs text-brown-light">
            <p>
              Z #{report.date.replace(/-/g, "")} ·{" "}
              {[branding.legal_name, branding.siret && `SIRET ${branding.siret}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-6 flex items-end gap-8 justify-center">
              <div className="border-t border-brown/30 w-32 pt-1">
                <span className="text-[10px] uppercase tracking-wider">
                  Signature manager
                </span>
              </div>
              <div className="border-t border-brown/30 w-32 pt-1">
                <span className="text-[10px] uppercase tracking-wider">
                  Date / heure
                </span>
              </div>
            </div>
          </footer>
        </article>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "hero" | "muted";
}) {
  return (
    <div
      className={[
        "rounded-xl px-4 py-3 border",
        tone === "hero"
          ? "bg-gold/15 border-gold/40"
          : tone === "muted"
            ? "bg-cream border-terracotta/15"
            : "bg-white-warm border-terracotta/20",
      ].join(" ")}
    >
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold text-brown tabular-nums leading-none",
          tone === "hero" ? "text-2xl" : "text-xl",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
        {label}
      </div>
    </div>
  );
}
