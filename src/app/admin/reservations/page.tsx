"use client";

/**
 * Reservations management: date + status filters, table list with inline
 * status actions, and a right-side detail drawer (edit notes, assign table).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Reservation, ReservationStatus } from "@/lib/db/types";
import { formatFrenchDate, todayISO } from "../_lib/format";

const STATUS_OPTIONS: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmées" },
  { value: "cancelled", label: "Annulées" },
  { value: "completed", label: "Terminées" },
  { value: "no_show", label: "No-show" },
];

export default function ReservationsPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [status, setStatus] = useState<ReservationStatus | "all">("all");
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/reservations?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Reservation[] = await res.json();
      setItems(data);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateReservation(
    id: string,
    patch: Partial<Reservation>
  ): Promise<Reservation | null> {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const updated: Reservation = await res.json();
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (selected?.id === id) setSelected(updated);
      return updated;
    } catch (err) {
      alert(`Erreur: ${(err as Error).message}`);
      return null;
    } finally {
      setUpdatingId(null);
    }
  }

  const summary = useMemo(() => {
    const count = items.length;
    const guests = items.reduce((s, r) => s + r.guests, 0);
    return { count, guests };
  }, [items]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header + filters */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Planning
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Réservations
          </h1>
          <p className="mt-1 text-sm text-brown-light capitalize">
            {formatFrenchDate(date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus | "all")}
              className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            className="px-3 py-2 bg-brown text-cream rounded-lg text-sm font-semibold hover:bg-brown-light transition"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="flex flex-wrap gap-3">
        <StatBadge label="Réservations" value={summary.count} />
        <StatBadge label="Couverts" value={summary.guests} />
      </div>

      {/* List */}
      <div className="bg-white-warm rounded-xl border border-terracotta/30 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-brown-light text-sm">Chargement…</div>
        ) : error ? (
          <div className="p-6 bg-red/5 text-red-dark text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-brown-light text-sm italic">
            Aucune réservation pour ces filtres.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-cream/60 text-xs uppercase tracking-wider text-brown-light">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Heure</th>
                  <th className="px-4 py-3 text-left font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                  <th className="px-4 py-3 text-center font-semibold">Couverts</th>
                  <th className="px-4 py-3 text-center font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terracotta/25">
                {items.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.02 }}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer hover:bg-cream/50 transition"
                  >
                    <td className="px-4 py-3 font-[family-name:var(--font-display)] font-semibold text-brown">
                      {r.time}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brown">{r.customer_name}</div>
                      {r.special_occasion && (
                        <div className="text-[10px] tracking-wider uppercase text-gold font-semibold mt-0.5">
                          {r.special_occasion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brown-light font-mono text-xs">
                      {r.customer_phone}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-brown">
                      {r.guests}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-brown-light max-w-xs truncate">
                      {r.notes || <span className="italic opacity-50">—</span>}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QuickActions
                        reservation={r}
                        disabled={updatingId === r.id}
                        onAction={(patch) => updateReservation(r.id, patch)}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-terracotta/25">
              {items.map((r) => (
                <li
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="p-4 active:bg-cream/60 cursor-pointer"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-brown">
                      {r.time}
                    </span>
                    <span className="font-semibold text-brown truncate">
                      {r.customer_name}
                    </span>
                    <span className="ml-auto">
                      <StatusPill status={r.status} />
                    </span>
                  </div>
                  <p className="text-xs text-brown-light mt-1">
                    {r.guests} couverts · {r.customer_phone}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-brown-light mt-1 italic truncate">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <Drawer
            key={selected.id}
            reservation={selected}
            disabled={updatingId === selected.id}
            onClose={() => setSelected(null)}
            onUpdate={(patch) => updateReservation(selected.id, patch)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── sub-components ──────────────────────────── */

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white-warm border border-terracotta/40 rounded-lg px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold leading-none mt-1">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, { bg: string; fg: string; label: string }> = {
    pending: { bg: "bg-gold/15", fg: "text-gold", label: "En attente" },
    confirmed: { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Confirmée" },
    cancelled: { bg: "bg-red/10", fg: "text-red", label: "Annulée" },
    completed: { bg: "bg-brown/10", fg: "text-brown", label: "Terminée" },
    no_show: { bg: "bg-neutral-200", fg: "text-neutral-600", label: "No-show" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

function QuickActions({
  reservation,
  disabled,
  onAction,
}: {
  reservation: Reservation;
  disabled: boolean;
  onAction: (patch: Partial<Reservation>) => void;
}) {
  const { status } = reservation;
  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {status !== "confirmed" && status !== "completed" && (
        <ActionButton
          variant="primary"
          onClick={() => onAction({ status: "confirmed" })}
          disabled={disabled}
        >
          Confirmer
        </ActionButton>
      )}
      {status === "confirmed" && (
        <ActionButton
          variant="primary"
          onClick={() => onAction({ status: "completed" })}
          disabled={disabled}
        >
          Terminer
        </ActionButton>
      )}
      {status !== "cancelled" && (
        <ActionButton
          variant="danger"
          onClick={() => onAction({ status: "cancelled" })}
          disabled={disabled}
        >
          Annuler
        </ActionButton>
      )}
      {status === "confirmed" && (
        <ActionButton
          variant="ghost"
          onClick={() => onAction({ status: "no_show" })}
          disabled={disabled}
        >
          No-show
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    variant === "primary"
      ? "bg-brown text-cream hover:bg-brown-light"
      : variant === "danger"
        ? "bg-red/10 text-red hover:bg-red hover:text-cream"
        : "bg-cream text-brown-light hover:text-brown border border-terracotta/40";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] font-semibold px-2 py-1 rounded transition disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

function Drawer({
  reservation,
  disabled,
  onClose,
  onUpdate,
}: {
  reservation: Reservation;
  disabled: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<Reservation>) => Promise<Reservation | null> | void;
}) {
  // The parent supplies `key={reservation.id}`, so a new reservation selection
  // remounts this component with the correct initial values. No extra sync
  // effect needed — and keeping it out avoids clobbering unsaved edits.
  const [notes, setNotes] = useState(reservation.notes || "");
  const [tableNumber, setTableNumber] = useState<string>(
    reservation.table_number !== null && reservation.table_number !== undefined
      ? String(reservation.table_number)
      : ""
  );

  async function saveNotes() {
    await onUpdate({ notes: notes.trim() || null });
  }

  async function saveTable() {
    const n = tableNumber.trim();
    if (n === "") {
      await onUpdate({ table_number: null });
      return;
    }
    const parsed = parseInt(n, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 50) {
      alert("Table invalide (1-50).");
      return;
    }
    await onUpdate({ table_number: parsed });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-brown/30 backdrop-blur-sm z-40"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[28rem] bg-white-warm border-l border-terracotta/30 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white-warm border-b border-terracotta/30 px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
              Réservation
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold truncate">
              {reservation.customer_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-brown-light hover:text-brown hover:bg-cream transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="Date">
              {formatFrenchDate(reservation.date)}
            </InfoCell>
            <InfoCell label="Heure">{reservation.time}</InfoCell>
            <InfoCell label="Couverts">{reservation.guests}</InfoCell>
            <InfoCell label="Source">{reservation.source}</InfoCell>
            <InfoCell label="Téléphone">
              <a
                href={`tel:${reservation.customer_phone}`}
                className="text-gold underline"
              >
                {reservation.customer_phone}
              </a>
            </InfoCell>
            <InfoCell label="Email">
              {reservation.customer_email ? (
                <a
                  href={`mailto:${reservation.customer_email}`}
                  className="text-gold underline break-all"
                >
                  {reservation.customer_email}
                </a>
              ) : (
                <span className="italic opacity-50">—</span>
              )}
            </InfoCell>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                ["pending", "confirmed", "completed", "no_show", "cancelled"] as ReservationStatus[]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate({ status: s })}
                  disabled={disabled}
                  className={[
                    "text-xs px-3 py-1.5 rounded-full border transition font-semibold",
                    reservation.status === s
                      ? "bg-brown text-cream border-brown"
                      : "bg-cream text-brown-light border-terracotta/40 hover:border-gold hover:text-brown",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Numéro de table
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="—"
                className="flex-1 px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={saveTable}
                disabled={disabled}
                className="px-4 py-2 bg-gold text-brown font-semibold rounded-lg hover:bg-gold-light disabled:opacity-50 transition"
              >
                Assigner
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              placeholder="Allergies, préférences, info table…"
            />
            <button
              onClick={saveNotes}
              disabled={disabled}
              className="mt-2 px-4 py-2 bg-brown text-cream font-semibold rounded-lg hover:bg-brown-light disabled:opacity-50 transition text-sm"
            >
              Enregistrer les notes
            </button>
          </div>

          {reservation.special_occasion && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">
                Occasion spéciale
              </p>
              <p className="text-sm text-brown mt-1">
                {reservation.special_occasion}
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

function InfoCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream rounded-lg px-3 py-2 border border-terracotta/30">
      <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
        {label}
      </p>
      <p className="text-sm text-brown font-medium mt-0.5">{children}</p>
    </div>
  );
}
