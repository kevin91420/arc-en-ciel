import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales — L'Arc en Ciel",
  description:
    "Mentions légales et politique de confidentialité du restaurant L'Arc en Ciel, pizzeria à Morangis.",
};

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-cream text-brown">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brown/60 hover:text-red transition-colors mb-10"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour à l&apos;accueil
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold mb-12">
          Mentions Légales
        </h1>

        <div className="space-y-10 text-brown/80 leading-relaxed">
          {/* Éditeur */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              1. Éditeur du site
            </h2>
            <p>
              Le site <strong>arc-en-ciel-theta.vercel.app</strong> est édité
              par :
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong>Raison sociale :</strong> L&apos;Arc en Ciel
              </li>
              <li>
                <strong>Activité :</strong> Restauration — Pizzeria
              </li>
              <li>
                <strong>Adresse :</strong> 36 Rue de l&apos;Église, 91420
                Morangis
              </li>
              <li>
                <strong>Téléphone :</strong>{" "}
                <a
                  href="tel:+33164540030"
                  className="text-red hover:underline"
                >
                  01 64 54 00 30
                </a>
              </li>
              <li>
                <strong>Email :</strong>{" "}
                <a
                  href="mailto:larcencielmorangis@gmail.com"
                  className="text-red hover:underline"
                >
                  larcencielmorangis@gmail.com
                </a>
              </li>
            </ul>
          </section>

          {/* Hébergeur */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              2. Hébergement
            </h2>
            <p>Ce site est hébergé par :</p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong>Vercel Inc.</strong>
              </li>
              <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
              <li>
                Site web :{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red hover:underline"
                >
                  vercel.com
                </a>
              </li>
            </ul>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              3. Propriété intellectuelle
            </h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, images, graphismes,
              logo, icônes, mise en page) est la propriété exclusive de
              L&apos;Arc en Ciel, sauf mention contraire. Toute reproduction,
              distribution, modification ou utilisation de ces contenus sans
              autorisation préalable est strictement interdite.
            </p>
          </section>

          {/* Responsabilité */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              4. Limitation de responsabilité
            </h2>
            <p>
              L&apos;Arc en Ciel s&apos;efforce de fournir des informations
              aussi précises que possible. Toutefois, il ne pourra être tenu
              responsable des omissions, inexactitudes ou carences dans la mise
              à jour, qu&apos;elles soient de son fait ou du fait de tiers.
              Toutes les informations proposées sont données à titre indicatif
              et sont susceptibles d&apos;évoluer.
            </p>
          </section>

          {/* RGPD */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              5. Protection des données personnelles (RGPD)
            </h2>
            <p>
              Ce site ne collecte aucune donnée personnelle. Aucun formulaire de
              contact, aucun système de création de compte, aucun cookie de
              traçage ou d&apos;analyse n&apos;est utilisé.
            </p>
            <p className="mt-3">
              Aucun cookie n&apos;est déposé sur votre terminal lors de la
              navigation sur ce site. Aucune donnée n&apos;est transmise à des
              tiers.
            </p>
            <p className="mt-3">
              Conformément au Règlement Général sur la Protection des Données
              (RGPD) et à la loi Informatique et Libertés, vous disposez d'un
              droit d&apos;accès, de rectification et de suppression de vos
              données. Pour toute question, contactez-nous à{" "}
              <a
                href="mailto:larcencielmorangis@gmail.com"
                className="text-red hover:underline"
              >
                larcencielmorangis@gmail.com
              </a>
              .
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              6. Cookies
            </h2>
            <p>
              Ce site n&apos;utilise aucun cookie, ni cookie technique, ni
              cookie analytique, ni cookie publicitaire. Aucun bandeau de
              consentement n&apos;est donc nécessaire.
            </p>
          </section>

          {/* Crédits */}
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brown mb-4">
              7. Crédits
            </h2>
            <p>
              Conception et développement du site : réalisé avec Next.js et
              hébergé sur Vercel.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-brown/10">
          <p className="text-sm text-brown/50">
            Dernière mise à jour : avril 2026
          </p>
        </div>
      </div>
    </main>
  );
}
