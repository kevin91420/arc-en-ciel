"use client";

/**
 * /admin/cloture — Console de clôture journalière + mensuelle.
 *
 * Sprint 7b QW#10. Manager only via permissions.
 *
 * Affiche :
 *   - Calendrier du mois courant avec status par jour (closed/open/empty)
 *   - Bouton "Clôturer aujourd'hui" si journée ouverte
 *   - Liste des dernières clôtures (avec stats + manager)
 *   - Stats mensuelles (jours clôturés / ouverts / vides)
 *
 * Demandé par retour terrain (boulangerie patronne d'Angelo) :
 * "Avoir une clôture de journée pour le manager. Doit clôturer pour
 * commencer une nouvelle journée. Imprimable."
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import PermGate from "@/components/PermGate";
import type {
  DailyClosureFull,
  DailyStatusInfo,
} from "@/lib/db/closures-types";

const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface CalendarResponse {
  year: number;
  month: number;
  days: DailyStatusInfo[];
  stats: { closed: number; open: number; empty: number; total: number };
}

export default function ClosurePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [recentClosures, setRecentClosures] = useState<DailyClosureFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closeModal, setCloseModal] = useState<DailyStatusInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, recentRes] = await Promise.all([
        fetch(`/api/admin/closures/calendar?year=${year}&month=${month}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/admin/closures/daily?recent=1`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!calRes.ok) throw new Error("Calendar load failed");
      const calData = (await calRes.json()) as CalendarResponse;
      setCalendar(calData);

      if (recentRes.ok) {
        const r = (await recentRes.json()) as {
          closures: DailyClosureFull[];
        };
        setRecentClosures(r.closures);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function confirmClosure(notes: string) {
    if (!closeModal) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/closures/daily", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_date: closeModal.service_date,
          notes,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setCloseModal(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const todayDateStr = today.toISOString().slice(0, 10);
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  function navMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  /* Build calendar grid (offset to start on Monday) */
  const calendarGrid = useMemo(() => {
    if (!calendar) return [] as Array<DailyStatusInfo | null>;
    const firstDay = new Date(year, month - 1, 1);
    /* JS getDay() : 0=dim..6=sam. On veut 0=lun..6=dim. */
    const offset = (firstDay.getDay() + 6) % 7;
    const grid: Array<DailyStatusInfo | null> = [];
    for (let i = 0; i < offset; i++) grid.push(null);
    for (const d of calendar.days) grid.push(d);
    /* Pad la fin pour boucler à 7 colonnes */
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [calendar, year, month]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Workflow comptable
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Clôture de journée
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Clôture chaque service pour figer le Z définitivement. Réservé au
          manager. Snapshot immuable + audit pour la compta.
        </p>
      </motion.div>

      {/* Sélecteur mois */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5 bg-white-warm border border-terracotta/20 rounded-xl p-4 flex items-center gap-3 flex-wrap"
      >
        <button
          type="button"
          onClick={() => navMonth(-1)}
          className="w-10 h-10 rounded-full bg-cream border border-terracotta/30 hover:border-gold text-brown text-lg font-bold transition active:scale-95"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown min-w-48">
          {MONTH_LABELS[month - 1]} {year}
        </h2>
        <button
          type="button"
          onClick={() => navMonth(1)}
          className="w-10 h-10 rounded-full bg-cream border border-terracotta/30 hover:border-gold text-brown text-lg font-bold transition active:scale-95"
          aria-label="Mois suivant"
        >
          →
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth() + 1);
            }}
            className="text-xs text-brown-light hover:text-brown underline-offset-2 hover:underline ml-auto font-semibold"
          >
            ↺ Revenir au mois courant
          </button>
        )}
      </motion.section>

      {/* Stats mois */}
      {calendar && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <StatCard
            label="Clôturés"
            value={calendar.stats.closed}
            color="green"
            icon="✓"
          />
          <StatCard
            label="Ouverts"
            value={calendar.stats.open}
            color="amber"
            icon="⏳"
            urgent={calendar.stats.open > 0}
          />
          <StatCard
            label="Sans activité"
            value={calendar.stats.empty}
            color="brown-light"
            icon="—"
          />
        </motion.section>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {/* Calendar grid */}
      {!loading && calendar && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white-warm border border-terracotta/20 rounded-2xl p-3 sm:p-4 mb-8"
        >
          {/* Header weekdays */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAY_SHORT.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] uppercase tracking-wider text-brown-light/70 font-bold py-1"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((day, idx) => (
              <DayCell
                key={idx}
                day={day}
                isToday={day?.service_date === todayDateStr}
                onClickClose={() => setCloseModal(day)}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-terracotta/15 flex flex-wrap gap-3 text-[10px] text-brown-light/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-500" />
              Clôturé
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />À clôturer
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cream border border-terracotta/30" />
              Sans activité
            </div>
          </div>
        </motion.section>
      )}

      {/* Recent closures table */}
      {recentClosures.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white-warm border border-terracotta/20 rounded-2xl p-5"
        >
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
            Historique des clôtures
          </h2>
          <ul className="divide-y divide-terracotta/15">
            {recentClosures.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="py-3 flex items-baseline justify-between gap-3 text-sm flex-wrap"
              >
                <div className="min-w-0">
                  <p className="text-brown font-semibold">
                    {new Date(`${c.service_date}T12:00:00`).toLocaleDateString(
                      "fr-FR",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <p className="text-xs text-brown-light/80 mt-0.5">
                    Clôturée par {c.closed_by_name ?? "—"} ·{" "}
                    {new Date(c.closed_at).toLocaleString("fr-FR")}
                  </p>
                  {c.notes && (
                    <p className="text-[11px] text-brown-light/70 italic mt-1">
                      « {c.notes} »
                    </p>
                  )}
                </div>
                <div className="text-right tabular-nums flex-shrink-0">
                  <p className="font-[family-name:var(--font-display)] text-base font-bold text-brown">
                    {formatCents(c.revenue_ttc_cents)}
                  </p>
                  <p className="text-[10px] text-brown-light/70">
                    {c.orders_count} cmd · {c.guests_count} couverts
                  </p>
                </div>
                <Link
                  href={`/admin/z-rapport?date=${c.service_date}`}
                  className="text-[11px] text-gold font-semibold hover:underline"
                >
                  Voir le Z →
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Modal de confirmation */}
      <AnimatePresence>
        {closeModal && (
          <ClosureConfirmModal
            day={closeModal}
            busy={busy}
            onCancel={() => setCloseModal(null)}
            onConfirm={confirmClosure}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Day cell (calendar grid)
   ═══════════════════════════════════════════════════════════ */

function DayCell({
  day,
  isToday,
  onClickClose,
}: {
  day: DailyStatusInfo | null;
  isToday: boolean;
  onClickClose: () => void;
}) {
  if (!day) {
    return <div className="aspect-square" />;
  }

  const dayNumber = parseInt(day.service_date.split("-")[2], 10);
  const isFuture = day.service_date > new Date().toISOString().slice(0, 10);

  if (day.status === "closed") {
    return (
      <Link
        href={`/admin/z-rapport?date=${day.service_date}`}
        className={[
          "aspect-square rounded-lg border-2 p-1.5 flex flex-col transition group",
          "bg-green-50 border-green-300 hover:border-green-500",
          isToday ? "ring-2 ring-gold ring-offset-1" : "",
        ].join(" ")}
        title={`Clôturé le ${new Date(day.closure!.closed_at).toLocaleDateString("fr-FR")}`}
      >
        <span className="text-xs font-bold text-green-800 tabular-nums">
          {dayNumber}
        </span>
        <span className="mt-auto text-green-700 text-base">✓</span>
        <span className="text-[8px] tabular-nums text-green-700 truncate">
          {formatCents(day.revenue_ttc_cents)}
        </span>
      </Link>
    );
  }

  if (day.status === "open") {
    return (
      <PermGate
        perm="stats.z_report"
        fallback={
          <div
            className={[
              "aspect-square rounded-lg border-2 p-1.5 flex flex-col",
              "bg-amber-50 border-amber-400",
              isToday ? "ring-2 ring-gold ring-offset-1" : "",
            ].join(" ")}
            title="Manager seul peut clôturer"
          >
            <span className="text-xs font-bold text-amber-900 tabular-nums">
              {dayNumber}
            </span>
            <span className="mt-auto text-amber-700 text-base">⏳</span>
            <span className="text-[8px] tabular-nums text-amber-700 truncate">
              {day.orders_count} cmd
            </span>
          </div>
        }
      >
        <button
          type="button"
          onClick={onClickClose}
          disabled={isFuture}
          className={[
            "aspect-square rounded-lg border-2 p-1.5 flex flex-col text-left transition active:scale-95",
            "bg-amber-50 border-amber-400 hover:border-amber-600 hover:bg-amber-100",
            isToday ? "ring-2 ring-gold ring-offset-1" : "",
          ].join(" ")}
          title="Cliquer pour clôturer"
        >
          <span className="text-xs font-bold text-amber-900 tabular-nums">
            {dayNumber}
          </span>
          <span className="mt-auto text-amber-700 text-base">⏳</span>
          <span className="text-[8px] tabular-nums text-amber-700 truncate">
            {day.orders_count} cmd
          </span>
        </button>
      </PermGate>
    );
  }

  /* empty */
  return (
    <div
      className={[
        "aspect-square rounded-lg border p-1.5 flex flex-col",
        "bg-cream/50 border-terracotta/20",
        isToday ? "ring-2 ring-gold ring-offset-1" : "",
      ].join(" ")}
    >
      <span className="text-xs font-semibold text-brown-light/60 tabular-nums">
        {dayNumber}
      </span>
      <span className="mt-auto text-brown-light/30 text-xs">—</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  color,
  icon,
  urgent,
}: {
  label: string;
  value: number;
  color: "green" | "amber" | "brown-light";
  icon: string;
  urgent?: boolean;
}) {
  const palette: Record<typeof color, { bg: string; text: string; ring: string }> = {
    green: { bg: "bg-green-50", text: "text-green-700", ring: "border-green-300" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "border-amber-300" },
    "brown-light": {
      bg: "bg-cream",
      text: "text-brown-light",
      ring: "border-terracotta/20",
    },
  };
  const p = palette[color];
  return (
    <div
      className={[
        "rounded-2xl border p-4 flex items-center gap-3",
        p.bg,
        p.ring,
        urgent ? "animate-pulse" : "",
      ].join(" ")}
    >
      <div className={`text-2xl ${p.text}`}>{icon}</div>
      <div>
        <div
          className={`font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums leading-none ${p.text}`}
        >
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Closure confirm modal
   ═══════════════════════════════════════════════════════════ */

function ClosureConfirmModal({
  day,
  busy,
  onCancel,
  onConfirm,
}: {
  day: DailyStatusInfo;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");

  const dateLabel = new Date(`${day.service_date}T12:00:00`).toLocaleDateString(
    "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full z-50"
        role="dialog"
        aria-modal
      >
        <div className="bg-white-warm rounded-2xl shadow-2xl border-2 border-gold/30 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown text-center">
            Clôturer la journée
          </h2>
          <p className="text-sm text-brown-light text-center mt-1 capitalize">
            {dateLabel}
          </p>

          {/* Aperçu */}
          <div className="mt-5 rounded-xl bg-cream border border-terracotta/20 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                  Commandes payées
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {day.orders_count}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                  CA TTC
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                  {formatCents(day.revenue_ttc_cents)}
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
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

          {/* Avertissement */}
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <p className="font-bold">⚠ Action définitive</p>
            <p className="mt-1">
              Une fois clôturée, la journée ne peut plus être modifiée. Le
              snapshot Z est figé pour audit comptable.
            </p>
          </div>

          {/* Buttons */}
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
              {busy ? "Clôture en cours…" : "🔒 Clôturer définitivement"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
