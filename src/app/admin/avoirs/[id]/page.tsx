"use client";

/**
 * /admin/avoirs/[id] — Détail d'un avoir + QR imprimable.
 *
 * Affiche :
 *   - Bandeau imprimable façon ticket (à donner au client)
 *   - QR code du voucher_code (scan rapide au POS)
 *   - Détail montant, statut, expiration
 *   - Historique des utilisations (redemptions)
 *   - Actions : annuler, imprimer
 *
 * Style print : ne montre que le bon recto pour le client.
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { formatCents } from "@/lib/format";
import {
  useRestaurantBranding,
  formatLegalLines,
} from "@/lib/hooks/useRestaurantBranding";
import type {
  VoucherStatus,
  VoucherWithRedemptions,
} from "@/lib/db/vouchers-types";

const STATUS_LABEL: Record<VoucherStatus, string> = {
  active: "✓ Actif — utilisable",
  redeemed: "↻ Entièrement utilisé",
  expired: "⏰ Expiré",
  cancelled: "✕ Annulé",
};

export default function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [voucher, setVoucher] = useState<VoucherWithRedemptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const branding = useRestaurantBranding();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 404) {
        setError("Avoir introuvable.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { voucher: VoucherWithRedemptions };
      setVoucher(data.voucher);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function cancel() {
    if (!voucher) return;
    setBusy(true);
    try {
      const url = new URL(
        `/api/admin/vouchers/${voucher.id}`,
        window.location.origin
      );
      if (cancelReason.trim()) {
        url.searchParams.set("reason", cancelReason.trim());
      }
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
      setConfirmCancel(false);
      setCancelReason("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-brown-light">
        Chargement…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-dark mb-4">{error}</p>
        <Link
          href="/admin/avoirs"
          className="text-brown font-semibold hover:text-gold"
        >
          ← Retour aux avoirs
        </Link>
      </div>
    );
  }

  if (!voucher) return null;

  const usedCents = voucher.amount_cents - voucher.remaining_cents;
  const usedPct =
    voucher.amount_cents > 0
      ? Math.round((usedCents / voucher.amount_cents) * 100)
      : 0;
  const isActive = voucher.status === "active";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:py-0 print:px-0">
      {/* Header — caché à l'impression */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 print:hidden"
      >
        <Link
          href="/admin/avoirs"
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
          Retour aux avoirs
        </Link>
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown">
            Avoir {voucher.code}
          </h1>
        </div>
        <p className="text-brown-light/80 mt-1">{STATUS_LABEL[voucher.status]}</p>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3 print:hidden">
          {error}
        </div>
      )}

      {/* ─── BON CADEAU IMPRIMABLE ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 print:m-0"
      >
        <div
          id="voucher-print"
          className="bg-white-warm rounded-3xl border-2 border-dashed border-brown/30 overflow-hidden shadow-md print:shadow-none print:border-2 print:border-solid"
        >
          {/* Bandeau gold */}
          <div className="bg-gradient-to-r from-gold/30 via-gold/40 to-gold/20 px-6 py-4 border-b border-brown/20 text-center">
            <p className="font-[family-name:var(--font-script)] text-brown text-2xl">
              Bon d&apos;avoir
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brown-light font-bold mt-1">
              {branding.name}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-10 sm:py-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
            {/* Infos */}
            <div className="text-center sm:text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brown-light/70 font-bold">
                Au porteur
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mt-1">
                {voucher.customer_name || voucher.customer_email || "Client"}
              </p>

              <p className="text-[10px] uppercase tracking-[0.2em] text-brown-light/70 font-bold mt-5">
                Montant
              </p>
              <p className="font-[family-name:var(--font-display)] text-5xl font-black text-brown tabular-nums leading-none mt-1">
                {formatCents(voucher.remaining_cents)}
              </p>
              {voucher.remaining_cents !== voucher.amount_cents && (
                <p className="text-xs text-brown-light/70 mt-1">
                  Solde restant sur {formatCents(voucher.amount_cents)} initial
                </p>
              )}

              {voucher.reason && (
                <p className="mt-4 text-sm text-brown-light italic">
                  « {voucher.reason} »
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-brown/15 text-[11px] text-brown-light leading-relaxed">
                <p>
                  <strong>Code :</strong>{" "}
                  <span className="font-mono text-base text-brown">
                    {voucher.code}
                  </span>
                </p>
                {voucher.expires_at && (
                  <p className="mt-0.5">
                    <strong>Expire le :</strong>{" "}
                    {new Date(voucher.expires_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                <p className="mt-3 text-[10px] text-brown-light/70 italic">
                  Utilisable lors d&apos;une prochaine commande chez{" "}
                  {branding.name}. Non échangeable contre des espèces. Présentez
                  ce bon ou son code QR à votre serveur.
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="p-3 rounded-xl bg-white border-2 border-brown/20">
                <QRCodeSVG
                  value={voucher.code}
                  size={140}
                  level="M"
                  marginSize={0}
                  fgColor="#5b3a29"
                  bgColor="#ffffff"
                />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
                Scannez au POS
              </p>
            </div>
          </div>

          {/* Pied avec mentions légales */}
          <div className="bg-cream/50 px-6 py-3 border-t border-brown/15 text-center text-[10px] text-brown-light/70 leading-relaxed font-mono">
            {formatLegalLines(branding).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ─── ACTIONS — caché à l'impression ──────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex items-center gap-2 flex-wrap print:hidden"
      >
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
        {voucher.customer_email && (
          <a
            href={`mailto:${voucher.customer_email}?subject=Votre%20avoir%20chez%20${encodeURIComponent(branding.name)}&body=${encodeURIComponent(
              `Bonjour ${voucher.customer_name || ""},\n\nVous trouverez en pièce jointe votre bon d'avoir d'un montant de ${formatCents(voucher.remaining_cents)}.\n\nCode : ${voucher.code}\n${voucher.expires_at ? `Valable jusqu'au ${new Date(voucher.expires_at).toLocaleDateString("fr-FR")}.` : ""}\n\nÀ très bientôt,\n${branding.name}`
            )}`}
            className="h-11 px-4 rounded-lg bg-cream text-brown text-sm font-semibold border border-terracotta/30 hover:border-gold transition inline-flex items-center gap-2"
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
                d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Envoyer par email
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(voucher.code);
            }
          }}
          className="h-11 px-4 rounded-lg bg-cream text-brown text-sm font-semibold border border-terracotta/30 hover:border-gold transition inline-flex items-center gap-2"
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
              d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2zM4 6v12a2 2 0 002 2h2"
            />
          </svg>
          Copier le code
        </button>
        {isActive && (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="h-11 px-4 rounded-lg border border-red/30 text-red-dark text-sm font-semibold hover:bg-red/10 transition ml-auto"
          >
            Annuler cet avoir
          </button>
        )}
      </motion.section>

      {/* ─── DÉTAILS TECHNIQUES — caché à l'impression ──── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5 print:hidden"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
          Suivi
        </h2>
        <div className="space-y-2 text-sm">
          <InfoRow label="Statut" value={STATUS_LABEL[voucher.status]} />
          <InfoRow
            label="Émis le"
            value={new Date(voucher.created_at).toLocaleString("fr-FR")}
          />
          {voucher.expires_at && (
            <InfoRow
              label="Expire le"
              value={new Date(voucher.expires_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}
          {voucher.redeemed_at && (
            <InfoRow
              label="Entièrement utilisé le"
              value={new Date(voucher.redeemed_at).toLocaleString("fr-FR")}
            />
          )}
          <InfoRow
            label="Montant initial"
            value={formatCents(voucher.amount_cents)}
          />
          <InfoRow
            label="Solde restant"
            value={formatCents(voucher.remaining_cents)}
          />
          {usedCents > 0 && (
            <div className="pt-2">
              <div className="h-2 rounded-full bg-cream overflow-hidden">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-[11px] text-brown-light/70 mt-1 tabular-nums">
                {formatCents(usedCents)} utilisé · {usedPct}%
              </p>
            </div>
          )}
          {voucher.notes && (
            <InfoRow label="Note interne" value={voucher.notes} muted />
          )}
        </div>
      </motion.section>

      {/* ─── HISTORIQUE D'UTILISATION ────────────────────── */}
      {voucher.redemptions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5 print:hidden"
        >
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown mb-3">
            Utilisations ({voucher.redemptions.length})
          </h2>
          <ul className="divide-y divide-terracotta/15">
            {voucher.redemptions.map((r) => (
              <li
                key={r.id}
                className="py-3 flex items-baseline justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-brown font-semibold">
                    {new Date(r.redeemed_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-brown-light/80 font-mono truncate">
                    Commande {r.order_id.slice(0, 8)}…
                  </p>
                </div>
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-brown tabular-nums flex-shrink-0">
                  −{formatCents(r.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ─── MODAL CONFIRM ANNULATION ───────────────────── */}
      <AnimatePresence>
        {confirmCancel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmCancel(false)}
              className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-50 print:hidden"
              role="dialog"
              aria-modal
            >
              <div className="bg-white-warm rounded-2xl shadow-2xl border-2 border-red/20 p-6">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-2">
                  Annuler cet avoir ?
                </h3>
                <p className="text-sm text-brown-light/90 mb-4">
                  Le client ne pourra plus utiliser cet avoir. Le solde restant
                  ({formatCents(voucher.remaining_cents)}) sera définitivement
                  perdu pour lui. Action non réversible.
                </p>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Raison (optionnel — note interne)"
                  maxLength={120}
                  className="w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold"
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmCancel(false);
                      setCancelReason("");
                    }}
                    className="h-10 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition"
                  >
                    Garder
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={busy}
                    className="h-10 px-4 rounded-lg bg-red text-cream text-sm font-bold hover:bg-red-dark transition disabled:opacity-50 active:scale-95"
                  >
                    {busy ? "Annulation…" : "Confirmer l'annulation"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Style print */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A5 landscape;
          }
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Lien faible : retour si pas de back history */}
      <div className="text-center print:hidden mt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-brown-light/70 hover:text-brown font-semibold"
        >
          ← Précédent
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 items-baseline py-1">
      <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
        {label}
      </span>
      <span
        className={[
          "text-sm break-words",
          muted ? "text-brown-light/80 italic" : "text-brown",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
