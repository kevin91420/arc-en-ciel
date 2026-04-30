"use client";

/**
 * /admin/restaurants — Console super-admin de la flotte de tenants SaaS.
 *
 * Liste tous les restaurants clients du SaaS, avec stats globales, filtres
 * par status, et bouton "Nouveau tenant" qui ouvre un modal de création.
 *
 * Sprint 7b — Phase E.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  CreateRestaurantPayload,
  RestaurantRow,
  SubscriptionStatus,
} from "@/lib/db/restaurants-types";

const STATUS_META: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  trial: {
    label: "Trial",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  active: {
    label: "Actif",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
  },
  past_due: {
    label: "Impayé",
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  canceled: {
    label: "Résilié",
    bg: "bg-brown/10",
    text: "text-brown-light",
    dot: "bg-brown-light",
  },
  expired: {
    label: "Expiré",
    bg: "bg-red/10",
    text: "text-red-dark",
    dot: "bg-red",
  },
};

export default function RestaurantsAdminPage() {
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | SubscriptionStatus>("all");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/restaurants", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Impossible de charger les restaurants");
      const data = (await res.json()) as { restaurants: RestaurantRow[] };
      setRows(data.restaurants);
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

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.subscription_status === "active");
    const trial = rows.filter((r) => r.subscription_status === "trial");
    const churned = rows.filter(
      (r) =>
        r.subscription_status === "canceled" ||
        r.subscription_status === "expired"
    );
    /* MRR estimé : 89€ moyen × actifs (sera affiné quand Stripe Billing
     * stockera le vrai prix par tenant en sprint 8) */
    const mrr = active.length * 89;
    return {
      total: rows.length,
      active: active.length,
      trial: trial.length,
      churned: churned.length,
      mrr,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.subscription_status === filter);
  }, [rows, filter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Console SaaS
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Restaurants clients
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          La flotte des tenants connectés à ton SaaS. Chaque ligne = un resto
          isolé avec ses propres données, son branding, son abonnement.
        </p>
      </motion.div>

      {/* Stats globales */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
      >
        <StatCard label="Total" value={stats.total} accent="brown" />
        <StatCard label="Actifs" value={stats.active} accent="green" />
        <StatCard label="En trial" value={stats.trial} accent="blue" />
        <StatCard label="Churnés" value={stats.churned} accent="red" />
        <StatCard
          label="MRR estimé"
          value={`${stats.mrr}€`}
          accent="gold"
          mono
        />
      </motion.section>

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
          {(
            [
              "active",
              "trial",
              "past_due",
              "canceled",
              "expired",
            ] as SubscriptionStatus[]
          ).map((s) => (
            <FilterPill
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={STATUS_META[s].label}
              count={rows.filter((r) => r.subscription_status === s).length}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreatorOpen(true)}
          className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95 shadow-lg shadow-brown/20"
        >
          <span className="text-lg leading-none">+</span>
          Nouveau tenant
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
            🏢
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            {filter === "all"
              ? "Aucun tenant pour le moment. Crée ton premier resto."
              : "Aucun resto avec ce statut."}
          </p>
          {filter === "all" && (
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="mt-5 inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-5 py-2.5 rounded-full transition active:scale-95"
            >
              Créer mon 1er tenant
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
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
   Restaurant card
   ═══════════════════════════════════════════════════════════ */

function RestaurantCard({ restaurant: r }: { restaurant: RestaurantRow }) {
  const meta = STATUS_META[r.subscription_status];
  const initial = r.name.charAt(0).toUpperCase();
  const branding = r.branding ?? {};
  const accentColor = branding.accent_color || "#b8922f";

  /* Détecte si le trial expire bientôt (J-3 ou moins) */
  const trialDaysLeft =
    r.subscription_status === "trial" && r.trial_ends_at
      ? Math.ceil(
          (new Date(r.trial_ends_at).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000)
        )
      : null;
  const trialUrgent = trialDaysLeft !== null && trialDaysLeft <= 3;

  return (
    <motion.li layout>
      <Link
        href={`/admin/restaurants/${r.id}`}
        className="block rounded-2xl bg-white-warm border border-terracotta/20 p-5 hover:border-gold hover:shadow-lg hover:shadow-gold/10 transition active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          {/* Avatar coloré avec initiale du nom */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-bold flex-shrink-0 text-cream"
            style={{ background: accentColor }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight truncate">
                {r.name}
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
            <p className="text-xs text-brown-light/80 mt-0.5 truncate">
              <span className="font-mono">/{r.slug}</span>
              {r.city && (
                <>
                  <span className="mx-1.5 text-brown-light/30">·</span>
                  {r.city}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Trial warning si J-3 */}
        {trialUrgent && trialDaysLeft !== null && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <span aria-hidden>⏰</span>
            Trial expire dans {trialDaysLeft <= 0 ? "moins de 24h" : `${trialDaysLeft}j`}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-terracotta/15 flex items-center justify-between text-xs text-brown-light/80">
          <span className="truncate" title={r.owner_email ?? ""}>
            {r.owner_email || "Pas d'email"}
          </span>
          <span className="text-[10px] tabular-nums">
            {new Date(r.created_at).toLocaleDateString("fr-FR", {
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
   Stat card
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  accent = "brown",
  mono = false,
}: {
  label: string;
  value: number | string;
  accent?: "brown" | "green" | "blue" | "red" | "gold";
  mono?: boolean;
}) {
  const accentClasses: Record<typeof accent, string> = {
    brown: "text-brown",
    green: "text-green-700",
    blue: "text-blue-700",
    red: "text-red-dark",
    gold: "text-gold",
  };
  return (
    <div className="rounded-2xl bg-white-warm border border-terracotta/20 p-4">
      <div
        className={[
          "font-[family-name:var(--font-display)] text-3xl font-bold leading-none",
          accentClasses[accent],
          mono ? "tabular-nums" : "",
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

/* ═══════════════════════════════════════════════════════════
   Filter pill
   ═══════════════════════════════════════════════════════════ */

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
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Auto-slug depuis le nom (jusqu'à ce que l'utilisateur édite manuellement) */
  useEffect(() => {
    if (slugTouched) return;
    const auto = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    setSlug(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!ownerEmail.trim() || !/.+@.+\..+/.test(ownerEmail)) {
      setError("Email du propriétaire requis et valide.");
      return;
    }
    setBusy(true);
    setError(null);

    const payload: CreateRestaurantPayload = {
      slug: slug.trim(),
      name: name.trim(),
      owner_email: ownerEmail.trim(),
      owner_phone: ownerPhone.trim() || undefined,
      city: city.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      onCreated();
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
                Nouveau tenant
              </h2>
              <p className="text-xs text-brown-light/70 mt-0.5">
                Crée un nouveau resto client. Trial 30 jours actif par défaut.
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

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
            <Field label="Nom du restaurant" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pizzeria Da Marco"
                maxLength={80}
                autoFocus
                className={fieldCls}
              />
            </Field>

            <Field
              label="Slug (URL)"
              hint="Auto-généré depuis le nom. Modifiable. URL : /r/[slug]/…"
            >
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="pizzeria-da-marco"
                maxLength={40}
                className={`${fieldCls} font-mono`}
              />
            </Field>

            <Field label="Email du propriétaire" required>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="marco@pizzeriadamarco.fr"
                className={fieldCls}
              />
            </Field>

            <Field label="Téléphone du propriétaire">
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className={fieldCls}
              />
            </Field>

            <Field label="Ville">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lyon 7e"
                className={fieldCls}
              />
            </Field>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2 flex items-start gap-2 flex-shrink-0"
            >
              <span aria-hidden className="text-base leading-none">
                ⚠
              </span>
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
              disabled={busy}
              className="h-10 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95"
            >
              {busy ? "Création…" : "Créer le tenant"}
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
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-brown-light/70">{hint}</p>}
    </div>
  );
}
