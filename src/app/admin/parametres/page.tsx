"use client";

/* ═══════════════════════════════════════════════════════════
   /admin/parametres — Centre de contrôle + Personnalisation
   ───────────────────────────────────────────────────────────
   - Header
   - Personnalisation (tabs) ← éditable, nouveau
   - Statistiques globales + Service du jour
   - Intégrations + test email
   - Setup email (si inactif)
   - Fiche restaurant (refetch après save)
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "../_lib/format";
import type {
  OpeningHour,
  RestaurantSettings,
} from "@/lib/db/settings-types";
import { applyThemeToDocument } from "@/lib/settings-theme";

/* ─────────────────────────  Types  ───────────────────────── */

type Integration = {
  enabled: boolean;
  label: string;
  description: string;
  setupUrl: string;
  from?: string;
  admin?: string;
};

type SystemStatus = {
  integrations: {
    supabase: Integration;
    email: Integration;
    webhook: Integration;
  };
  stats: {
    total_reservations: number;
    total_customers: number;
    total_loyalty_cards: number;
    total_stamps: number;
    total_rewards_claimed: number;
    total_orders_today?: number;
    revenue_today_cents?: number;
    active_orders?: number;
  };
  restaurant: {
    name: string;
    phone: string;
    address: string;
    email: string;
  };
};

type TabId =
  | "identite"
  | "contact"
  | "horaires"
  | "socials"
  | "design"
  | "menus"
  | "paiement"
  | "features"
  | "legal";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "identite", label: "Identité", icon: "✨" },
  { id: "contact", label: "Contact", icon: "📍" },
  { id: "horaires", label: "Horaires", icon: "🕒" },
  { id: "socials", label: "Réseaux", icon: "🌐" },
  { id: "design", label: "Design", icon: "🎨" },
  { id: "menus", label: "Menus PDF", icon: "📄" },
  { id: "paiement", label: "Paiement", icon: "💳" },
  { id: "features", label: "Fonctionnalités", icon: "⚙" },
  { id: "legal", label: "Légal", icon: "📜" },
];

/* Deep compare helper (shallow-enough for our flat-ish settings shape). */
function sameSettings(a: RestaurantSettings, b: RestaurantSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ═══════════════════════════════════════════════════════════ */

export default function ParametresPage() {
  /* Legacy status block (integrations + global stats) */
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [testEmailState, setTestEmailState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [testEmailMsg, setTestEmailMsg] = useState<string>("");

  /* Settings (white-label form) */
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [draft, setDraft] = useState<RestaurantSettings | null>(null);
  const [tab, setTab] = useState<TabId>("identite");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* ── System status fetch ── */
  const fetchStatus = useCallback(() => {
    fetch("/api/admin/system-status", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  /* ── Settings fetch ── */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RestaurantSettings;
      setSettings(data);
      setDraft(data);
      applyThemeToDocument(data);
    } catch {
      /* silent — page still works with null */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSettings();
  }, [fetchStatus, fetchSettings]);

  const dirty = useMemo(() => {
    if (!settings || !draft) return false;
    return !sameSettings(settings, draft);
  }, [settings, draft]);

  const update = useCallback(
    <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
      setDraft((d) => (d ? { ...d, [key]: value } : d));
    },
    []
  );

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      /* Strip read-only fields before send */
      const {
        id: _id,
        updated_at: _updated_at,
        ...payload
      } = draft;
      void _id;
      void _updated_at;

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSettings(data);
      setDraft(data);
      applyThemeToDocument(data);
      fetchStatus(); /* refresh legacy restaurant card */
      setToast("Modifications enregistrées ✓");
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft, fetchStatus]);

  const sendTestEmail = async () => {
    setTestEmailState("sending");
    setTestEmailMsg("");
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailState("success");
        setTestEmailMsg(`Email envoyé à ${data.recipient}`);
      } else {
        setTestEmailState("error");
        setTestEmailMsg(data.error || "Erreur inconnue");
      }
    } catch (err) {
      setTestEmailState("error");
      setTestEmailMsg(err instanceof Error ? err.message : "Erreur réseau");
    }
    setTimeout(() => {
      setTestEmailState("idle");
      setTestEmailMsg("");
    }, 8000);
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64 text-brown-light">
        Chargement…
      </div>
    );
  }

  const allIntegrations = [
    { key: "supabase", ...status.integrations.supabase },
    { key: "email", ...status.integrations.email },
    { key: "webhook", ...status.integrations.webhook },
  ];
  const activeCount = allIntegrations.filter((i) => i.enabled).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* ══════════ Header ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Centre de contrôle
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Paramètres
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Personnalisez votre restaurant, gérez vos intégrations et suivez vos
          statistiques en un coup d&apos;œil.
        </p>
      </motion.div>

      {/* ══════════ Personnalisation (NEW) ══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-12"
      >
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold flex items-center gap-2">
            <span>🎨</span> Personnalisation
          </h2>
          {settings && (
            <p className="text-[11px] text-brown-light/60 italic">
              Mis à jour {new Date(settings.updated_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        {!draft ? (
          <div className="p-8 rounded-2xl bg-white-warm border border-terracotta/20 text-center text-brown-light">
            Chargement des paramètres…
          </div>
        ) : (
          <div className="rounded-3xl bg-white-warm border border-terracotta/20 overflow-hidden shadow-sm">
            {/* Tab nav */}
            <div className="sticky top-0 z-20 bg-white-warm/95 backdrop-blur border-b border-terracotta/15">
              <div className="flex overflow-x-auto no-scrollbar px-3">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={[
                        "relative flex-shrink-0 px-4 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap",
                        active
                          ? "text-brown"
                          : "text-brown-light/70 hover:text-brown",
                      ].join(" ")}
                    >
                      <span className="mr-1.5 opacity-80">{t.icon}</span>
                      {t.label}
                      {active && (
                        <motion.span
                          layoutId="tab-underline"
                          className="absolute left-3 right-3 -bottom-px h-[2px] bg-gold rounded-full"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 32,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="p-5 sm:p-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {tab === "identite" && (
                    <IdentityTab draft={draft} update={update} />
                  )}
                  {tab === "contact" && (
                    <ContactTab draft={draft} update={update} />
                  )}
                  {tab === "horaires" && (
                    <HoursTab draft={draft} update={update} />
                  )}
                  {tab === "socials" && (
                    <SocialsTab draft={draft} update={update} />
                  )}
                  {tab === "design" && (
                    <DesignTab draft={draft} update={update} />
                  )}
                  {tab === "menus" && <MenusTab draft={draft} update={update} />}
                  {tab === "paiement" && (
                    <PaymentTab draft={draft} update={update} />
                  )}
                  {tab === "features" && (
                    <FeaturesTab draft={draft} update={update} />
                  )}
                  {tab === "legal" && (
                    <LegalTab draft={draft} update={update} />
                  )}
                </motion.div>
              </AnimatePresence>

              {saveError && (
                <p className="mt-6 text-sm text-red-dark bg-red/10 border border-red/30 px-3 py-2 rounded-lg">
                  {saveError}
                </p>
              )}
            </form>
          </div>
        )}
      </motion.section>

      {/* ══════════ Stats globales ══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>📊</span> Statistiques globales
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Réservations"
            value={status.stats.total_reservations}
            icon="🗓"
          />
          <StatCard label="Clients" value={status.stats.total_customers} icon="👥" />
          <StatCard
            label="Cartes fidélité"
            value={status.stats.total_loyalty_cards}
            icon="⭐"
          />
          <StatCard
            label="Tampons donnés"
            value={status.stats.total_stamps}
            icon="🌰"
          />
          <StatCard
            label="Récompenses"
            value={status.stats.total_rewards_claimed}
            icon="🎁"
          />
        </div>

        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 mt-6 flex items-center gap-2">
          <span>🍽</span> Service du jour
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Commandes aujourd'hui"
            value={status.stats.total_orders_today ?? 0}
            icon="📋"
          />
          <StatCard
            label="CA du jour"
            value={formatCents(status.stats.revenue_today_cents ?? 0)}
            icon="💶"
          />
          <StatCard
            label="Commandes actives"
            value={status.stats.active_orders ?? 0}
            icon="🔥"
          />
        </div>
      </motion.section>

      {/* ══════════ Intégrations ══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>🔌</span> Intégrations · {activeCount}/{allIntegrations.length}{" "}
          actives
        </h2>
        <div className="grid gap-3">
          {allIntegrations.map((integration, i) => (
            <motion.div
              key={integration.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={`p-5 rounded-2xl border-2 transition-colors ${
                integration.enabled
                  ? "bg-white-warm border-green-300/50"
                  : "bg-white-warm border-terracotta/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        integration.enabled
                          ? "bg-green-500 animate-pulse"
                          : "bg-brown/30"
                      }`}
                    />
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                      {integration.label}
                    </h3>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                        integration.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-brown/10 text-brown/60"
                      }`}
                    >
                      {integration.enabled ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="text-sm text-brown-light/80 mb-2">
                    {integration.description}
                  </p>
                  {integration.enabled && integration.from && (
                    <p className="text-xs text-brown-light/60 font-mono">
                      📧 Envoyé depuis : {integration.from}
                    </p>
                  )}
                </div>

                {integration.key === "email" && integration.enabled && (
                  <button
                    onClick={sendTestEmail}
                    disabled={testEmailState === "sending"}
                    className="flex-shrink-0 text-xs bg-gold hover:bg-gold/90 text-brown font-bold px-4 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {testEmailState === "sending"
                      ? "Envoi…"
                      : testEmailState === "success"
                        ? "✓ Envoyé"
                        : testEmailState === "error"
                          ? "⚠ Erreur"
                          : "Tester l'envoi"}
                  </button>
                )}

                {!integration.enabled && (
                  <a
                    href={integration.setupUrl}
                    target={
                      integration.setupUrl.startsWith("http")
                        ? "_blank"
                        : undefined
                    }
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs bg-brown hover:bg-brown/90 text-cream font-bold px-4 py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Configurer →
                  </a>
                )}
              </div>

              {integration.key === "email" && testEmailMsg && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-3 text-xs px-3 py-2 rounded-lg ${
                    testEmailState === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red/10 text-red-dark"
                  }`}
                >
                  {testEmailMsg}
                </motion.p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ══════════ Setup email guide ══════════ */}
      {!status.integrations.email.enabled && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/30"
          id="email-setup"
        >
          <div className="flex items-center gap-2 mb-2">
            <span>⚡</span>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
              Activer les emails (Resend)
            </h3>
          </div>
          <ol className="list-decimal list-inside text-sm text-brown-light/80 space-y-1.5 ml-1">
            <li>
              Créez un compte gratuit sur{" "}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red font-semibold hover:underline"
              >
                resend.com
              </a>{" "}
              (3000 emails/mois gratuits)
            </li>
            <li>
              Vérifiez un domaine (recommandé) ou utilisez{" "}
              <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
                onboarding@resend.dev
              </code>{" "}
              pour tester
            </li>
            <li>
              Créez une clé API dans <strong>API Keys</strong> → <em>Create</em>
            </li>
            <li>
              Dans Vercel → Settings → Environment Variables, ajoutez :
              <ul className="list-disc list-inside ml-4 mt-1.5 space-y-0.5 text-xs">
                <li>
                  <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded">
                    RESEND_API_KEY
                  </code>{" "}
                  = la clé copiée
                </li>
                <li>
                  <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded">
                    EMAIL_FROM
                  </code>{" "}
                  = ex.{" "}
                  <em>L&apos;Arc en Ciel &lt;no-reply@votredomaine.fr&gt;</em>
                </li>
                <li>
                  <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded">
                    ADMIN_EMAIL
                  </code>{" "}
                  = votre email pour recevoir les notifs
                </li>
              </ul>
            </li>
            <li>Redéployez → la section ci-dessus passera en vert 🎉</li>
          </ol>
        </motion.section>
      )}

      {/* ══════════ Fiche restaurant (live refetch) ══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>🏛</span> Fiche restaurant
        </h2>
        <div className="p-6 rounded-2xl bg-white-warm border border-terracotta/20 grid gap-3">
          <InfoRow
            label="Nom"
            value={settings?.name ?? status.restaurant.name}
          />
          <InfoRow
            label="Adresse"
            value={
              settings
                ? [settings.address, settings.postal_code, settings.city]
                    .filter(Boolean)
                    .join(" · ") || status.restaurant.address
                : status.restaurant.address
            }
          />
          <InfoRow
            label="Téléphone"
            value={settings?.phone ?? status.restaurant.phone ?? ""}
          />
          <InfoRow
            label="Email de contact"
            value={settings?.email ?? status.restaurant.email ?? ""}
          />
          <p className="text-xs text-brown-light/60 mt-2 italic">
            💡 Ces informations sont désormais éditables depuis l&apos;onglet
            Personnalisation ci-dessus.
          </p>
        </div>
      </motion.section>

      {/* ══════════ Footer ══════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-brown-light/60 text-center pt-6 border-t border-terracotta/15"
      >
        <p>Version 1.0 · Déployé sur Vercel · Base de données Supabase</p>
      </motion.section>

      {/* ══════════ Sticky Save bar ══════════ */}
      <AnimatePresence>
        {dirty && draft && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brown/95 backdrop-blur text-cream pl-4 pr-2 py-2 rounded-full shadow-2xl"
          >
            <span className="text-xs font-semibold pl-1">
              Modifications non enregistrées
            </span>
            <button
              type="button"
              onClick={() => settings && setDraft(settings)}
              className="text-xs text-cream/70 hover:text-cream px-3 py-2 rounded-full transition"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-xs font-bold bg-gold text-brown px-5 py-2.5 rounded-full hover:bg-gold/90 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ Toast ══════════ */}
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

/* ═════════════════════════════════════════════════════════════
   TABS
   ═════════════════════════════════════════════════════════════ */

type TabProps = {
  draft: RestaurantSettings;
  update: <K extends keyof RestaurantSettings>(
    key: K,
    value: RestaurantSettings[K]
  ) => void;
};

/* ─── Identité ─── */
function IdentityTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Ces informations apparaissent dans votre hero, vos emails et le header
        de votre site public.
      </TabIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Nom du restaurant" required>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={80}
            placeholder="L'Arc en Ciel"
            className={inputCls}
          />
        </Field>
        <Field
          label="Tagline"
          hint="Une phrase courte, affichée sous le nom."
        >
          <input
            type="text"
            value={draft.tagline ?? ""}
            onChange={(e) => update("tagline", e.target.value || null)}
            maxLength={120}
            placeholder="Pizzeria méditerranéenne"
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="Description"
        hint="Texte de présentation long (apparaît en home et en SEO)."
      >
        <textarea
          value={draft.description ?? ""}
          onChange={(e) => update("description", e.target.value || null)}
          rows={3}
          maxLength={500}
          placeholder="Pizzas au feu de bois, grillades halal, pâtes fraîches…"
          className={`${inputCls} resize-none`}
        />
      </Field>

      <Field label="Logo (URL)" hint="Lien direct vers un PNG ou SVG hébergé.">
        <input
          type="url"
          value={draft.logo_url ?? ""}
          onChange={(e) => update("logo_url", e.target.value || null)}
          placeholder="https://…/logo.svg"
          className={inputCls}
        />
        {draft.logo_url && (
          <div className="mt-3 inline-flex items-center gap-3 p-3 rounded-xl bg-cream border border-terracotta/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.logo_url}
              alt="Aperçu logo"
              className="w-12 h-12 object-contain"
            />
            <span className="text-xs text-brown-light">Aperçu du logo</span>
          </div>
        )}
      </Field>
    </div>
  );
}

/* ─── Contact ─── */
function ContactTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Utilisées sur la page contact, dans les confirmations de réservation et
        pour Google Maps.
      </TabIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Téléphone">
          <input
            type="tel"
            value={draft.phone ?? ""}
            onChange={(e) => update("phone", e.target.value || null)}
            placeholder="01 64 54 00 30"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => update("email", e.target.value || null)}
            placeholder="contact@restaurant.fr"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Adresse">
        <input
          type="text"
          value={draft.address ?? ""}
          onChange={(e) => update("address", e.target.value || null)}
          placeholder="36 Rue de l'Église"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="Code postal">
          <input
            type="text"
            value={draft.postal_code ?? ""}
            onChange={(e) => update("postal_code", e.target.value || null)}
            placeholder="91420"
            className={inputCls}
          />
        </Field>
        <Field label="Ville">
          <input
            type="text"
            value={draft.city ?? ""}
            onChange={(e) => update("city", e.target.value || null)}
            placeholder="Morangis"
            className={inputCls}
          />
        </Field>
        <Field label="Pays">
          <input
            type="text"
            value={draft.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="France"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Latitude"
          hint="Coordonnée GPS — utilisée pour la carte."
        >
          <input
            type="number"
            step="0.000001"
            value={draft.latitude ?? ""}
            onChange={(e) =>
              update(
                "latitude",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            placeholder="48.7056"
            className={inputCls}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="0.000001"
            value={draft.longitude ?? ""}
            onChange={(e) =>
              update(
                "longitude",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            placeholder="2.3387"
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── Horaires ─── */
function HoursTab({ draft, update }: TabProps) {
  const hours = draft.hours ?? [];

  const updateRow = (index: number, field: keyof OpeningHour, value: string) => {
    const next = hours.map((h, i) => (i === index ? { ...h, [field]: value } : h));
    update("hours", next);
  };

  const addRow = () => {
    update("hours", [...hours, { days: "", time: "" }]);
  };

  const removeRow = (index: number) => {
    update(
      "hours",
      hours.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      <TabIntro>
        Visibles dans le footer, sur Google, et sur la page contact. Une ligne
        par période (ex : « Mardi – Samedi » + « 11h30 – 14h30 · 19h – 22h30 »).
      </TabIntro>

      <div className="rounded-2xl border border-terracotta/20 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1.4fr_auto] gap-3 px-4 py-2.5 bg-cream/60 text-[10px] uppercase tracking-widest text-brown-light/70 font-bold">
          <span>Jours</span>
          <span>Créneaux</span>
          <span className="sr-only">Actions</span>
        </div>
        <ul className="divide-y divide-terracotta/10">
          {hours.length === 0 && (
            <li className="px-4 py-6 text-sm text-brown-light/70 italic text-center">
              Aucun horaire pour l&apos;instant.
            </li>
          )}
          {hours.map((h, i) => (
            <li
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-3 px-4 py-3 items-center bg-white-warm"
            >
              <input
                type="text"
                value={h.days}
                onChange={(e) => updateRow(i, "days", e.target.value)}
                placeholder="Mardi – Samedi"
                className={inputCls}
              />
              <input
                type="text"
                value={h.time}
                onChange={(e) => updateRow(i, "time", e.target.value)}
                placeholder="11h30 – 14h30 · 19h – 22h30"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="self-center justify-self-start sm:justify-self-auto text-xs text-brown-light hover:text-red font-semibold px-3 py-2 rounded-lg hover:bg-red/10 transition"
                aria-label="Supprimer cette ligne"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brown bg-cream hover:bg-gold/15 border border-terracotta/30 px-4 py-2.5 rounded-lg transition active:scale-95"
      >
        <span className="text-lg leading-none">+</span> Ajouter une ligne
      </button>
    </div>
  );
}

/* ─── Socials ─── */
function SocialsTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Ces liens apparaissent dans le footer et sur la page contact. Laissez
        vide pour masquer.
      </TabIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Facebook" hint="URL complète, incluant https://">
          <input
            type="url"
            value={draft.facebook_url ?? ""}
            onChange={(e) => update("facebook_url", e.target.value || null)}
            placeholder="https://facebook.com/votre-page"
            className={inputCls}
          />
        </Field>
        <Field label="Instagram">
          <input
            type="url"
            value={draft.instagram_url ?? ""}
            onChange={(e) => update("instagram_url", e.target.value || null)}
            placeholder="https://instagram.com/votre-compte"
            className={inputCls}
          />
        </Field>
        <Field
          label="Google Maps"
          hint="Lien court goo.gl/maps/… pour le CTA « Itinéraire »."
        >
          <input
            type="url"
            value={draft.google_maps_url ?? ""}
            onChange={(e) => update("google_maps_url", e.target.value || null)}
            placeholder="https://goo.gl/maps/…"
            className={inputCls}
          />
        </Field>
        <Field label="TripAdvisor">
          <input
            type="url"
            value={draft.tripadvisor_url ?? ""}
            onChange={(e) => update("tripadvisor_url", e.target.value || null)}
            placeholder="https://tripadvisor.fr/…"
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── Design ─── */
function DesignTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Votre palette pilote la charte visuelle : boutons, accents, titres.
        L&apos;aperçu à droite reflète vos choix en temps réel.
      </TabIntro>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
        {/* Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ColorPicker
            label="Couleur de marque"
            value={draft.color_brand}
            onChange={(v) => update("color_brand", v)}
            hint="Fond principal, titres."
          />
          <ColorPicker
            label="Accent"
            value={draft.color_accent}
            onChange={(v) => update("color_accent", v)}
            hint="Liens, détails."
          />
          <ColorPicker
            label="Signature"
            value={draft.color_signature}
            onChange={(v) => update("color_signature", v)}
            hint="Boutons d'action."
          />
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <p className="text-[10px] uppercase tracking-[0.18em] text-brown-light font-semibold mb-3">
            Preview dans le contexte de votre site
          </p>
          <DesignPreview draft={draft} />
        </div>
      </div>
    </div>
  );
}

function DesignPreview({ draft }: { draft: RestaurantSettings }) {
  const { color_brand, color_accent, color_signature, name, tagline } = draft;
  return (
    <motion.div
      layout
      className="rounded-3xl p-6 shadow-xl relative overflow-hidden"
      style={{ backgroundColor: color_brand, color: "#FDF8F0" }}
    >
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: color_accent }}
      />
      <div className="relative space-y-5">
        <div>
          <p
            className="font-[family-name:var(--font-script)] text-xl"
            style={{ color: color_accent }}
          >
            {tagline || "Votre tagline"}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold mt-0.5">
            {name || "Votre restaurant"}
          </h3>
        </div>

        <div
          className="rounded-xl p-3 text-xs"
          style={{ backgroundColor: "rgba(253,248,240,0.08)" }}
        >
          <p
            className="uppercase tracking-widest font-bold"
            style={{ color: color_accent }}
          >
            Spécialité
          </p>
          <p className="mt-1 opacity-90">
            Pizza Margherita · Pâte au levain · 48h de pousse
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 font-bold text-sm px-4 py-2.5 rounded-lg active:scale-95 transition"
            style={{
              backgroundColor: color_signature,
              color: "#FDF8F0",
            }}
          >
            Réserver une table
          </button>
          <button
            type="button"
            className="text-sm px-4 py-2.5 rounded-lg border"
            style={{
              borderColor: color_accent,
              color: color_accent,
              backgroundColor: "transparent",
            }}
          >
            Voir la carte
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-cream/15 text-[11px] opacity-75">
          <span>Ouvert jusqu&apos;à 22h30</span>
          <span style={{ color: color_accent }} className="font-bold">
            ★ 4,7 (312 avis)
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Menus ─── */
function MenusTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Les PDF s&apos;ouvrent en nouvel onglet depuis les CTA « Voir la carte »
        et les QR codes en table.
      </TabIntro>

      <Field label="Menu sur place (PDF)">
        <input
          type="url"
          value={draft.menu_pdf_url ?? ""}
          onChange={(e) => update("menu_pdf_url", e.target.value || null)}
          placeholder="https://…/menu-sur-place.pdf"
          className={inputCls}
        />
      </Field>
      <Field label="Menu à emporter (PDF)">
        <input
          type="url"
          value={draft.menu_emporter_pdf_url ?? ""}
          onChange={(e) =>
            update("menu_emporter_pdf_url", e.target.value || null)
          }
          placeholder="https://…/menu-a-emporter.pdf"
          className={inputCls}
        />
      </Field>
      <Field label="Carte des desserts (PDF)">
        <input
          type="url"
          value={draft.menu_desserts_pdf_url ?? ""}
          onChange={(e) =>
            update("menu_desserts_pdf_url", e.target.value || null)
          }
          placeholder="https://…/carte-desserts.pdf"
          className={inputCls}
        />
      </Field>
    </div>
  );
}

/* ─── Paiement ─── */
function PaymentTab({ draft, update }: TabProps) {
  const [input, setInput] = useState("");
  const methods = draft.payment_methods ?? [];

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (methods.some((m) => m.toLowerCase() === v.toLowerCase())) {
      setInput("");
      return;
    }
    update("payment_methods", [...methods, v]);
    setInput("");
  };
  const remove = (idx: number) => {
    update(
      "payment_methods",
      methods.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="space-y-6">
      <TabIntro>
        Apparaissent sur la page contact et dans le footer, pour rassurer vos
        clients avant de venir.
      </TabIntro>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-brown mb-2">
          Moyens acceptés
        </label>
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-cream border border-terracotta/20 min-h-[64px]">
          <AnimatePresence initial={false}>
            {methods.map((m, i) => (
              <motion.span
                key={`${m}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 bg-white-warm border border-terracotta/30 text-sm text-brown font-semibold pl-3 pr-1.5 py-1.5 rounded-full"
              >
                {m}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-5 h-5 rounded-full text-brown-light hover:bg-red/10 hover:text-red transition text-xs leading-none"
                  aria-label={`Retirer ${m}`}
                >
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {methods.length === 0 && (
            <span className="text-xs text-brown-light/70 italic self-center">
              Aucun moyen de paiement renseigné.
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Carte bancaire, Ticket Restaurant, Apple Pay…"
          maxLength={40}
          className={inputCls}
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="bg-brown hover:bg-brown-light text-cream font-bold px-5 py-2.5 rounded-lg disabled:opacity-40 active:scale-95 transition"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

/* ─── Features ─── */
const FEATURE_ROWS: Array<{
  key: keyof RestaurantSettings;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    key: "feature_reservations",
    label: "Réservations en ligne",
    desc: "Formulaire de réservation public + back-office.",
    icon: "🗓",
  },
  {
    key: "feature_qr_menu",
    label: "QR Menu",
    desc: "Affichage de la carte sur téléphone en table.",
    icon: "📱",
  },
  {
    key: "feature_loyalty",
    label: "Programme de fidélité",
    desc: "Cartes à tampons numériques.",
    icon: "⭐",
  },
  {
    key: "feature_delivery",
    label: "Livraison",
    desc: "Affichage du badge livraison.",
    icon: "🛵",
  },
  {
    key: "feature_takeaway",
    label: "À emporter",
    desc: "Commandes à emporter signalées publiquement.",
    icon: "🥡",
  },
  {
    key: "feature_terrace",
    label: "Terrasse",
    desc: "Badge « terrasse » sur la fiche restaurant.",
    icon: "🌿",
  },
  {
    key: "feature_pmr",
    label: "Accès PMR",
    desc: "Indique l'accessibilité aux personnes à mobilité réduite.",
    icon: "♿",
  },
  {
    key: "feature_halal",
    label: "Cuisine halal",
    desc: "Badge halal sur la page d'accueil.",
    icon: "🕌",
  },
];

function FeaturesTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Activez ou désactivez les modules. Les sections correspondantes
        n&apos;apparaîtront plus sur votre site si désactivées.
      </TabIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FEATURE_ROWS.map((row) => {
          const active = Boolean(draft[row.key]);
          return (
            <button
              key={row.key}
              type="button"
              onClick={() =>
                update(row.key, !active as RestaurantSettings[typeof row.key])
              }
              className={[
                "text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
                active
                  ? "bg-gold/10 border-gold/60"
                  : "bg-white-warm border-terracotta/20 hover:border-terracotta/40",
              ].join(" ")}
            >
              <span className="text-xl mt-0.5 flex-shrink-0" aria-hidden>
                {row.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-sm text-brown">
                    {row.label}
                  </span>
                  <span
                    className={[
                      "text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                      active
                        ? "bg-gold/30 text-brown"
                        : "bg-brown/10 text-brown/60",
                    ].join(" ")}
                  >
                    {active ? "On" : "Off"}
                  </span>
                </span>
                <span className="block text-xs text-brown-light/80 mt-0.5">
                  {row.desc}
                </span>
              </span>
              <Toggle checked={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Legal ─── */
function LegalTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <TabIntro>
        Informations juridiques pour vos mentions légales, CGV et factures.
      </TabIntro>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Raison sociale">
          <input
            type="text"
            value={draft.legal_name ?? ""}
            onChange={(e) => update("legal_name", e.target.value || null)}
            placeholder="SARL L'Arc en Ciel"
            className={inputCls}
          />
        </Field>
        <Field label="SIRET">
          <input
            type="text"
            value={draft.siret ?? ""}
            onChange={(e) => update("siret", e.target.value || null)}
            placeholder="123 456 789 00012"
            className={inputCls}
          />
        </Field>
        <Field label="N° TVA intra">
          <input
            type="text"
            value={draft.vat_number ?? ""}
            onChange={(e) => update("vat_number", e.target.value || null)}
            placeholder="FR12 345678901"
            className={inputCls}
          />
        </Field>
        <Field
          label="Taux de TVA (%)"
          hint="Utilisé pour calculer le HT sur vos tickets."
        >
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={draft.tax_rate}
            onChange={(e) =>
              update(
                "tax_rate",
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              )
            }
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   Shared UI primitives
   ═════════════════════════════════════════════════════════════ */

const inputCls =
  "w-full px-4 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/50";

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
      <label className="block text-xs font-bold uppercase tracking-wider text-brown mb-2">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-brown-light/80">{hint}</p>}
    </div>
  );
}

function TabIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-brown-light/90 bg-cream/50 border-l-2 border-gold/60 pl-3 py-2 pr-4 rounded-r-lg">
      {children}
    </p>
  );
}

function ColorPicker({
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
      <div className="space-y-3">
        <label className="relative block w-full h-24 rounded-xl overflow-hidden border border-terracotta/30 shadow-inner cursor-pointer group">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <span
            className="absolute inset-0 transition-transform group-hover:scale-[1.02]"
            style={{ backgroundColor: value }}
          />
          <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-wider font-bold text-white/90 drop-shadow">
            Cliquez pour choisir
          </span>
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={`${inputCls} font-mono uppercase text-sm`}
        />
      </div>
    </Field>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "relative w-10 h-5 rounded-full flex-shrink-0 transition-colors mt-0.5",
        checked ? "bg-gold" : "bg-brown-light/40",
      ].join(" ")}
      aria-hidden
    >
      <motion.span
        layout
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className={[
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow",
          checked ? "left-[22px]" : "left-0.5",
        ].join(" ")}
      />
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════
   Legacy sub-components (stats, info row)
   ═════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white-warm border border-terracotta/15">
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown leading-none">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
        {label}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-terracotta/10 last:border-0">
      <span className="text-[11px] uppercase tracking-widest text-brown-light/60 font-bold w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-brown font-medium break-all">
        {value || "—"}
      </span>
    </div>
  );
}
