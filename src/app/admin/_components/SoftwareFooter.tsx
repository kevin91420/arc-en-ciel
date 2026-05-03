"use client";

/**
 * SoftwareFooter — bloc info logiciel discret en bas du sidebar admin.
 *
 * Affiche :
 *   - Nom + version du logiciel
 *   - Tenant slug (numéro client)
 *   - Statut abonnement + date de fin de trial si applicable
 *   - Variante commerciale (Business)
 *   - Lien support
 *
 * Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
 * "En bas à droite : numéro client, version, validité contrat, licence."
 *
 * Source du tenant : /api/me/restaurant (côté client, lit le tenant courant).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface MeResponse {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

/* Versions pinnées au build — bumpé manuellement à chaque release majeure. */
const APP_VERSION = "0.7b";
const APP_VARIANT = "Business";

type SubscriptionInfo = {
  status: string;
  trial_ends_at: string | null;
};

export default function SoftwareFooter() {
  const [tenant, setTenant] = useState<MeResponse | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    /* Charge le tenant courant (info publique). */
    fetch("/api/me/restaurant", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setTenant(data);
      })
      .catch(() => {});

    /* Charge le statut d'abonnement (info admin). On ne doit pas crasher si
     * le tenant n'est pas trouvé — silent fail. */
    fetch("/api/admin/me/subscription", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? (r.json() as Promise<SubscriptionInfo>) : null))
      .then((data) => {
        if (!cancelled && data) setSub(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  /* Calcule les jours restants du trial pour l'alerte */
  const trialDaysLeft = sub?.trial_ends_at
    ? Math.ceil(
        (new Date(sub.trial_ends_at).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000)
      )
    : null;

  const isTrial = sub?.status === "trial";
  const isExpired = sub?.status === "expired" || sub?.status === "canceled";
  const trialUrgent = isTrial && trialDaysLeft !== null && trialDaysLeft <= 7;

  return (
    <div
      className="px-4 py-3 border-t border-cream/10 text-[10px] text-cream/45 leading-relaxed font-mono"
      title="Informations logiciel"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-cream/80 font-bold">Arc-en-Ciel SaaS</span>
        <span className="text-cream/40">·</span>
        <span className="uppercase tracking-wider text-gold-light/80 font-bold">
          v{APP_VERSION}
        </span>
      </div>
      <div className="mt-1">
        <span className="text-cream/40">Édition</span>{" "}
        <span className="text-cream/70">{APP_VARIANT}</span>
      </div>
      {tenant && (
        <div className="mt-1.5">
          <span className="text-cream/40">Client</span>{" "}
          <span className="text-cream/70 break-all">{tenant.slug}</span>
        </div>
      )}
      {sub && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={[
              "inline-block w-1.5 h-1.5 rounded-full",
              isExpired
                ? "bg-red"
                : trialUrgent
                  ? "bg-amber-400"
                  : isTrial
                    ? "bg-blue-400"
                    : "bg-green-400",
            ].join(" ")}
            aria-hidden
          />
          <span className="capitalize">{prettyStatus(sub.status)}</span>
          {sub.trial_ends_at && isTrial && (
            <span
              className={[
                "ml-auto",
                trialUrgent ? "text-amber-300 font-bold" : "text-cream/50",
              ].join(" ")}
            >
              {trialDaysLeft !== null && trialDaysLeft >= 0
                ? `${trialDaysLeft}j restants`
                : "expiré"}
            </span>
          )}
        </div>
      )}

      {/* Liens support / docs */}
      <div className="mt-2.5 pt-2 border-t border-cream/10 flex items-center gap-3">
        <Link
          href="/admin/restaurants"
          className="text-cream/55 hover:text-gold-light transition"
          title="Console SaaS"
        >
          Compte
        </Link>
        <span className="text-cream/20">·</span>
        <a
          href="mailto:k.aubouin@gmail.com?subject=Support Arc-en-Ciel SaaS"
          className="text-cream/55 hover:text-gold-light transition"
        >
          Support
        </a>
      </div>
    </div>
  );
}

function prettyStatus(s: string): string {
  switch (s) {
    case "trial":
      return "Essai gratuit";
    case "active":
      return "Actif";
    case "past_due":
      return "Impayé";
    case "canceled":
      return "Résilié";
    case "expired":
      return "Expiré";
    default:
      return s;
  }
}
