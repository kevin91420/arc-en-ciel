"use client";

/**
 * PaymentModal — encaissement.
 *
 * Sprint 7b+ : 3 méthodes (CB / cash / ticket resto), pourboire optionnel,
 * split par couvert, ET surtout :
 *   - Cash : input "espèces reçues" + presets + calcul rendu de monnaie
 *     automatique. Empêche de valider si manque d'argent. Évite que le
 *     serveur galère à compter combien rendre. (Demande de la patronne
 *     boulangerie qui utilisait Angelo.)
 *   - Le bouton "Annuler" est toujours visible et explicite — si la CB
 *     plante, on annule, on change de méthode, on revalide.
 */

import { useEffect, useMemo, useState } from "react";
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
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M3 10h18M7 15h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: "cash",
    label: "Espèces",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
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
        <path
          d="M8 11h8M8 14h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const TIP_PRESETS = [0, 5, 10, 15];

/* Coupures fréquemment données par les clients en France. */
const CASH_PRESETS_CENTS = [500, 1000, 2000, 5000, 10000];

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

  /* Rendu de monnaie — input en cents (0 = pas encore renseigné) */
  const [cashReceivedCents, setCashReceivedCents] = useState<number>(0);

  const tipCents = useMemo(
    () => Math.round((totalCents * tipPercent) / 100),
    [totalCents, tipPercent]
  );

  const grandTotal = totalCents + tipCents;
  const splitShare =
    split && guestCount > 1 ? Math.ceil(grandTotal / guestCount) : grandTotal;

  /* Si on change de méthode, on reset le cash pour ne pas garder un
   * input fantôme sur card/ticket. */
  useEffect(() => {
    if (method !== "cash") setCashReceivedCents(0);
  }, [method]);

  /* Auto-fill au compte exact dès qu'on passe en cash + tip change */
  useEffect(() => {
    if (method === "cash" && cashReceivedCents === 0) {
      /* Pré-remplit avec le grandTotal (compte exact) — l'utilisateur
       * peut écraser avec un preset ou la valeur tapée par le client. */
      setCashReceivedCents(grandTotal);
    }
  }, [method, grandTotal, cashReceivedCents]);

  /* Le rendu = reçu - total. Négatif = manque d'argent (validation bloquée). */
  const changeCents = cashReceivedCents - grandTotal;
  const cashMissing = method === "cash" && changeCents < 0;
  const cashExact = method === "cash" && changeCents === 0;

  /* Détermine si on peut valider l'encaissement. */
  const canValidate = !submitting && !cashMissing;

  async function confirm() {
    if (!canValidate) return;
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
        className="w-full max-w-2xl bg-white-warm rounded-2xl shadow-2xl border border-terracotta/40 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-brown text-cream px-6 py-5 flex items-end justify-between gap-4 flex-shrink-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
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

          {/* CASH — Rendu de monnaie (visible uniquement en cash) */}
          {method === "cash" && (
            <CashChangeSection
              grandTotal={grandTotal}
              receivedCents={cashReceivedCents}
              onChange={setCashReceivedCents}
              changeCents={changeCents}
              missing={cashMissing}
              exact={cashExact}
            />
          )}

          {/* Split */}
          {guestCount > 1 && (
            <div className="bg-cream rounded-xl p-4 border border-terracotta/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brown">
                    Diviser en parts égales
                  </p>
                  <p className="text-xs text-brown-light">
                    {guestCount} couverts · {formatCents(splitShare)} par
                    personne
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
        <div className="bg-cream border-t border-terracotta/30 px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-5 rounded-xl bg-white-warm border border-terracotta/40 text-brown font-medium hover:bg-cream-dark transition"
            title="Annuler ce paiement (ex : si la CB plante, choisir une autre méthode)"
          >
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={!canValidate}
            className={[
              "flex-1 h-12 rounded-xl text-cream font-semibold tracking-wide shadow-lg transition",
              canValidate
                ? "bg-red shadow-red/20 hover:bg-red-dark"
                : "bg-brown-light/40 cursor-not-allowed",
            ].join(" ")}
          >
            {submitting
              ? "Validation…"
              : cashMissing
                ? `Manque ${formatCents(Math.abs(changeCents))}`
                : `Valider · ${formatCents(grandTotal)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Cash change section — rendu de monnaie
   ═══════════════════════════════════════════════════════════ */

function CashChangeSection({
  grandTotal,
  receivedCents,
  onChange,
  changeCents,
  missing,
  exact,
}: {
  grandTotal: number;
  receivedCents: number;
  onChange: (cents: number) => void;
  changeCents: number;
  missing: boolean;
  exact: boolean;
}) {
  /* Affiche la valeur en € (ex : "30,00") pour le custom input. */
  const [textValue, setTextValue] = useState<string>(
    receivedCents > 0 ? (receivedCents / 100).toFixed(2) : ""
  );

  /* Sync text → cents quand le state externe change (ex : preset cliqué). */
  useEffect(() => {
    setTextValue(receivedCents > 0 ? (receivedCents / 100).toFixed(2) : "");
  }, [receivedCents]);

  function setExact() {
    onChange(grandTotal);
  }

  function setPreset(cents: number) {
    /* Si le preset est inférieur au total, on l'ignore — ça ne fait pas
     * sens de "donner moins que le prix". Au contraire on snap au total. */
    if (cents < grandTotal) {
      onChange(grandTotal);
    } else {
      onChange(cents);
    }
  }

  function onTextChange(v: string) {
    /* On accepte les nombres avec virgule ou point. */
    const cleaned = v.replace(/[^0-9.,]/g, "").replace(",", ".");
    setTextValue(v);
    const num = parseFloat(cleaned);
    if (!Number.isNaN(num) && num >= 0) {
      onChange(Math.round(num * 100));
    } else if (cleaned === "") {
      onChange(0);
    }
  }

  /* Quels presets afficher : seulement ceux ≥ grandTotal pour ne pas confuser. */
  const visiblePresets = CASH_PRESETS_CENTS.filter((p) => p >= grandTotal);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-gold/10 rounded-xl p-4 border border-gold/40 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-brown-light font-semibold">
            Espèces reçues
          </p>
          <button
            type="button"
            onClick={setExact}
            className="text-xs text-brown-light hover:text-brown font-semibold underline-offset-2 hover:underline"
          >
            Compte exact ({formatCents(grandTotal)})
          </button>
        </div>

        {/* Presets grand format */}
        {visiblePresets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visiblePresets.map((cents) => {
              const active = receivedCents === cents;
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setPreset(cents)}
                  className={[
                    "h-12 px-4 rounded-xl text-base font-bold tabular-nums border-2 transition active:scale-95",
                    active
                      ? "bg-brown text-cream border-brown"
                      : "bg-white-warm border-terracotta/40 text-brown hover:border-gold",
                  ].join(" ")}
                >
                  {formatCents(cents)}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom input */}
        <div>
          <label className="block text-[11px] text-brown-light/80 font-semibold mb-1">
            Ou montant exact reçu
          </label>
          <div className="flex items-stretch">
            <input
              type="text"
              inputMode="decimal"
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="0,00"
              className="flex-1 px-3 py-2.5 rounded-l-lg bg-white-warm border border-terracotta/40 text-brown text-lg font-bold tabular-nums focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
            <span className="inline-flex items-center px-4 rounded-r-lg bg-cream border border-l-0 border-terracotta/40 text-brown font-bold">
              €
            </span>
          </div>
        </div>

        {/* Affichage rendu / manque */}
        <div
          className={[
            "rounded-xl px-4 py-3 flex items-center justify-between transition-colors",
            missing
              ? "bg-amber-50 border border-amber-300"
              : exact
                ? "bg-cream border border-terracotta/30"
                : "bg-green-50 border border-green-300",
          ].join(" ")}
        >
          <span
            className={[
              "text-xs uppercase tracking-wider font-bold",
              missing
                ? "text-amber-800"
                : exact
                  ? "text-brown-light"
                  : "text-green-800",
            ].join(" ")}
          >
            {missing
              ? "⚠ Manque"
              : exact
                ? "Compte exact"
                : "💸 À rendre"}
          </span>
          <span
            className={[
              "font-[family-name:var(--font-display)] text-3xl font-black tabular-nums",
              missing
                ? "text-amber-900"
                : exact
                  ? "text-brown-light/70"
                  : "text-green-700",
            ].join(" ")}
          >
            {missing
              ? formatCents(Math.abs(changeCents))
              : exact
                ? "—"
                : formatCents(changeCents)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
