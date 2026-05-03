"use client";

/**
 * /staff/caisse — Ouverture / fermeture de la caisse.
 *
 * Workflow simple :
 *   1. Pas de session ouverte → "Ouvrir la caisse" demande le fond initial
 *   2. Session ouverte → affichage live :
 *        - Fond initial
 *        - Encaissements espèces de la session (sum positif - rembours.)
 *        - Total attendu en caisse
 *        - Bouton "Fermer la caisse" → demande le compte physique
 *   3. À la fermeture → calcule l'écart, fige la session
 *
 * Toutes les sessions du jour sont listées en bas (audit + manager view).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import {
  CASH_DENOMINATIONS,
  computeCashBreakdownTotal,
  type CashBreakdown,
  type CashSession,
} from "@/lib/db/pos-types";

type CurrentResponse =
  | { session: null }
  | {
      session: CashSession;
      takings_cents: number;
      expected_cents: number;
    };

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CaissePage() {
  const [current, setCurrent] = useState<CurrentResponse | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/cash/current", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CurrentResponse;
      setCurrent(data);

      /* Pull history of today's sessions for the audit panel. */
      const histRes = await fetch(
        `/api/admin/orders/history?date=${todayISO()}`,
        { credentials: "include", cache: "no-store" }
      ).catch(() => null);
      void histRes; /* Not used — placeholder for a future cash-sessions
                       admin endpoint. We keep the local history empty. */
      setHistory([]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function handleOpen(amountCents: number, notes: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/staff/cash/open", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opening_amount_cents: amountCents,
          notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setOpenModal(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(
    actualCents: number,
    notes: string,
    breakdown?: CashBreakdown
  ) {
    if (!current || current.session === null) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/staff/cash/${current.session.id}/close`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actual_cash_cents: actualCents,
            notes,
            cash_breakdown: breakdown,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setCloseModal(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold font-bold">
            Service
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown font-semibold mt-1">
            Caisse
          </h1>
          <p className="text-sm text-brown-light mt-1">
            Ouvrez la caisse en début de service, fermez-la à la fin pour
            calculer l&apos;écart espèces.
          </p>
        </div>
        <Link
          href="/staff/tables"
          className="text-xs font-semibold text-brown-light hover:text-brown inline-flex items-center gap-1.5"
        >
          ← Plan de salle
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red/10 border border-red/30 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {!loading && current && current.session === null && (
        <div className="rounded-3xl bg-white-warm border border-terracotta/20 p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden>
            🔒
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
            Caisse fermée
          </h2>
          <p className="text-sm text-brown-light max-w-sm mx-auto mt-2">
            Ouvrez la caisse en indiquant le fond initial pour démarrer le
            service. Les encaissements espèces seront tracés en direct.
          </p>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-6 py-3 rounded-full transition active:scale-95"
          >
            🔑 Ouvrir la caisse
          </button>
        </div>
      )}

      {!loading && current && current.session !== null && (
        <div className="rounded-3xl bg-white-warm border border-green-300 p-6 md:p-8">
          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-green-700 font-bold inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Caisse ouverte
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mt-1">
                Depuis {timeOf(current.session.opened_at)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCloseModal(true)}
              className="inline-flex items-center gap-2 bg-red text-cream text-sm font-bold px-5 py-2.5 rounded-full hover:bg-red-dark transition active:scale-95"
            >
              🔒 Fermer la caisse
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard
              label="Fond initial"
              value={formatCents(current.session.opening_amount_cents)}
              icon="💼"
            />
            <KpiCard
              label="Encaissements espèces"
              value={formatCents(current.takings_cents)}
              icon="💵"
              tone={
                current.takings_cents < 0 ? "warning" : "ok"
              }
            />
            <KpiCard
              label="Total attendu"
              value={formatCents(current.expected_cents)}
              icon="🏦"
              big
            />
          </div>

          {current.session.notes && (
            <div className="mt-4 p-3 rounded-lg bg-cream border border-terracotta/20 text-xs text-brown-light italic">
              {current.session.notes}
            </div>
          )}
        </div>
      )}

      {/* History — sessions du jour qui sont fermées */}
      {history.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-brown-light/70 font-bold mb-3">
            Sessions précédentes
          </h2>
          <ul className="space-y-2">
            {history.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {openModal && (
          <CashOpenModal
            busy={busy}
            onCancel={() => setOpenModal(false)}
            onConfirm={handleOpen}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {closeModal && current && current.session !== null && (
          <CashCloseModal
            expectedCents={current.expected_cents}
            busy={busy}
            onCancel={() => setCloseModal(false)}
            onConfirm={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function KpiCard({
  label,
  value,
  icon,
  big,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
  big?: boolean;
  tone?: "ok" | "warning";
}) {
  return (
    <div
      className={[
        "p-4 rounded-2xl border",
        tone === "warning"
          ? "bg-red/5 border-red/30"
          : "bg-cream/50 border-terracotta/20",
      ].join(" ")}
    >
      <div className="text-xl mb-1" aria-hidden>
        {icon}
      </div>
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold text-brown leading-none tabular-nums",
          big ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
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

function SessionRow({ session }: { session: CashSession }) {
  const variance = session.variance_cents ?? 0;
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white-warm border border-terracotta/15">
      <div className="text-sm">
        <p className="font-semibold text-brown">
          {timeOf(session.opened_at)}
          {session.closed_at && ` → ${timeOf(session.closed_at)}`}
        </p>
        <p className="text-xs text-brown-light">
          Fond {formatCents(session.opening_amount_cents)} · Attendu{" "}
          {formatCents(session.expected_cash_cents ?? 0)} · Compté{" "}
          {formatCents(session.actual_cash_cents ?? 0)}
        </p>
      </div>
      <span
        className={[
          "text-sm font-bold tabular-nums",
          variance === 0
            ? "text-green-700"
            : variance > 0
              ? "text-amber-700"
              : "text-red",
        ].join(" ")}
      >
        {variance === 0
          ? "± 0,00 €"
          : `${variance > 0 ? "+" : ""}${formatCents(variance)}`}
      </span>
    </li>
  );
}

function CashOpenModal({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (cents: number, notes: string) => void;
}) {
  const [euros, setEuros] = useState("100");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(euros.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      alert("Montant invalide");
      return;
    }
    onConfirm(cents, notes.trim());
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:w-full z-50"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 p-6"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown text-center">
            Ouvrir la caisse
          </h2>
          <p className="text-xs text-brown-light text-center mt-1 mb-5">
            Indiquez le montant en espèces dans le tiroir maintenant.
          </p>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
              Fond initial
            </span>
            <div className="mt-1.5 relative">
              <input
                type="number"
                step="0.01"
                min={0}
                value={euros}
                onChange={(e) => setEuros(e.target.value)}
                autoFocus
                className="w-full px-4 py-4 pr-10 rounded-xl bg-cream border border-terracotta/30 text-brown text-3xl font-bold text-center tabular-nums focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brown-light text-xl">
                €
              </span>
            </div>
          </label>

          <label className="block mt-4">
            <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
              Note (optionnel)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Service du soir, billet 50€ neuf, etc."
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-sm text-brown focus:outline-none focus:border-gold"
            />
          </label>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-11 rounded-lg text-sm text-brown-light hover:text-brown transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] h-11 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95 inline-flex items-center justify-center gap-1.5"
            >
              🔑 Ouvrir
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/**
 * CashCloseModal — Sprint 7b QW#5 : comptage caisse détaillé.
 *
 * Deux modes :
 *   - "Détaillé" (par défaut) : grille des 15 dénominations Euro
 *     (7 billets + 8 pièces). L'utilisateur saisit le nombre d'unités de
 *     chaque coupure, le total se calcule en live. C'est la méthode
 *     pro qui élimine les erreurs de calcul mental.
 *   - "Rapide" : input direct du montant total (legacy — pour les pros qui
 *     comptent dans la tête).
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Pour la caisse voir le nombre d'argent dedans : 1 billet de 100€,
 * 20 pièces de 1€, etc."
 */
function CashCloseModal({
  expectedCents,
  busy,
  onCancel,
  onConfirm,
}: {
  expectedCents: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (
    cents: number,
    notes: string,
    breakdown?: CashBreakdown
  ) => void;
}) {
  const [mode, setMode] = useState<"detail" | "quick">("detail");
  const [breakdown, setBreakdown] = useState<CashBreakdown>({});
  const [quickEuros, setQuickEuros] = useState("");
  const [notes, setNotes] = useState("");

  const detailTotal = useMemo(
    () => computeCashBreakdownTotal(breakdown),
    [breakdown]
  );
  const quickCents = Math.round(
    Number((quickEuros || "0").replace(",", ".")) * 100
  );

  const actualCents = mode === "detail" ? detailTotal : quickCents;
  const variance = actualCents - expectedCents;
  const hasInput =
    mode === "detail"
      ? Object.values(breakdown).some((n) => (n ?? 0) > 0)
      : quickEuros.trim() !== "";

  function setCount(key: keyof CashBreakdown, value: string) {
    /* On accepte vide = 0, sinon on parse en entier ≥ 0. */
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned === "") {
      setBreakdown((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    const n = Math.max(0, Math.min(99999, parseInt(cleaned, 10) || 0));
    setBreakdown((prev) => ({ ...prev, [key]: n }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(actualCents) || actualCents < 0) {
      return;
    }
    onConfirm(
      actualCents,
      notes.trim(),
      mode === "detail" ? breakdown : undefined
    );
  }

  /* Bouton "Pré-remplir avec attendu" en mode rapide — utile pour ceux
   * qui veulent juste signer sans compter (mode dégradé). */
  function fillExpectedQuick() {
    setQuickEuros((expectedCents / 100).toFixed(2));
  }

  const billDenominations = CASH_DENOMINATIONS.filter((d) => d.type === "bill");
  const coinDenominations = CASH_DENOMINATIONS.filter((d) => d.type === "coin");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full sm:max-h-[92vh] z-50 flex"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 w-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-terracotta/20 flex-shrink-0">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown text-center">
              Fermer la caisse
            </h2>
            <p className="text-[11px] text-brown-light/80 text-center mt-1">
              Comptez physiquement les espèces dans le tiroir.
            </p>

            {/* Total attendu */}
            <div className="mt-4 rounded-xl bg-cream border border-terracotta/20 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                  Total attendu
                </div>
                <div className="font-[family-name:var(--font-display)] text-xl font-bold text-brown tabular-nums">
                  {formatCents(expectedCents)}
                </div>
              </div>
              {/* Mode tabs */}
              <div className="flex bg-brown/5 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setMode("detail")}
                  className={[
                    "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition",
                    mode === "detail"
                      ? "bg-white-warm text-brown shadow-sm"
                      : "text-brown-light/70 hover:text-brown",
                  ].join(" ")}
                >
                  Détaillé
                </button>
                <button
                  type="button"
                  onClick={() => setMode("quick")}
                  className={[
                    "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition",
                    mode === "quick"
                      ? "bg-white-warm text-brown shadow-sm"
                      : "text-brown-light/70 hover:text-brown",
                  ].join(" ")}
                >
                  Rapide
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {mode === "detail" ? (
              <div className="space-y-4">
                {/* Billets */}
                <DenominationSection
                  title="Billets"
                  denominations={billDenominations}
                  breakdown={breakdown}
                  onCountChange={setCount}
                />
                {/* Pièces */}
                <DenominationSection
                  title="Pièces"
                  denominations={coinDenominations}
                  breakdown={breakdown}
                  onCountChange={setCount}
                />
              </div>
            ) : (
              <div>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
                    Compté en caisse
                  </span>
                  <div className="mt-1.5 relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={quickEuros}
                      onChange={(e) => setQuickEuros(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                      className="w-full px-4 py-4 pr-10 rounded-xl bg-white-warm border border-terracotta/30 text-brown text-3xl font-bold text-center tabular-nums focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brown-light text-xl">
                      €
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={fillExpectedQuick}
                  className="mt-2 text-[11px] text-brown-light hover:text-brown underline-offset-2 hover:underline font-semibold"
                >
                  Pré-remplir avec le total attendu ({formatCents(expectedCents)})
                </button>
              </div>
            )}

            {/* Notes */}
            <label className="block mt-5">
              <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
                Note (optionnel)
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Erreur de rendu, prélèvement, etc."
                maxLength={200}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-sm text-brown focus:outline-none focus:border-gold"
              />
            </label>
          </div>

          {/* Sticky footer : total + variance + boutons */}
          <div className="flex-shrink-0 border-t border-terracotta/20 bg-white-warm px-6 py-4">
            {/* Total compté en gros */}
            <div className="rounded-xl bg-brown text-cream px-4 py-3 mb-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-cream/70 font-bold">
                Total compté
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
                {formatCents(actualCents)}
              </span>
            </div>

            {/* Variance — affichée uniquement si on a saisi quelque chose */}
            {hasInput && (
              <div
                className={[
                  "rounded-lg px-3 py-2 text-sm font-semibold text-center mb-3 flex items-center justify-between",
                  variance === 0
                    ? "bg-green-100 text-green-800"
                    : variance > 0
                      ? "bg-amber-100 text-amber-900"
                      : "bg-red/10 text-red-dark",
                ].join(" ")}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold">
                  Écart vs attendu
                </span>
                <span className="font-bold tabular-nums">
                  {variance === 0
                    ? "± 0,00 €"
                    : `${variance > 0 ? "+" : ""}${formatCents(variance)}`}
                  {variance < 0 && " (manque)"}
                  {variance > 0 && " (excédent)"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 rounded-lg text-sm text-brown-light hover:text-brown transition border border-terracotta/30"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy || !hasInput}
                className="flex-[2] h-11 rounded-lg bg-red text-cream text-sm font-bold hover:bg-red-dark transition disabled:opacity-50 active:scale-95 inline-flex items-center justify-center gap-1.5"
              >
                {busy ? "Fermeture…" : "🔒 Fermer la caisse"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/**
 * Section d'une catégorie de dénominations (billets ou pièces).
 * Grid 2-col : label + sous-total à gauche, input compteur à droite.
 */
function DenominationSection({
  title,
  denominations,
  breakdown,
  onCountChange,
}: {
  title: string;
  denominations: typeof CASH_DENOMINATIONS;
  breakdown: CashBreakdown;
  onCountChange: (key: keyof CashBreakdown, value: string) => void;
}) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-brown-light font-bold mb-2">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {denominations.map((d) => {
          const count = breakdown[d.key] ?? 0;
          const subtotal = count * d.cents;
          return (
            <li
              key={d.key}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cream/50 border border-terracotta/15 hover:border-terracotta/30 transition"
            >
              {/* Label coupure */}
              <div className="w-16 flex-shrink-0">
                <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums">
                  {d.label}
                </span>
              </div>

              {/* Symbole "×" */}
              <span className="text-brown-light/50 text-sm">×</span>

              {/* Input compteur */}
              <input
                type="text"
                inputMode="numeric"
                value={count > 0 ? String(count) : ""}
                onChange={(e) => onCountChange(d.key, e.target.value)}
                placeholder="0"
                className="w-16 h-9 px-2 rounded-md bg-white-warm border border-terracotta/30 text-brown text-base font-bold text-center tabular-nums focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />

              {/* Symbole "=" */}
              <span className="text-brown-light/50 text-sm">=</span>

              {/* Sous-total */}
              <span
                className={[
                  "ml-auto font-[family-name:var(--font-display)] text-base font-bold tabular-nums tracking-tight",
                  count > 0 ? "text-brown" : "text-brown-light/30",
                ].join(" ")}
              >
                {formatCents(subtotal)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
