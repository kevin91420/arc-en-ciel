"use client";

/**
 * /admin/avoirs — Console des avoirs client (Sprint 7b QW#6).
 *
 * Permet au manager de voir tous les avoirs émis, leur statut, et de
 * créer manuellement un nouvel avoir (geste commercial spontané).
 *
 * Sections :
 *   - 5 stat cards (total émis, encours, utilisé, expirant bientôt)
 *   - Filtres pills par statut
 *   - Cards par avoir avec code, client, montant, statut
 *   - Modal "Nouvel avoir" pour création manuelle
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Proposer un avoir pour la prochaine venue du client si pas content".
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type {
  CreateVoucherPayload,
  VoucherRow,
  VoucherStats,
  VoucherStatus,
} from "@/lib/db/vouchers-types";

const STATUS_META: Record<
  VoucherStatus,
  { label: string; bg: string; text: string; dot: string; icon: string }
> = {
  active: {
    label: "Actif",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
    icon: "✓",
  },
  redeemed: {
    label: "Utilisé",
    bg: "bg-brown/10",
    text: "text-brown-light",
    dot: "bg-brown-light",
    icon: "↻",
  },
  expired: {
    label: "Expiré",
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
    icon: "⏰",
  },
  cancelled: {
    label: "Annulé",
    bg: "bg-red/10",
    text: "text-red-dark",
    dot: "bg-red",
    icon: "✕",
  },
};

export default function VouchersAdminPage() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | VoucherStatus>("all");

  const refresh = useCallback(async () => {
    try {
      const [vRes, sRes] = await Promise.all([
        fetch("/api/admin/vouchers", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/vouchers/stats", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!vRes.ok) throw new Error("Impossible de charger les avoirs");
      const v = (await vRes.json()) as { vouchers: VoucherRow[] };
      const s = sRes.ok ? ((await sRes.json()) as VoucherStats) : null;
      setRows(v.vouchers);
      setStats(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Geste commercial
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Avoirs client
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Crédits remis à un client mécontent ou en geste commercial.
          Utilisables sur une prochaine commande, expiration légale 12 mois.
        </p>
      </motion.div>

      {/* Stats globales */}
      {stats && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          <StatCard
            label="Total émis"
            value={formatCents(stats.total_emitted_cents)}
            sub={`${stats.total_count} avoir${stats.total_count > 1 ? "s" : ""}`}
            tone="brown"
          />
          <StatCard
            label="Encours"
            value={formatCents(stats.outstanding_cents)}
            sub={`${stats.active_count} actif${stats.active_count > 1 ? "s" : ""}`}
            tone="green"
            emphasis
          />
          <StatCard
            label="Utilisé"
            value={formatCents(stats.total_redeemed_cents)}
            sub={`${stats.redeemed_count} utilisé${stats.redeemed_count > 1 ? "s" : ""}`}
            tone="gold"
          />
          <StatCard
            label="Expirant <30j"
            value={String(stats.expiring_soon_count)}
            sub="à utiliser bientôt"
            tone={stats.expiring_soon_count > 0 ? "amber" : "muted"}
          />
          <StatCard
            label="Annulés/Expirés"
            value={String(stats.cancelled_count + stats.expired_count)}
            sub={`${stats.cancelled_count} ann · ${stats.expired_count} exp`}
            tone="muted"
          />
        </motion.section>
      )}

      {/* Toolbar */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tous"
            count={rows.length}
          />
          {(["active", "redeemed", "expired", "cancelled"] as VoucherStatus[]).map(
            (s) => (
              <FilterPill
                key={s}
                active={filter === s}
                onClick={() => setFilter(s)}
                label={STATUS_META[s].label}
                count={rows.filter((r) => r.status === s).length}
              />
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => setCreatorOpen(true)}
          className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95 shadow-lg shadow-brown/20"
        >
          <span className="text-lg leading-none">+</span>
          Nouvel avoir
        </button>
      </motion.section>

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

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            🎫
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            {filter === "all"
              ? "Aucun avoir émis pour le moment. Crée-en un quand un client mérite un geste commercial."
              : "Aucun avoir avec ce statut."}
          </p>
          {filter === "all" && (
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="mt-5 inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-5 py-2.5 rounded-full transition active:scale-95"
            >
              Créer mon 1er avoir
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((v) => (
            <VoucherCard key={v.id} voucher={v} />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {creatorOpen && (
          <CreatorModal
            onClose={() => setCreatorOpen(false)}
            onCreated={() => {
              setCreatorOpen(false);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Voucher card
   ═══════════════════════════════════════════════════════════ */

function VoucherCard({ voucher: v }: { voucher: VoucherRow }) {
  const meta = STATUS_META[v.status];
  const expiringSoon =
    v.status === "active" &&
    v.expires_at &&
    new Date(v.expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  const usedPct =
    v.amount_cents > 0
      ? Math.round(((v.amount_cents - v.remaining_cents) / v.amount_cents) * 100)
      : 0;

  return (
    <motion.li layout>
      <Link
        href={`/admin/avoirs/${v.id}`}
        className="block rounded-2xl bg-white-warm border border-terracotta/20 p-5 hover:border-gold hover:shadow-lg hover:shadow-gold/10 transition active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          {/* Code QR avatar */}
          <div className="w-14 h-14 rounded-xl bg-brown text-cream flex flex-col items-center justify-center font-mono font-bold text-[10px] tracking-tight flex-shrink-0">
            <span className="text-base leading-none">
              {v.code.split("-")[1] ?? v.code}
            </span>
            <span className="text-[8px] opacity-60 mt-0.5">AVR</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight truncate">
                {v.customer_name || v.customer_email || "Client anonyme"}
              </h3>
              <span
                className={[
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  meta.bg,
                  meta.text,
                ].join(" ")}
              >
                <span
                  className={["w-1.5 h-1.5 rounded-full", meta.dot].join(" ")}
                />
                {meta.label}
              </span>
            </div>
            {v.reason && (
              <p className="text-xs text-brown-light/80 mt-0.5 truncate">
                {v.reason}
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="font-[family-name:var(--font-display)] text-xl font-bold text-brown tabular-nums leading-none">
              {formatCents(v.remaining_cents)}
            </div>
            {v.remaining_cents !== v.amount_cents && (
              <div className="text-[10px] text-brown-light/70 tabular-nums mt-1">
                /{formatCents(v.amount_cents)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar si partiellement utilisé */}
        {v.status === "active" && usedPct > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-cream overflow-hidden">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-[10px] text-brown-light/70 mt-1 tabular-nums">
              {usedPct}% utilisé
            </p>
          </div>
        )}

        {expiringSoon && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <span aria-hidden>⏰</span>
            Expire le{" "}
            {v.expires_at &&
              new Date(v.expires_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-terracotta/15 flex items-center justify-between text-xs text-brown-light/80">
          <span className="font-mono">{v.code}</span>
          <span className="text-[10px] tabular-nums">
            {new Date(v.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card / Filter pill
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  sub,
  tone = "brown",
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "brown" | "green" | "gold" | "amber" | "muted";
  emphasis?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    green: "text-green-700",
    gold: "text-gold",
    amber: "text-amber-700",
    muted: "text-brown-light",
  };
  return (
    <div
      className={[
        "rounded-2xl bg-white-warm border p-4",
        emphasis ? "border-gold/40 bg-gold/5" : "border-terracotta/20",
      ].join(" ")}
    >
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold leading-none tabular-nums",
          emphasis ? "text-2xl" : "text-xl",
          tones[tone],
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-2">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-brown-light/60 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95",
        active
          ? "bg-brown text-cream"
          : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
          active ? "bg-cream/20 text-cream" : "bg-cream text-brown-light",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Creator modal
   ═══════════════════════════════════════════════════════════ */

function CreatorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (voucherId: string) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Presets de montants courants pour gain de temps */
  const PRESETS = [5, 10, 15, 20, 25, 50];

  const amountCents = Math.round(
    Number((amountEuros || "0").replace(",", ".")) * 100
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() && !customerEmail.trim()) {
      setError(
        "Indique au moins le nom ou l'email du client (un avoir est nominatif)."
      );
      return;
    }
    if (amountCents <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }
    setBusy(true);
    setError(null);

    const payload: CreateVoucherPayload = {
      customer_name: customerName.trim() || undefined,
      customer_email: customerEmail.trim().toLowerCase() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      amount_cents: amountCents,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { voucher: VoucherRow };
      onCreated(data.voucher.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-[calc(100vw-2rem)] sm:max-h-[90vh] z-50 flex"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 h-full w-full flex flex-col overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-terracotta/20 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                Nouvel avoir
              </h2>
              <p className="text-xs text-brown-light/70 mt-0.5">
                Crédit nominatif. Expiration légale 12 mois.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-brown-light hover:text-brown w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Client */}
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                Client (nominatif)
              </h3>
              <div className="space-y-3">
                <Field label="Nom" hint="Ce qui s'affichera sur le bon">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Sophie Martin"
                    maxLength={80}
                    autoFocus
                    className={fieldCls}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="sophie@example.com"
                      className={fieldCls}
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className={fieldCls}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Montant */}
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                Montant
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESETS.map((p) => {
                  const active = amountEuros === String(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmountEuros(String(p))}
                      className={[
                        "h-10 px-3 rounded-lg text-sm font-bold border-2 transition active:scale-95",
                        active
                          ? "bg-brown text-cream border-brown"
                          : "bg-cream text-brown border-terracotta/30 hover:border-gold",
                      ].join(" ")}
                    >
                      {p} €
                    </button>
                  );
                })}
              </div>
              <div className="flex items-stretch">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountEuros}
                  onChange={(e) => setAmountEuros(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 px-3 py-3 rounded-l-lg bg-white-warm border border-terracotta/30 text-brown text-2xl font-bold text-center tabular-nums focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <span className="inline-flex items-center px-4 rounded-r-lg bg-cream border border-l-0 border-terracotta/30 text-brown text-xl font-bold">
                  €
                </span>
              </div>
            </section>

            {/* Raison + notes */}
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                Détails
              </h3>
              <div className="space-y-3">
                <Field
                  label="Raison"
                  hint="Visible sur le bon. Ex : 'Geste commercial', 'Plat froid servi'."
                >
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Geste commercial"
                    maxLength={120}
                    className={fieldCls}
                  />
                </Field>
                <Field
                  label="Note interne"
                  hint="Visible uniquement par le manager."
                >
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Détails internes…"
                    maxLength={300}
                    rows={2}
                    className={`${fieldCls} resize-none`}
                  />
                </Field>
              </div>
            </section>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2 flex items-start gap-2 flex-shrink-0"
            >
              <span aria-hidden className="text-base leading-none">⚠</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2 flex-shrink-0 bg-white-warm">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy || amountCents <= 0}
              className="h-10 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95"
            >
              {busy
                ? "Création…"
                : amountCents > 0
                  ? `Créer l'avoir · ${formatCents(amountCents)}`
                  : "Créer l'avoir"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

const fieldCls =
  "w-full px-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/40";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-brown-light/70">{hint}</p>}
    </div>
  );
}
