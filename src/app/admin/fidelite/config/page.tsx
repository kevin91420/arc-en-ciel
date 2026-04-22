"use client";

/**
 * /admin/fidelite/config — Formulaire de config du programme fidélité.
 * Preview live de la carte à droite, toast de succès sur sauvegarde.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LoyaltyConfig } from "@/lib/db/loyalty-types";

type Dirty<T> = { [K in keyof T]: T[K] };

export default function LoyaltyConfigPage() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [draft, setDraft] = useState<Dirty<LoyaltyConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/loyalty/config", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((c: LoyaltyConfig) => {
        setConfig(c);
        setDraft(c);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    if (!config || !draft) return false;
    return (
      config.stamps_required !== draft.stamps_required ||
      config.reward_label !== draft.reward_label ||
      config.reward_description !== draft.reward_description ||
      config.welcome_message !== draft.welcome_message ||
      config.brand_color !== draft.brand_color ||
      config.accent_color !== draft.accent_color ||
      config.active !== draft.active
    );
  }, [config, draft]);

  const update = <K extends keyof LoyaltyConfig>(
    key: K,
    val: LoyaltyConfig[K]
  ) => {
    setDraft((d) => (d ? { ...d, [key]: val } : d));
  };

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        stamps_required: draft.stamps_required,
        reward_label: draft.reward_label,
        reward_description: draft.reward_description,
        welcome_message: draft.welcome_message,
        brand_color: draft.brand_color,
        accent_color: draft.accent_color,
        active: draft.active,
      };
      const res = await fetch("/api/admin/loyalty/config", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setConfig(data);
      setDraft(data);
      setToast("Configuration enregistrée");
      setTimeout(() => setToast(null), 3200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-brown-light">
        Chargement…
      </div>
    );
  }
  if (error && !draft) {
    return (
      <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red-dark text-sm max-w-md">
        {error}
      </div>
    );
  }
  if (!draft) return null;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <Link
            href="/admin/fidelite"
            className="inline-flex items-center gap-1 text-xs text-brown-light hover:text-gold transition mb-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" aria-hidden>
              <path
                d="M14 7l-5 5 5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Fidélité
          </Link>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Configuration
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Paramètres fidélité
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            Personnalisez le nombre de tampons, la récompense et les couleurs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle
              checked={draft.active}
              onChange={(v) => update("active", v)}
            />
            <span className="text-sm font-semibold text-brown">
              Programme {draft.active ? "actif" : "désactivé"}
            </span>
          </label>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-10">
        {/* ─── Form ─────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6"
        >
          {/* Stamps required */}
          <Field
            label="Nombre de tampons requis"
            hint="Entre 2 et 20 tampons avant la récompense."
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  update(
                    "stamps_required",
                    Math.max(2, draft.stamps_required - 1)
                  )
                }
                className="w-10 h-10 rounded-lg bg-cream border border-terracotta/30 text-brown font-bold hover:bg-gold/15 active:scale-95 transition"
              >
                −
              </button>
              <input
                type="number"
                min={2}
                max={20}
                value={draft.stamps_required}
                onChange={(e) =>
                  update(
                    "stamps_required",
                    Math.max(2, Math.min(20, Number(e.target.value) || 2))
                  )
                }
                className="w-20 text-center text-xl font-bold py-2 rounded-lg bg-white-warm border border-terracotta/30 text-brown focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    "stamps_required",
                    Math.min(20, draft.stamps_required + 1)
                  )
                }
                className="w-10 h-10 rounded-lg bg-cream border border-terracotta/30 text-brown font-bold hover:bg-gold/15 active:scale-95 transition"
              >
                +
              </button>
            </div>
          </Field>

          {/* Reward label */}
          <Field
            label="Libellé de la récompense"
            hint="Ce que le client gagne. Visible sur la carte."
          >
            <input
              type="text"
              value={draft.reward_label}
              onChange={(e) => update("reward_label", e.target.value)}
              maxLength={80}
              placeholder="Une pizza offerte"
              className="w-full px-4 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </Field>

          {/* Reward description */}
          <Field
            label="Description de la récompense"
            hint="Conditions, exclusions, durée de validité…"
          >
            <textarea
              value={draft.reward_description}
              onChange={(e) => update("reward_description", e.target.value)}
              rows={3}
              maxLength={240}
              placeholder="Valable sur toute la carte, hors spéciales…"
              className="w-full px-4 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-none"
            />
          </Field>

          {/* Welcome */}
          <Field
            label="Message de bienvenue"
            hint="Affiché à l'inscription du client."
          >
            <input
              type="text"
              value={draft.welcome_message}
              onChange={(e) => update("welcome_message", e.target.value)}
              maxLength={120}
              placeholder="Bienvenue dans le club !"
              className="w-full px-4 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </Field>

          {/* Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ColorField
              label="Couleur principale"
              value={draft.brand_color}
              onChange={(v) => update("brand_color", v)}
              hint="Fond de la carte"
            />
            <ColorField
              label="Couleur d'accent"
              value={draft.accent_color}
              onChange={(v) => update("accent_color", v)}
              hint="Tampons + CTA"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 sticky bottom-4 z-10">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="bg-brown hover:bg-brown-light text-cream font-bold px-6 py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition shadow-lg"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => setDraft(config)}
                className="text-sm text-brown-light hover:text-brown transition"
              >
                Annuler
              </button>
            )}
            {error && (
              <p className="text-sm text-red-dark bg-red/10 border border-red/30 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </motion.form>

        {/* ─── Preview ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:sticky lg:top-24 h-fit"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-semibold mb-3">
            Aperçu en direct
          </p>
          <CardPreview config={draft} />
          <p className="mt-4 text-xs text-brown-light/80 italic">
            C&apos;est ce que voit le client sur son téléphone après inscription.
          </p>
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brown text-cream px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-gold"
              aria-hidden
            >
              <path
                d="M5 12l5 5 9-10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════ */

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
      <label className="block text-xs font-bold uppercase tracking-wider text-brown mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-brown-light/80">{hint}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <label className="relative w-12 h-12 rounded-lg overflow-hidden border border-terracotta/30 shadow-inner cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <span
            className="block w-full h-full"
            style={{ backgroundColor: value }}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown font-mono text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 uppercase"
        />
      </div>
    </Field>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative w-11 h-6 rounded-full transition-colors",
        checked ? "bg-gold" : "bg-brown-light/40",
      ].join(" ")}
    >
      <motion.span
        layout
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className={[
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow",
          checked ? "left-[22px]" : "left-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function CardPreview({ config }: { config: LoyaltyConfig }) {
  return (
    <motion.div
      layout
      className="rounded-3xl p-6 shadow-2xl relative overflow-hidden"
      style={{ backgroundColor: config.brand_color, color: "#FDF8F0" }}
    >
      {/* Decorative corner */}
      <div
        className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: config.accent_color }}
      />

      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="font-[family-name:var(--font-script)] text-xl"
              style={{ color: config.accent_color }}
            >
              L&apos;Arc en Ciel
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold mt-0.5">
              Carte fidélité
            </p>
          </div>
          <span
            className="text-[9px] px-2 py-1 rounded-full font-bold tracking-wider"
            style={{
              backgroundColor: config.active
                ? `${config.accent_color}30`
                : "rgba(255,255,255,0.1)",
              color: config.active ? config.accent_color : "rgba(253,248,240,0.5)",
            }}
          >
            {config.active ? "ACTIF" : "DÉSACTIVÉ"}
          </span>
        </div>

        {/* Welcome */}
        <p className="text-xs opacity-80 italic leading-relaxed">
          “{config.welcome_message}”
        </p>

        {/* Stamps grid */}
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">
            Progression
          </p>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(
                config.stamps_required,
                10
              )}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: config.stamps_required }).map((_, i) => (
              <motion.div
                key={i}
                layout
                className="aspect-square rounded-full flex items-center justify-center border-2 text-xs font-bold"
                style={{
                  backgroundColor:
                    i < Math.min(3, config.stamps_required - 1)
                      ? config.accent_color
                      : "transparent",
                  color:
                    i < Math.min(3, config.stamps_required - 1)
                      ? config.brand_color
                      : "rgba(253,248,240,0.25)",
                  borderColor:
                    i < Math.min(3, config.stamps_required - 1)
                      ? config.accent_color
                      : "rgba(253,248,240,0.2)",
                }}
              >
                {i < Math.min(3, config.stamps_required - 1) ? "★" : ""}
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] opacity-60 mt-2">
            3 / {config.stamps_required} tampons (exemple)
          </p>
        </div>

        {/* Reward */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: config.accent_color }}
          >
            Votre récompense
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] font-bold text-base leading-tight">
            {config.reward_label || "—"}
          </p>
          {config.reward_description && (
            <p className="mt-1 text-[11px] opacity-75 leading-relaxed">
              {config.reward_description}
            </p>
          )}
        </div>

        {/* Card number mockup */}
        <div className="pt-2 border-t border-cream/15">
          <p className="font-mono text-xs tracking-widest opacity-70">
            ACE-DEMO
          </p>
        </div>
      </div>
    </motion.div>
  );
}
