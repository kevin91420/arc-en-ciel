"use client";

/**
 * PaymentModal — encaissement.
 *
 * Supports 3 payment methods (CB / cash / ticket resto), an optional tip, and
 * a "split equally" helper that shows the per-head share without actually
 * creating multiple payment rows (the demo flow settles a single payment).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type { PaymentMethod } from "@/lib/db/pos-types";

type Props = {
  totalCents: number;
  guestCount: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, tipCents: number) => void | Promise<void>;
};

const METHODS: Array<{
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "card",
    label: "Carte bancaire",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18M7 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "cash",
    label: "Espèces",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    value: "ticket_resto",
    label: "Ticket resto",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path
          d="M4 7h16v10H4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

const TIP_PRESETS = [0, 5, 10, 15];

export default function PaymentModal({
  totalCents,
  guestCount,
  onClose,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [split, setSplit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tipCents = useMemo(
    () => Math.round((totalCents * tipPercent) / 100),
    [totalCents, tipPercent]
  );

  const grandTotal = totalCents + tipCents;
  const splitShare =
    split && guestCount > 1 ? Math.ceil(grandTotal / guestCount) : grandTotal;

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(method, tipCents);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-brown/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white-warm rounded-2xl shadow-2xl border border-terracotta/40 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-brown text-cream px-6 py-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-cream/60">
              Encaissement
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">
              {formatCents(grandTotal)}
            </h2>
            {tipCents > 0 && (
              <p className="text-xs text-cream/60 mt-0.5">
                Dont {formatCents(tipCents)} de pourboire
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 transition text-xl"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Payment method */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brown-light font-semibold mb-3">
              Mode de paiement
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const active = m.value === method;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={[
                      "h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 text-sm font-semibold transition",
                      active
                        ? "bg-gold/15 border-gold text-brown shadow-inner"
                        : "bg-cream border-terracotta/40 text-brown hover:border-gold",
                    ].join(" ")}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tip */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brown-light font-semibold mb-3">
              Pourboire
            </p>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((p) => {
                const active = tipPercent === p;
                return (
                  <button
                    key={p}
                    onClick={() => setTipPercent(p)}
                    className={[
                      "h-11 px-4 rounded-full text-sm font-semibold border transition",
                      active
                        ? "bg-brown text-cream border-brown"
                        : "bg-cream border-terracotta/40 text-brown hover:border-gold",
                    ].join(" ")}
                  >
                    {p === 0 ? "Aucun" : `+${p}%`}
                    {p > 0 && (
                      <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">
                        ({formatCents(Math.round((totalCents * p) / 100))})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split */}
          {guestCount > 1 && (
            <div className="bg-cream rounded-xl p-4 border border-terracotta/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brown">
                    Diviser en parts égales
                  </p>
                  <p className="text-xs text-brown-light">
                    {guestCount} couverts · {formatCents(splitShare)} par personne
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={split}
                  onClick={() => setSplit((v) => !v)}
                  className={[
                    "w-12 h-7 rounded-full relative transition",
                    split ? "bg-gold" : "bg-brown/20",
                  ].join(" ")}
                >
                  <motion.span
                    layout
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                    animate={{ left: split ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 600, damping: 32 }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-cream border-t border-terracotta/30 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-5 rounded-xl bg-white-warm border border-terracotta/40 text-brown font-medium hover:bg-cream-dark transition"
          >
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={submitting}
            className="flex-1 h-12 rounded-xl bg-red text-cream font-semibold tracking-wide shadow-lg shadow-red/20 hover:bg-red-dark disabled:opacity-60 transition"
          >
            {submitting
              ? "Validation…"
              : `Valider · ${formatCents(grandTotal)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
