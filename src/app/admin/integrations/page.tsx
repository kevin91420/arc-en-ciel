"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   /admin/integrations — Webhook setup + examples par plateforme
   ═══════════════════════════════════════════════════════════ */

type TokenInfo = {
  configured: boolean;
  token: string | null;
  webhook_url?: string;
  hint?: string;
};

const PLATFORMS = [
  {
    id: "thefork",
    name: "TheFork",
    icon: "🍴",
    color: "from-[#5bb4a1] to-[#2d5a4e]",
    setup:
      "Dans TheFork Manager → Intégrations → Webhooks, collez l'URL ci-dessous. Ou via Zapier : trigger 'New reservation TheFork' → action HTTP POST.",
    samplePayload: {
      source: "thefork",
      external_id: "TF-{{reservation_id}}",
      customer_name: "{{guest_name}}",
      customer_phone: "{{guest_phone}}",
      customer_email: "{{guest_email}}",
      date: "{{date}}",
      time: "{{time}}",
      guests: "{{party_size}}",
      notes: "{{special_request}}",
    },
  },
  {
    id: "google",
    name: "Google Reserve",
    icon: "🔎",
    color: "from-[#4285F4] to-[#0F9D58]",
    setup:
      "Configurez via Zapier ou Make.com : 'Gmail - New email matching Google Reservations' → HTTP POST vers ce webhook.",
    samplePayload: {
      source: "google",
      external_id: "GR-{{confirmation_code}}",
      customer_name: "{{name}}",
      customer_phone: "{{phone}}",
      date: "{{date}}",
      time: "{{time}}",
      guests: "{{party_size}}",
    },
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    icon: "🛵",
    color: "from-[#00CCBC] to-[#008B7F]",
    setup:
      "Deliveroo → Zapier → 'New order' → HTTP POST. Utile pour créer une fiche client à chaque commande.",
    samplePayload: {
      source: "other",
      external_id: "DLV-{{order_id}}",
      customer_name: "{{customer_name}}",
      customer_phone: "{{customer_phone}}",
      date: "{{delivery_date}}",
      time: "{{delivery_time}}",
      guests: 1,
      notes: "Commande Deliveroo #{{order_id}}",
    },
  },
  {
    id: "phone",
    name: "Téléphone (manuel)",
    icon: "📞",
    color: "from-brown to-[#5C3D2E]",
    setup:
      "Pour les résas prises par téléphone, l'équipe peut saisir directement via le dashboard admin — pas besoin de webhook.",
    samplePayload: {
      source: "phone",
      customer_name: "Nom du client",
      customer_phone: "06 XX XX XX XX",
      date: "2026-04-25",
      time: "20:00",
      guests: 4,
    },
  },
];

export default function IntegrationsPage() {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [revealToken, setRevealToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/webhook-token", { credentials: "include" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ configured: false, token: null }));
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  if (!info) {
    return (
      <div className="flex items-center justify-center h-64 text-brown-light">
        Chargement…
      </div>
    );
  }

  const baseUrl = info.webhook_url || "https://arc-en-ciel-theta.vercel.app";
  const webhookUrl = `${baseUrl}/api/reservations/webhook`;
  const token = info.token || "<WEBHOOK_SECRET non configuré>";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Tout centraliser
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Intégrations
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Connectez TheFork, Google Reserve, Deliveroo et toute autre plateforme
          au CRM. Les réservations atterrissent automatiquement ici, avec leur
          source tagguée.
        </p>
      </motion.div>

      {/* Status */}
      {!info.configured && (
        <div className="mb-8 p-4 rounded-xl border border-yellow-400/40 bg-yellow-50/40">
          <p className="text-sm text-brown font-semibold mb-1">
            ⚠️ Webhook non configuré
          </p>
          <p className="text-xs text-brown-light/80">
            Ajoutez <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded">WEBHOOK_SECRET</code>
            {" "}dans Vercel → Settings → Environment Variables, puis redéployez.
          </p>
        </div>
      )}

      {/* Credentials block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12 p-6 rounded-2xl bg-brown text-cream"
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">🔐</span>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Vos identifiants webhook
          </h2>
        </div>

        {/* URL */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest text-gold-light font-bold block mb-1.5">
            URL du Webhook
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-black/30 px-3 py-2.5 rounded-lg break-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => copy(webhookUrl, "url")}
              className="text-xs bg-gold hover:bg-gold/90 text-brown font-bold px-3 py-2.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
            >
              {copied === "url" ? "✓ Copié" : "Copier"}
            </button>
          </div>
        </div>

        {/* Token */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-gold-light font-bold block mb-1.5">
            Token d&apos;authentification
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-black/30 px-3 py-2.5 rounded-lg break-all">
              {info.configured
                ? revealToken
                  ? token
                  : "•".repeat(40)
                : token}
            </code>
            {info.configured && (
              <button
                onClick={() => setRevealToken(!revealToken)}
                className="text-xs bg-cream/10 hover:bg-cream/20 border border-cream/30 text-cream font-semibold px-3 py-2.5 rounded-lg active:scale-95 transition-transform"
              >
                {revealToken ? "Masquer" : "Voir"}
              </button>
            )}
            {info.configured && (
              <button
                onClick={() => copy(token, "token")}
                className="text-xs bg-gold hover:bg-gold/90 text-brown font-bold px-3 py-2.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
              >
                {copied === "token" ? "✓ Copié" : "Copier"}
              </button>
            )}
          </div>
          <p className="text-[11px] text-cream/60 mt-2">
            Ajoutez le token dans l&apos;en-tête{" "}
            <code className="font-mono bg-cream/10 px-1 py-0.5 rounded">
              Authorization: Bearer &lt;token&gt;
            </code>{" "}
            de chaque appel. Ne le partagez jamais publiquement.
          </p>
        </div>
      </motion.div>

      {/* Quick test */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-12 p-6 rounded-2xl bg-white-warm border border-terracotta/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <span>🧪</span>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
            Test rapide (cURL)
          </h2>
        </div>
        <p className="text-brown-light/80 text-sm mb-3">
          Lancez cette commande dans un terminal pour tester votre webhook :
        </p>
        <pre className="bg-brown text-gold-light font-mono text-xs p-4 rounded-lg overflow-x-auto">
{`curl -X POST ${webhookUrl} \\
  -H "Authorization: Bearer ${info.configured ? (revealToken ? token : "VOTRE_TOKEN") : "VOTRE_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "thefork",
    "external_id": "TEST-001",
    "customer_name": "Test TheFork",
    "customer_phone": "0612345678",
    "date": "2026-05-01",
    "time": "20:00",
    "guests": 4
  }'`}
        </pre>
        <p className="text-[11px] text-brown-light/60 mt-2">
          Si succès → la résa apparaît instantanément dans{" "}
          <a
            href="/admin/reservations"
            className="text-red font-semibold hover:underline"
          >
            /admin/reservations
          </a>
        </p>
      </motion.div>

      {/* Platforms */}
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mb-5">
        Plateformes supportées
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="p-5 rounded-2xl bg-white-warm border border-terracotta/15 hover:border-gold/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-xl shadow-md`}
              >
                {p.icon}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                {p.name}
              </h3>
            </div>
            <p className="text-xs text-brown-light/80 leading-relaxed mb-3">
              {p.setup}
            </p>
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-red hover:text-red-dark flex items-center gap-1">
                Exemple de payload JSON
                <svg
                  className="w-3 h-3 transition-transform group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </summary>
              <pre className="mt-2 bg-cream font-mono text-[11px] p-3 rounded-lg overflow-x-auto border border-terracotta/15 text-brown">
                {JSON.stringify(p.samplePayload, null, 2)}
              </pre>
            </details>
          </motion.div>
        ))}
      </div>

      {/* Zapier tutorial */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-[#FF4A00]/10 to-transparent border border-[#FF4A00]/30"
      >
        <div className="flex items-center gap-2 mb-2">
          <span>⚡</span>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
            Setup via Zapier (recommandé)
          </h3>
        </div>
        <ol className="list-decimal list-inside text-sm text-brown-light/80 space-y-1.5 ml-1">
          <li>
            Créez un compte sur{" "}
            <a
              href="https://zapier.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red font-semibold hover:underline"
            >
              zapier.com
            </a>{" "}
            (gratuit jusqu&apos;à 100 tâches/mois)
          </li>
          <li>
            <strong>Trigger</strong> : choisissez votre plateforme (TheFork,
            Gmail, etc.) et l&apos;évènement « New reservation »
          </li>
          <li>
            <strong>Action</strong> : « Webhooks by Zapier » → POST
          </li>
          <li>
            <strong>URL</strong> : collez{" "}
            <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
              {webhookUrl}
            </code>
          </li>
          <li>
            <strong>Headers</strong> : ajoutez{" "}
            <code className="font-mono bg-brown/10 px-1.5 py-0.5 rounded text-[11px]">
              Authorization: Bearer &lt;votre token&gt;
            </code>
          </li>
          <li>
            <strong>Body</strong> : utilisez le payload JSON de la plateforme
            ci-dessus
          </li>
          <li>Testez, puis activez le Zap 🎉</li>
        </ol>
      </motion.div>
    </div>
  );
}
