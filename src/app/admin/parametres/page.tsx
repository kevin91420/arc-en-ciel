"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   /admin/parametres — Centre de contrôle du système
   ═══════════════════════════════════════════════════════════ */

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
  };
  restaurant: {
    name: string;
    phone: string;
    address: string;
    email: string;
  };
};

export default function ParametresPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [testEmailState, setTestEmailState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [testEmailMsg, setTestEmailMsg] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/system-status", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

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
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
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
          Vue d&apos;ensemble de votre système, intégrations connectées et
          statistiques globales.
        </p>
      </motion.div>

      {/* Stats globales */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
      </motion.section>

      {/* Intégrations */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-xs uppercase tracking-widest text-brown-light/60 font-bold mb-3 flex items-center gap-2">
          <span>🔌</span> Intégrations · {activeCount}/{allIntegrations.length} actives
        </h2>
        <div className="grid gap-3">
          {allIntegrations.map((integration, i) => (
            <motion.div
              key={integration.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
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
                        integration.enabled ? "bg-green-500 animate-pulse" : "bg-brown/30"
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

      {/* Setup guide pour emails si non configuré */}
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
              </a>
              {" "}(3000 emails/mois gratuits)
            </li>
            <li>
              Vérifiez un domaine (recommandé) ou utilisez{" "}
              <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
                onboarding@resend.dev
              </code>
              {" "}pour tester
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
                  = ex. <em>L&apos;Arc en Ciel &lt;no-reply@votredomaine.fr&gt;</em>
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

      {/* Infos restaurant */}
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
          <InfoRow label="Nom" value={status.restaurant.name} />
          <InfoRow label="Adresse" value={status.restaurant.address} />
          <InfoRow label="Téléphone" value={status.restaurant.phone} />
          <InfoRow label="Email de contact" value={status.restaurant.email} />
          <p className="text-xs text-brown-light/60 mt-2 italic">
            💡 L&apos;édition des infos restaurant viendra dans une prochaine version.
            Pour l&apos;instant, ces valeurs sont configurées dans le code (src/data/restaurant.ts).
          </p>
        </div>
      </motion.section>

      {/* Footer links */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-brown-light/60 text-center pt-6 border-t border-terracotta/15"
      >
        <p>Version 1.0 · Déployé sur Vercel · Base de données Supabase</p>
      </motion.section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
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
      <span className="text-sm text-brown font-medium">{value}</span>
    </div>
  );
}
