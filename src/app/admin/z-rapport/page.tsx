"use client";

/**
 * /admin/z-rapport — Z de fin de service.
 *
 * Imprimable (window.print) — le manager garde un papier signé chaque jour.
 * Date par défaut = aujourd'hui, navigation jour par jour comme l'historique.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCents } from "@/lib/format";
import PermGate from "@/components/PermGate";
import {
  useRestaurantBranding,
  formatLegalLines,
} from "@/lib/hooks/useRestaurantBranding";
import {
  CASH_DENOMINATIONS,
  type CashBreakdown,
} from "@/lib/db/pos-types";
import type { DailyStatusInfo } from "@/lib/db/closures-types";

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
    discount_total_cents?: number;
    discount_orders_count?: number;
  };
  discounts_by_reason?: Array<{
    reason: string;
    count: number;
    amount_cents: number;
  }>;
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
    cash_breakdown?: CashBreakdown | null;
  }>;
  cancellations: Array<{
    order_id: string;
    table_number: number | null;
    reason: string;
    refund_amount_cents: number;
    cancelled_at: string;
  }>;
}

const DISCOUNT_REASON_LABELS: Record<string, string> = {
  fidelite: "Client fidèle",
  reclamation: "Réclamation",
  invitation: "Invitation / VIP",
  happy_hour: "Happy hour / Promo",
  menu: "Menu / Formule",
  partenariat: "Partenaire",
  erreur: "Erreur maison",
  autre: "Autre raison",
};

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
  /* Sprint 7b QW#10 — état de clôture pour la date courante */
  const [closureStatus, setClosureStatus] = useState<DailyStatusInfo | null>(
    null
  );
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureBusy, setClosureBusy] = useState(false);
  const branding = useRestaurantBranding();

  /* Lit le param ?date= depuis l'URL au mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlDate = params.get("date");
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
      setDate(urlDate);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, closureRes] = await Promise.all([
        fetch(`/api/admin/z-report?date=${date}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/admin/closures/daily?date=${date}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!reportRes.ok) throw new Error(`HTTP ${reportRes.status}`);
      const data = (await reportRes.json()) as ZReport;
      setReport(data);
      setError(null);
      if (closureRes.ok) {
        const c = (await closureRes.json()) as DailyStatusInfo;
        setClosureStatus(c);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function confirmClosure(notes: string) {
    setClosureBusy(true);
    try {
      const res = await fetch("/api/admin/closures/daily", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_date: date, notes }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setClosureModalOpen(false);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setClosureBusy(false);
    }
  }

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

          {/* Sprint 7b QW#10 — Statut de clôture + bouton manager */}
          {closureStatus && (
            <ClosureBadge
              status={closureStatus}
              onClickClose={() => setClosureModalOpen(true)}
            />
          )}
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
            {(report.totals.discount_total_cents ?? 0) > 0 && (
              <p className="mt-1 text-sm text-brown-light text-right">
                Remises commerciales :{" "}
                <span className="font-bold text-amber-700 tabular-nums">
                  −{formatCents(report.totals.discount_total_cents ?? 0)}
                </span>
                <span className="text-[11px] text-brown-light/70 ml-2">
                  ({report.totals.discount_orders_count ?? 0} commande
                  {(report.totals.discount_orders_count ?? 0) > 1 ? "s" : ""})
                </span>
              </p>
            )}
          </section>

          {/* ── Remises par raison ── */}
          {report.discounts_by_reason && report.discounts_by_reason.length > 0 && (
            <section className="mt-6 pt-6 border-t border-brown/10">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-3">
                Remises commerciales
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                    <th className="py-1 text-left">Raison</th>
                    <th className="py-1 text-right">Nombre</th>
                    <th className="py-1 text-right">Montant total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.discounts_by_reason.map((d) => (
                    <tr
                      key={d.reason}
                      className="border-b border-brown/5 last:border-0"
                    >
                      <td className="py-1.5 text-brown capitalize">
                        {DISCOUNT_REASON_LABELS[d.reason] ?? d.reason}
                      </td>
                      <td className="py-1.5 text-right text-brown tabular-nums">
                        {d.count}
                      </td>
                      <td className="py-1.5 text-right text-amber-700 font-bold tabular-nums">
                        −{formatCents(d.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brown/30">
                    <td className="py-2 text-brown font-bold">Total</td>
                    <td className="py-2 text-right text-brown font-bold tabular-nums">
                      {report.discounts_by_reason.reduce(
                        (s, d) => s + d.count,
                        0
                      )}
                    </td>
                    <td className="py-2 text-right text-amber-700 font-bold tabular-nums">
                      −{formatCents(report.totals.discount_total_cents ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>
          )}

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

              {/* Détail des dénominations — Sprint 7b QW#5 — affiché pour
                  chaque session ayant un breakdown enregistré. Crucial pour
                  la traçabilité et l'audit comptable. */}
              {report.cash_sessions
                .filter((s) => hasBreakdown(s.cash_breakdown))
                .map((s) => (
                  <CashBreakdownDetails
                    key={`bd-${s.id}`}
                    breakdown={s.cash_breakdown!}
                    openedAt={s.opened_at}
                  />
                ))}
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

          {/* ── Footer — bloc juridique complet pour contrôle URSSAF ── */}
          <footer className="mt-8 pt-6 border-t-2 border-double border-brown/20 text-center text-xs text-brown-light space-y-2">
            <p className="font-semibold">Z #{report.date.replace(/-/g, "")}</p>

            {/* Bloc identité société */}
            <div className="text-[11px] leading-relaxed">
              {formatLegalLines(branding).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

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

      {/* Sprint 7b QW#10 — Modal de confirmation clôture */}
      <AnimatePresence>
        {closureModalOpen && closureStatus && (
          <ClosureConfirmModal
            date={date}
            ordersCount={closureStatus.orders_count}
            revenueCents={closureStatus.revenue_ttc_cents}
            busy={closureBusy}
            onCancel={() => setClosureModalOpen(false)}
            onConfirm={confirmClosure}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Sprint 7b QW#10 — Badge "Clôturé / À clôturer / Sans activité" + bouton
 * Manager only via PermGate.
 */
function ClosureBadge({
  status,
  onClickClose,
}: {
  status: DailyStatusInfo;
  onClickClose: () => void;
}) {
  if (status.status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm font-bold">
        <span aria-hidden>✓</span>
        Clôturé{" "}
        <span className="text-[10px] font-normal text-green-700/80">
          ·{" "}
          {status.closure?.closed_at
            ? new Date(status.closure.closed_at).toLocaleDateString("fr-FR")
            : ""}
        </span>
      </span>
    );
  }
  if (status.status === "open") {
    return (
      <PermGate
        perm="stats.z_report"
        fallback={
          <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-sm font-bold">
            <span aria-hidden>⏳</span>À clôturer (manager)
          </span>
        }
      >
        <button
          type="button"
          onClick={onClickClose}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition active:scale-95"
          title="Clôturer cette journée"
        >
          <span aria-hidden>🔒</span>
          Clôturer cette journée
        </button>
      </PermGate>
    );
  }
  /* empty */
  return (
    <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-cream border border-terracotta/30 text-brown-light/70 text-sm">
      <span aria-hidden>—</span>
      Pas d&apos;activité
    </span>
  );
}

/**
 * Sprint 7b QW#10 — Modal de confirmation de clôture journalière
 * (depuis la page Z report).
 */
function ClosureConfirmModal({
  date,
  ordersCount,
  revenueCents,
  busy,
  onCancel,
  onConfirm,
}: {
  date: string;
  ordersCount: number;
  revenueCents: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm no-print"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full z-50 no-print"
        role="dialog"
      >
        <div className="bg-white-warm rounded-2xl shadow-2xl border-2 border-gold/30 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown text-center">
            Clôturer la journée
          </h2>
          <p className="text-sm text-brown-light text-center mt-1 capitalize">
            {dateLabel}
          </p>
          <div className="mt-5 rounded-xl bg-cream border border-terracotta/20 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                  Commandes payées
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {ordersCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                  CA TTC
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {formatCents(revenueCents)}
                </div>
              </div>
            </div>
          </div>
          <label className="block mt-4">
            <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
              Note de clôture (optionnel)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Incident, événement particulier, observation…"
              maxLength={500}
              rows={2}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-sm text-brown focus:outline-none focus:border-gold resize-none"
            />
          </label>
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <p className="font-bold">⚠ Action définitive</p>
            <p className="mt-1">
              Une fois clôturée, la journée ne peut plus être modifiée. Le
              snapshot Z est figé pour audit comptable.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition border border-terracotta/30"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm(notes.trim())}
              disabled={busy}
              className="h-11 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition active:scale-95 disabled:opacity-50"
            >
              {busy ? "Clôture…" : "🔒 Clôturer définitivement"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
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

/* ═══════════════════════════════════════════════════════════
   Cash breakdown details — Sprint 7b QW#5
   Affiche le détail des dénominations comptées à la fermeture.
   Layout deux colonnes (billets / pièces) compact, imprimable.
   ═══════════════════════════════════════════════════════════ */

function hasBreakdown(b: CashBreakdown | null | undefined): boolean {
  if (!b) return false;
  return Object.values(b).some((v) => (v ?? 0) > 0);
}

function CashBreakdownDetails({
  breakdown,
  openedAt,
}: {
  breakdown: CashBreakdown;
  openedAt: string;
}) {
  const bills = CASH_DENOMINATIONS.filter((d) => d.type === "bill");
  const coins = CASH_DENOMINATIONS.filter((d) => d.type === "coin");
  const total = CASH_DENOMINATIONS.reduce(
    (sum, d) => sum + (breakdown[d.key] ?? 0) * d.cents,
    0
  );

  /* On ne montre que les lignes avec count > 0 — sinon le tableau est trop long */
  const renderRows = (denoms: typeof CASH_DENOMINATIONS) =>
    denoms
      .filter((d) => (breakdown[d.key] ?? 0) > 0)
      .map((d) => {
        const count = breakdown[d.key] ?? 0;
        return (
          <tr key={d.key} className="border-b border-brown/5 last:border-0">
            <td className="py-1 text-brown tabular-nums">{d.label}</td>
            <td className="py-1 text-right text-brown tabular-nums">×{count}</td>
            <td className="py-1 text-right text-brown font-semibold tabular-nums">
              {formatCents(count * d.cents)}
            </td>
          </tr>
        );
      });

  const billRows = renderRows(bills);
  const coinRows = renderRows(coins);

  return (
    <div className="mt-4 rounded-xl border border-terracotta/20 bg-cream/30 overflow-hidden">
      <div className="bg-brown/5 px-4 py-2 border-b border-terracotta/15 flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
          Détail caisse · session {timeFR(openedAt)}
        </p>
        <p className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums">
          {formatCents(total)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x divide-terracotta/15">
        {/* Billets */}
        <div className="px-4 py-3">
          <h4 className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold mb-1.5">
            Billets
          </h4>
          {billRows.length === 0 ? (
            <p className="text-[11px] text-brown-light/50 italic">—</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>{billRows}</tbody>
            </table>
          )}
        </div>

        {/* Pièces */}
        <div className="px-4 py-3 border-t sm:border-t-0 border-terracotta/15">
          <h4 className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold mb-1.5">
            Pièces
          </h4>
          {coinRows.length === 0 ? (
            <p className="text-[11px] text-brown-light/50 italic">—</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>{coinRows}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
