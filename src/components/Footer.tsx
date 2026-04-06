import { RESTAURANT } from "@/data/restaurant";
import { OliveBranch, RainbowArc } from "./Decorations";

interface FooterProps {
  restaurant?: any;
}

export default function Footer({ restaurant }: FooterProps = {}) {
  const data = restaurant || RESTAURANT;
  return (
    <footer className="relative bg-brown text-white-warm/80 overflow-hidden">
      {/* Subtle decorative element */}
      <OliveBranch className="absolute -top-4 right-12 w-32 text-white-warm/[0.03] rotate-45 hidden lg:block" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {/* Top brand block — distinctive, not grid */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14 pb-10 border-b border-white-warm/10">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-white-warm text-3xl sm:text-5xl font-bold mb-1">
              L&apos;Arc en Ciel
            </h3>
            <RainbowArc className="w-32 sm:w-40 -mt-1 opacity-60" />
            <p className="font-[family-name:var(--font-script)] text-gold-light text-xl mt-1">
              Pizzas au Feu de Bois &amp; Grillades
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={data.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Suivez-nous sur Facebook"
              className="w-11 h-11 rounded-full bg-white-warm/10 hover:bg-gold/30 flex items-center justify-center transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href={data.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Suivez-nous sur Instagram"
              className="w-11 h-11 rounded-full bg-white-warm/10 hover:bg-gold/30 flex items-center justify-center transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href={data.socials.google}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Nos avis Google"
              className="w-11 h-11 rounded-full bg-white-warm/10 hover:bg-gold/30 flex items-center justify-center transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Contact info */}
          <div>
            <h4 className="text-white-warm font-semibold mb-5 text-xs uppercase tracking-[0.2em]">
              Nous trouver
            </h4>
            <a
              href={data.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white-warm/70 hover:text-gold-light transition-colors text-sm leading-relaxed block mb-4"
            >
              {data.address}
            </a>
            <a
              href={data.phoneHref}
              className="text-gold hover:text-gold-light transition-colors font-bold text-lg block mb-2"
            >
              {data.phone}
            </a>
            <a
              href={`mailto:${data.email}`}
              className="text-white-warm/60 hover:text-gold-light transition-colors text-sm"
            >
              {data.email}
            </a>
          </div>

          {/* Navigation */}
          <nav aria-label="Pied de page">
            <h4 className="text-white-warm font-semibold mb-5 text-xs uppercase tracking-[0.2em]">
              Navigation
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Notre carte", href: "#menu" },
                { label: "Galerie", href: "#galerie" },
                { label: "Avis clients", href: "#avis" },
                { label: "Infos pratiques", href: "#contact" },
                { label: "Menu complet (PDF)", href: data.menuPdf, external: true },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...("external" in link && link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-white-warm/60 hover:text-gold transition-colors text-sm inline-flex items-center gap-1.5"
                  >
                    {link.label}
                    {"external" in link && link.external && (
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Horaires + CTA */}
          <div>
            <h4 className="text-white-warm font-semibold mb-5 text-xs uppercase tracking-[0.2em]">
              Horaires
            </h4>
            <div className="space-y-2 mb-6">
              {data.hours.map((h: any) => (
                <div key={h.days} className="flex justify-between text-sm">
                  <span className="text-white-warm/70">{h.days}</span>
                  <span className={h.time === "Fermé" ? "text-red font-semibold" : "text-white-warm/50"}>
                    {h.time}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={data.phoneHref}
              className="inline-block bg-red hover:bg-red-dark text-white-warm font-bold text-sm px-7 py-3 rounded-full transition-all duration-300 hover:scale-105"
            >
              Appeler pour commander
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white-warm/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white-warm/60 text-xs">
            &copy; {new Date().getFullYear()} L&apos;Arc en Ciel — Tous droits réservés
          </p>
          <div className="flex gap-6 text-white-warm/60 text-xs">
            <a href="#" className="hover:text-white-warm/80 transition-colors">
              Mentions légales
            </a>
            <a href="#" className="hover:text-white-warm/80 transition-colors">
              Confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
