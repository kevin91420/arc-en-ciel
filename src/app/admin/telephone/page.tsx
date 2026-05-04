"use client";

/**
 * /admin/telephone — Configuration du répondeur téléphonique IA.
 *
 * Sprint 7b QW#10. Permet au manager de :
 *   - Choisir le mode (off / fallback / always)
 *   - Régler le délai avant fallback IA
 *   - Configurer le numéro Twilio + ID assistant Vapi
 *   - Ajuster la personnalité (langue, formalité, voice speed, greeting)
 *   - Activer/désactiver les capacités (résa, horaires, menu, etc.)
 *   - Voir le toggle "Busy mode" live (override 1-clic)
 *
 * Affiche aussi les URLs des tools Vapi à coller dans le dashboard Vapi
 * pour configurer l'assistant.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PHONE_AI_FEATURES_META,
  PHONE_AI_MODE_META,
  type PhoneAIConfig,
  type PhoneAIFeatures,
  type PhoneAIMode,
  type PhoneAIPersonality,
} from "@/lib/db/phone-types";

export default function TelephoneAdminPage() {
  const [config, setConfig] = useState<PhoneAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* Local working copy for edit */
  const [draft, setDraft] = useState<PhoneAIConfig | null>(null);
  const dirty = useMemo(() => {
    if (!config || !draft) return false;
    return JSON.stringify(config) !== JSON.stringify(draft);
  }, [config, draft]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telephony/config", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { config: PhoneAIConfig };
      setConfig(data.config);
      setDraft(data.config);
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

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  async function save() {
    if (!draft || !dirty) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/telephony/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: draft.mode,
          fallback_seconds: draft.fallback_seconds,
          twilio_phone_number: draft.twilio_phone_number,
          vapi_assistant_id: draft.vapi_assistant_id,
          personality: draft.personality,
          features: draft.features,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { config: PhoneAIConfig };
      setConfig(data.config);
      setDraft(data.config);
      flashToast("Configuration enregistrée ✓");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBusy(active: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/telephony/busy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, duration_minutes: 120 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
      flashToast(
        active ? "Mode IA forcée activé pour 2h" : "Mode normal restauré"
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-brown-light">
        Chargement…
      </div>
    );
  }

  if (!config || !draft) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-dark mb-4">{error ?? "Erreur de chargement"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Téléphonie IA
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Répondeur intelligent 🤖📞
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Une IA qui prend les appels quand vos serveurs sont occupés. Mode
          rush, fallback intelligent, ou désactivation complète. Crée des
          réservations, donne les horaires, parle français naturellement.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/admin/telephone/historique"
            className="text-xs text-brown-light hover:text-brown font-semibold underline-offset-2 hover:underline"
          >
            📜 Historique des appels →
          </Link>
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {/* Live Busy Override — toggle 1-clic */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={[
          "mb-6 rounded-2xl border-2 p-5 transition-colors",
          config.busy_override_active
            ? "bg-gold/15 border-gold"
            : "bg-white-warm border-terracotta/20",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown flex items-center gap-2">
              {config.busy_override_active ? "🔥 Rush en cours" : "⚡ Quick toggle"}
            </h2>
            <p className="text-sm text-brown-light/90 mt-1">
              {config.busy_override_active
                ? "L'IA prend tous les appels jusqu'à " +
                  (config.busy_override_until
                    ? new Date(config.busy_override_until).toLocaleTimeString(
                        "fr-FR",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : "expiration")
                : "Toggle 1-clic : force l'IA à prendre tous les appels (override le mode actuel pendant 2h)."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleBusy(!config.busy_override_active)}
            disabled={busy}
            className={[
              "h-12 px-5 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-50",
              config.busy_override_active
                ? "bg-brown text-cream hover:bg-brown-light"
                : "bg-gold text-brown hover:bg-gold/90 shadow-lg shadow-gold/30",
            ].join(" ")}
          >
            {config.busy_override_active
              ? "Désactiver"
              : "Activer pour 2h"}
          </button>
        </div>
      </motion.section>

      {/* Mode selector */}
      <Section
        title="Mode de fonctionnement"
        description="Comportement par défaut quand un client appelle."
      >
        <div className="grid grid-cols-1 gap-3">
          {(["fallback", "always", "off"] as PhoneAIMode[]).map((m) => {
            const meta = PHONE_AI_MODE_META[m];
            const selected = draft.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setDraft({ ...draft, mode: m })}
                className={[
                  "text-left rounded-xl border-2 p-4 transition active:scale-[0.99]",
                  selected
                    ? "bg-gold/10 border-gold"
                    : "bg-cream border-terracotta/30 hover:border-gold/50",
                ].join(" ")}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                    {meta.label}
                  </span>
                  {selected && (
                    <span className="ml-auto text-gold font-bold">✓</span>
                  )}
                </div>
                <p className="text-sm text-brown-light/90 mt-1">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Fallback timeout slider — visible uniquement en mode fallback */}
        {draft.mode === "fallback" && (
          <div className="mt-4 rounded-lg bg-cream border border-terracotta/30 p-4">
            <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
              Délai avant que l&apos;IA prenne le relais
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={45}
                step={5}
                value={draft.fallback_seconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fallback_seconds: Number(e.target.value),
                  })
                }
                className="flex-1 accent-gold"
              />
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums w-16 text-center">
                {draft.fallback_seconds}s
              </span>
            </div>
            <p className="text-[11px] text-brown-light/70 mt-2">
              Le tel sonne pendant {draft.fallback_seconds} secondes dans
              votre resto. Si personne ne décroche, l&apos;IA prend
              l&apos;appel.
            </p>
          </div>
        )}
      </Section>

      {/* Connectivité Twilio + Vapi */}
      <Section
        title="Connectivité"
        description="Numéro de téléphone et configuration de l'assistant Vapi."
      >
        <div className="space-y-4">
          <Field
            label="Numéro de téléphone (Twilio)"
            hint="Ex : +33 1 XX XX XX XX. Le numéro public que vos clients appellent."
          >
            <input
              type="tel"
              value={draft.twilio_phone_number ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  twilio_phone_number: e.target.value || null,
                })
              }
              placeholder="+33 1 XX XX XX XX"
              className={fieldCls}
            />
          </Field>

          <Field
            label="ID Assistant Vapi"
            hint="Crée un assistant dans dashboard.vapi.ai et colle son ID ici."
          >
            <input
              type="text"
              value={draft.vapi_assistant_id ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  vapi_assistant_id: e.target.value || null,
                })
              }
              placeholder="asst_xxxxxxxxxx"
              className={`${fieldCls} font-mono`}
            />
          </Field>

          {/* Tools URLs à coller dans Vapi */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-xs font-bold text-blue-900 mb-2">
              📌 Tools URLs à configurer dans Vapi
            </p>
            <ul className="text-[11px] text-blue-900/80 font-mono space-y-1.5 break-all">
              <li>
                <strong>check-busy</strong> :{" "}
                <code>/api/telephony/vapi/tools/check-busy</code>
              </li>
              <li>
                <strong>restaurant-info</strong> :{" "}
                <code>/api/telephony/vapi/tools/restaurant-info</code>
              </li>
              <li>
                <strong>create-reservation</strong> :{" "}
                <code>/api/telephony/vapi/tools/create-reservation</code>
              </li>
              <li>
                <strong>log-call</strong> :{" "}
                <code>/api/telephony/vapi/tools/log-call</code>
              </li>
            </ul>
            <p className="text-[10px] text-blue-900/70 mt-2 italic">
              Préfixe URL :{" "}
              <code>{typeof window !== "undefined" ? window.location.origin : ""}</code>
              <br />
              Configure aussi <code>metadata.tenant_slug</code> dans ton
              assistant Vapi pour que les tools sachent à quel resto les
              appels appartiennent.
            </p>
          </div>
        </div>
      </Section>

      {/* Personnalité IA */}
      <Section
        title="Personnalité de l'IA"
        description="Comment l'IA s'adresse aux clients."
      >
        <PersonalityEditor
          personality={draft.personality}
          onChange={(p) => setDraft({ ...draft, personality: p })}
        />
      </Section>

      {/* Capacités */}
      <Section
        title="Capacités activées"
        description="Ce que l'IA peut faire pendant un appel."
      >
        <FeaturesEditor
          features={draft.features}
          onChange={(f) => setDraft({ ...draft, features: f })}
        />
      </Section>

      {/* Save bar */}
      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 z-30 rounded-2xl bg-brown text-cream p-4 shadow-2xl flex items-center justify-between gap-3"
        >
          <span className="text-sm font-semibold">
            ⚠ Modifications non enregistrées
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(config)}
              disabled={busy}
              className="text-cream/70 hover:text-cream text-sm px-3 py-2"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="bg-gold text-brown font-bold text-sm px-4 py-2 rounded-lg hover:bg-gold/90 transition active:scale-95 disabled:opacity-50"
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brown text-cream px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
        >
          <span aria-hidden className="text-gold">
            ✓
          </span>
          <span className="font-semibold text-sm">{toast}</span>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════════════════ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5 sm:p-6"
    >
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-1">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-brown-light/80 mb-4">{description}</p>
      )}
      {children}
    </motion.section>
  );
}

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
      {hint && (
        <p className="mt-1 text-[11px] text-brown-light/70 leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
}

const fieldCls =
  "w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/40";

function PersonalityEditor({
  personality,
  onChange,
}: {
  personality: PhoneAIPersonality;
  onChange: (p: PhoneAIPersonality) => void;
}) {
  const formality = personality.formality ?? "vous";
  const speed = personality.voice_speed ?? 1.0;
  const greeting = personality.greeting ?? "";

  return (
    <div className="space-y-4">
      {/* Formality */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
          Tutoiement / Vouvoiement
        </label>
        <div className="flex gap-2">
          {(["vous", "tu"] as const).map((f) => {
            const selected = formality === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ ...personality, formality: f })}
                className={[
                  "flex-1 h-11 rounded-lg text-sm font-bold transition active:scale-95 border-2",
                  selected
                    ? "bg-gold/15 border-gold text-brown"
                    : "bg-cream border-terracotta/30 text-brown-light hover:text-brown",
                ].join(" ")}
              >
                {f === "vous"
                  ? "Vouvoiement (par défaut)"
                  : "Tutoiement (style décontracté)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
          Vitesse de la voix
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={speed}
            onChange={(e) =>
              onChange({
                ...personality,
                voice_speed: parseFloat(e.target.value),
              })
            }
            className="flex-1 accent-gold"
          />
          <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums w-16 text-center">
            {speed.toFixed(2)}×
          </span>
        </div>
        <p className="text-[11px] text-brown-light/70 mt-1.5">
          1.0 = normal · &lt; 1 = plus posé · &gt; 1 = plus rapide
        </p>
      </div>

      {/* Greeting */}
      <Field
        label="Phrase d'accueil personnalisée"
        hint="Laisser vide pour utiliser le greeting par défaut. Ex : 'Bonjour, vous êtes au [resto]. Comment puis-je vous aider ?'"
      >
        <textarea
          value={greeting}
          onChange={(e) =>
            onChange({ ...personality, greeting: e.target.value || undefined })
          }
          placeholder="Bonjour, [resto] à votre écoute…"
          rows={2}
          maxLength={300}
          className={`${fieldCls} resize-none`}
        />
      </Field>
    </div>
  );
}

function FeaturesEditor({
  features,
  onChange,
}: {
  features: PhoneAIFeatures;
  onChange: (f: PhoneAIFeatures) => void;
}) {
  return (
    <ul className="space-y-2">
      {PHONE_AI_FEATURES_META.map((meta) => {
        const enabled = features[meta.key] ?? meta.default_on;
        return (
          <li
            key={meta.key}
            className={[
              "rounded-xl border-2 p-3 transition",
              enabled
                ? "bg-gold/5 border-gold/40"
                : "bg-cream border-terracotta/15",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0" aria-hidden>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-base font-bold text-brown leading-tight">
                  {meta.label}
                </p>
                <p className="text-[11px] text-brown-light/80 mt-0.5 leading-snug">
                  {meta.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() =>
                  onChange({ ...features, [meta.key]: !enabled })
                }
                className={[
                  "w-11 h-6 rounded-full relative transition flex-shrink-0 mt-0.5",
                  enabled ? "bg-gold" : "bg-brown/20",
                ].join(" ")}
              >
                <motion.span
                  layout
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                  animate={{ left: enabled ? 22 : 2 }}
                  transition={{
                    type: "spring",
                    stiffness: 600,
                    damping: 32,
                  }}
                />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
