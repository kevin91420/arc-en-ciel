"use client";

/**
 * /admin/fidelite/anniversaires — Vue mensuelle des anniversaires clients.
 *
 * Affiche la liste des clients qui ont leur anniversaire dans le mois
 * sélectionné, avec :
 *   - Nom, jour exact, âge qu'ils auront
 *   - Email + téléphone (si dispo)
 *   - Badge carte fidélité si enrolled
 *   - Statut consentements (marketing, SMS)
 *
 * Actions batch :
 *   - "Copier tous les emails" → clipboard pour utiliser dans Mailchimp/Brevo
 *   - "Mailto" pré-rempli avec le template anniversaire
 *   - Switch mois précédent / mois suivant
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "Demander année de naissance pour envoyer une notif anniversaire,
 * permet de fidéliser".
 *
 * RGPD : seuls les clients ayant donné `birthday_consent = true` apparaissent.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import {
  useRestaurantBranding,
} from "@/lib/hooks/useRestaurantBranding";
import type { BirthdayCustomer } from "@/lib/db/loyalty-types";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function AnniversairesAdminPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    today.getMonth() + 1
  );
  const [data, setData] = useState<{
    month: number;
    month_label: string;
    count: number;
    birthdays: BirthdayCustomer[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const branding = useRestaurantBranding();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/loyalty/birthdays?month=${selectedMonth}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as typeof data;
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isCurrentMonth = selectedMonth === today.getMonth() + 1;
  const isPastMonth =
    selectedMonth < today.getMonth() + 1; // dans la même année courante

  /* Compteurs utiles */
  const stats = useMemo(() => {
    if (!data) return null;
    const withEmail = data.birthdays.filter((b) => b.customer_email).length;
    const withPhone = data.birthdays.filter((b) => b.customer_phone).length;
    const withMarketing = data.birthdays.filter(
      (b) => b.marketing_consent
    ).length;
    const withSMS = data.birthdays.filter((b) => b.sms_consent).length;
    const enrolled = data.birthdays.filter((b) => b.has_active_card).length;
    return {
      withEmail,
      withPhone,
      withMarketing,
      withSMS,
      enrolled,
    };
  }, [data]);

  const allEmails = useMemo(() => {
    if (!data) return "";
    return data.birthdays
      .filter((b) => b.customer_email && b.marketing_consent)
      .map((b) => b.customer_email)
      .join(", ");
  }, [data]);

  const allMailtoBcc = useMemo(() => {
    if (!data) return "";
    const emails = data.birthdays
      .filter((b) => b.customer_email && b.marketing_consent)
      .map((b) => b.customer_email!)
      .join(",");
    if (!emails) return "";
    const subject = `🎂 Joyeux anniversaire ! Petit cadeau de ${branding.name}`;
    const body = `Cher(e) [Prénom],

Toute l'équipe de ${branding.name} vous souhaite un très joyeux anniversaire !

Pour fêter ça, on vous offre [VOTRE OFFRE — ex : un dessert maison] lors de votre prochaine visite ce mois-ci. Présentez simplement ce mail à votre serveur.

À très bientôt,
${branding.name}
${branding.phone || ""}
${branding.address ? `${branding.address}` : ""}`;
    return `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [data, branding]);

  function copyEmails() {
    if (!allEmails) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(allEmails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link
          href="/admin/fidelite"
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
          Retour à la fidélité
        </Link>
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Marketing automatique
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Anniversaires clients 🎂
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Liste des clients qui ont leur anniversaire ce mois-ci. Envoie-leur
          un message ou un avoir cadeau pour les fidéliser. Seuls les clients
          ayant donné leur consentement explicite (RGPD) apparaissent ici.
        </p>
      </motion.div>

      {/* Sélecteur de mois */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5 bg-white-warm border border-terracotta/20 rounded-xl p-4 flex items-center gap-3 flex-wrap"
      >
        <button
          type="button"
          onClick={() =>
            setSelectedMonth((m) => (m === 1 ? 12 : m - 1))
          }
          className="w-10 h-10 rounded-full bg-cream border border-terracotta/30 hover:border-gold text-brown text-lg font-bold transition active:scale-95"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
          className="h-10 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm font-semibold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        >
          {MONTH_LABELS.map((label, i) => (
            <option key={i} value={i + 1}>
              {label} {today.getFullYear()}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            setSelectedMonth((m) => (m === 12 ? 1 : m + 1))
          }
          className="w-10 h-10 rounded-full bg-cream border border-terracotta/30 hover:border-gold text-brown text-lg font-bold transition active:scale-95"
          aria-label="Mois suivant"
        >
          →
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => setSelectedMonth(today.getMonth() + 1)}
            className="text-xs text-brown-light hover:text-brown underline-offset-2 hover:underline ml-auto font-semibold"
          >
            ↺ Revenir au mois courant
          </button>
        )}
      </motion.section>

      {/* Stats */}
      {data && stats && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          <StatCard
            label="Anniversaires"
            value={String(data.count)}
            tone="brown"
            emphasis
            sub={`en ${data.month_label.toLowerCase()}`}
          />
          <StatCard
            label="Avec email"
            value={String(stats.withEmail)}
            tone="green"
          />
          <StatCard
            label="Avec téléphone"
            value={String(stats.withPhone)}
            tone="blue"
          />
          <StatCard
            label="Carte fidélité"
            value={String(stats.enrolled)}
            tone="gold"
          />
          <StatCard
            label="Opt-in marketing"
            value={String(stats.withMarketing)}
            tone="muted"
            sub="recevable email/SMS"
          />
        </motion.section>
      )}

      {/* Actions batch */}
      {data && data.count > 0 && allEmails && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 rounded-xl bg-gold/10 border border-gold/30 p-4"
        >
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown mb-2">
            🎯 Lancer une campagne anniversaire
          </h3>
          <p className="text-xs text-brown-light/90 mb-3">
            {stats?.withMarketing} client
            {(stats?.withMarketing ?? 0) > 1 ? "s" : ""} ayant accepté le
            marketing par email. Choisis l&apos;outil :
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {allMailtoBcc && (
              <a
                href={allMailtoBcc}
                className="h-10 px-4 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition active:scale-95 inline-flex items-center gap-2"
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
                Ouvrir email pré-rempli (mailto)
              </a>
            )}
            <button
              type="button"
              onClick={copyEmails}
              className="h-10 px-4 rounded-lg bg-cream text-brown text-sm font-semibold border border-terracotta/30 hover:border-gold transition active:scale-95 inline-flex items-center gap-2"
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
              {copied
                ? "✓ Copié"
                : `Copier les ${stats?.withMarketing ?? 0} emails`}
            </button>
          </div>
          <p className="text-[10px] text-brown-light/60 mt-3 italic">
            💡 Astuce : crée un avoir cadeau (ex 5€) dans /admin/avoirs pour
            chaque anniversaire, puis colle leurs codes dans tes emails.
          </p>
        </motion.section>
      )}

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

      {!loading && data && data.count === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            🎂
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            Aucun anniversaire en {data.month_label.toLowerCase()}.
            {isCurrentMonth && isPastMonth ? null : null}
          </p>
          <p className="text-[11px] text-brown-light/60 mt-3 max-w-md mx-auto px-4">
            Quand un client s&apos;inscrit à la fidélité depuis le QR menu,
            il peut désormais renseigner sa date de naissance — il
            apparaîtra ici automatiquement le mois venu.
          </p>
        </div>
      )}

      {!loading && data && data.count > 0 && (
        <ul className="space-y-2">
          {data.birthdays.map((b) => (
            <BirthdayCard key={b.customer_id} birthday={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Birthday card
   ═══════════════════════════════════════════════════════════ */

function BirthdayCard({ birthday: b }: { birthday: BirthdayCustomer }) {
  const today = new Date();
  const isToday =
    b.birthday_month === today.getMonth() + 1 &&
    b.birthday_day === today.getDate();
  const isPast =
    b.birthday_month === today.getMonth() + 1 &&
    b.birthday_day < today.getDate();

  return (
    <motion.li
      layout
      className={[
        "rounded-xl bg-white-warm border p-4 flex items-start gap-4 transition",
        isToday
          ? "border-2 border-gold bg-gold/5 shadow-md shadow-gold/20"
          : isPast
            ? "border-terracotta/15 opacity-60"
            : "border-terracotta/20 hover:border-gold/40",
      ].join(" ")}
    >
      {/* Avatar jour */}
      <div
        className={[
          "w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0",
          isToday
            ? "bg-gold text-brown shadow-md"
            : "bg-cream text-brown border border-terracotta/30",
        ].join(" ")}
      >
        <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">
          {isToday ? "Aujourd'hui" : "Jour"}
        </span>
        <span className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none tabular-nums">
          {b.birthday_day}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown leading-tight">
            {b.customer_name}
          </h3>
          {isToday && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/30 text-brown">
              🎂 C&apos;est aujourd&apos;hui !
            </span>
          )}
          {b.has_active_card && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brown text-cream">
              ⭐ Fidèle
            </span>
          )}
          {b.age_turning !== null && (
            <span className="text-xs text-brown-light/70">
              · {b.age_turning} ans
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brown-light/80">
          {b.customer_email && (
            <a
              href={`mailto:${b.customer_email}?subject=${encodeURIComponent(`🎂 Joyeux anniversaire ${b.customer_name} !`)}`}
              className="inline-flex items-center gap-1 hover:text-brown"
            >
              <svg
                className="w-3 h-3"
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
              {b.customer_email}
            </a>
          )}
          {b.customer_phone && (
            <a
              href={`tel:${b.customer_phone}`}
              className="inline-flex items-center gap-1 hover:text-brown"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h2.5l1.5 5L7 10a11 11 0 005 5l2-2 5 1.5V17a2 2 0 01-2 2A16 16 0 013 5z"
                />
              </svg>
              {b.customer_phone}
            </a>
          )}
          {b.total_visits > 0 && (
            <span className="inline-flex items-center gap-1">
              · {b.total_visits} visite{b.total_visits > 1 ? "s" : ""}
            </span>
          )}
          {b.total_spent_cents > 0 && (
            <span className="inline-flex items-center gap-1">
              · CA {formatCents(b.total_spent_cents)}
            </span>
          )}
        </div>

        {/* Consentements */}
        <div className="mt-2 flex flex-wrap gap-1">
          <ConsentChip ok={true} label="Anniversaire" />
          <ConsentChip ok={b.marketing_consent} label="Email marketing" />
          <ConsentChip ok={b.sms_consent} label="SMS" />
        </div>
      </div>
    </motion.li>
  );
}

function ConsentChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
        ok
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-cream text-brown-light/60 border border-terracotta/20",
      ].join(" ")}
    >
      <span aria-hidden>{ok ? "✓" : "—"}</span>
      {label}
    </span>
  );
}

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
  tone?: "brown" | "green" | "gold" | "blue" | "muted";
  emphasis?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    green: "text-green-700",
    gold: "text-gold",
    blue: "text-blue-700",
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
          emphasis ? "text-3xl" : "text-2xl",
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
