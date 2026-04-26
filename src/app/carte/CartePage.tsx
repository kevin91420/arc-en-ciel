"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { TAG_LABELS, type DietaryTag, type MenuItem } from "@/data/carte";
import { OliveBranch } from "@/components/Decorations";
import { useEightySixList } from "@/lib/hooks/useEightySixList";
import { useEditorialMenu } from "@/lib/hooks/useMenu";

/* ═══════════════════════════════════════════════════════════
   LA CARTE — Page éditoriale magazine culinaire
   Mini-hero pour accès rapide aux plats
   ═══════════════════════════════════════════════════════════ */

const FILTERS: { key: DietaryTag | "all"; label: string }[] = [
  { key: "all", label: "Tout voir" },
  { key: "halal", label: "Halal" },
  { key: "vegetarien", label: "Végétarien" },
  { key: "epice", label: "Épicé" },
];

export default function CartePage() {
  const [filter, setFilter] = useState<DietaryTag | "all">("all");
  const [activeSection, setActiveSection] = useState<string>("entrees");
  const eightySixSet = useEightySixList();
  const carte = useEditorialMenu();

  /* Filter logic */
  const filteredCarte = useMemo(() => {
    if (filter === "all") return carte;
    return carte
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.tags?.includes(filter)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [filter, carte]);

  /* Scroll spy for sticky nav */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -50% 0px" }
    );
    carte.forEach((cat) => {
      const el = document.getElementById(cat.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [carte]);

  return (
    <div className="bg-cream min-h-screen bg-paper">
      {/* ═══ MINI HERO (≈ 22vh, condensé) ═══ */}
      <header className="relative pt-6 pb-5 sm:pt-8 sm:pb-6 overflow-hidden border-b border-terracotta/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Back link — discret, en haut à gauche */}
          <div className="mb-3 sm:mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-brown-light/80 hover:text-red transition-colors text-xs font-medium group"
            >
              <svg
                className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Link>
          </div>

          {/* Titre compact sur une ligne */}
          <div className="relative flex flex-col items-center text-center">
            <OliveBranch className="absolute top-1/2 -translate-y-1/2 left-0 w-14 text-terracotta-deep/20 -rotate-12 hidden lg:block" />
            <OliveBranch className="absolute top-1/2 -translate-y-1/2 right-0 w-14 text-terracotta-deep/20 rotate-12 hidden lg:block" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4"
            >
              <span className="font-[family-name:var(--font-script)] text-gold text-lg sm:text-xl leading-none">
                L&apos;Arc en Ciel
              </span>
              <span className="hidden sm:inline-block w-px h-6 bg-gold/40" aria-hidden="true" />
              <h1 className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-4xl font-bold leading-none tracking-tight">
                La <span className="italic text-terracotta-deep">Carte</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-brown-light text-xs sm:text-sm max-w-xl mx-auto leading-relaxed mt-2"
            >
              Pizzas au feu de bois, grillades halal, pâtes fraîches, desserts maison.
            </motion.p>
          </div>
        </div>
      </header>

      {/* ═══ STICKY NAV + FILTERS (immédiatement visible) ═══ */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-terracotta/15 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Categories nav */}
          <nav className="overflow-x-auto scrollbar-hide" aria-label="Sections de la carte">
            <ul className="flex items-center gap-1 sm:gap-2 py-2.5 min-w-max">
              {carte.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`#${cat.id}`}
                    className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                      activeSection === cat.id
                        ? "bg-brown text-cream shadow-md"
                        : "text-brown-light hover:text-brown hover:bg-terracotta/10"
                    }`}
                  >
                    <span className="text-xs opacity-60">{cat.number}</span>
                    <span>{cat.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-2 border-t border-terracotta/10">
            <span className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mr-2 hidden sm:inline">
              Filtrer :
            </span>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                  filter === f.key
                    ? "bg-gold text-brown border-gold"
                    : "bg-transparent text-brown-light border-terracotta/30 hover:border-gold hover:text-brown"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CATEGORIES ═══ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-24">
        {filteredCarte.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-brown-light text-lg">Aucun plat ne correspond à ce filtre.</p>
          </div>
        ) : (
          filteredCarte.map((category, catIdx) => (
            <section
              key={category.id}
              id={category.id}
              className="mb-24 sm:mb-32 scroll-mt-36"
              aria-labelledby={`heading-${category.id}`}
            >
              {/* Category header — editorial style */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 sm:mb-16 items-end">
                <div className="lg:col-span-4">
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="font-[family-name:var(--font-display)] text-[8rem] sm:text-[10rem] lg:text-[12rem] leading-none font-bold text-gold/20 block tracking-tighter"
                  >
                    {category.number}
                  </motion.span>
                </div>
                <div className="lg:col-span-8 lg:pb-8">
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="font-[family-name:var(--font-script)] text-gold text-xl sm:text-2xl mb-2"
                  >
                    {category.subtitle}
                  </motion.p>
                  <motion.h2
                    id={`heading-${category.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="font-[family-name:var(--font-display)] text-brown text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-balance"
                  >
                    {category.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-brown-light text-sm sm:text-base max-w-xl leading-relaxed italic"
                  >
                    {category.intro}
                  </motion.p>
                </div>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-16 gap-y-10 sm:gap-y-14">
                {category.items.map((item, i) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    reversed={i % 2 === 1}
                    outOfStock={eightySixSet.has(item.id)}
                  />
                ))}
              </div>

              {/* Decorative divider between categories */}
              {catIdx < filteredCarte.length - 1 && (
                <div className="flex items-center justify-center mt-20 sm:mt-24">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <OliveBranch className="w-20 text-terracotta-deep/40 mx-6" />
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gold/30 to-transparent" />
                </div>
              )}
            </section>
          ))
        )}
      </main>

      {/* ═══ FOOTER CTA ═══ */}
      <footer className="bg-brown text-cream py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-2xl mb-3">
            Une envie ?
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold mb-8 text-balance">
            Réservez ou commandez dès maintenant
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+33164540030"
              className="inline-flex items-center gap-3 bg-red hover:bg-red-dark text-white-warm font-bold px-8 py-4 rounded-full transition-colors duration-300 shadow-xl shadow-red/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              01 64 54 00 30
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-cream/30 hover:border-gold hover:text-gold-light text-cream font-semibold px-8 py-4 rounded-full transition-colors duration-300"
            >
              Retour au site
            </Link>
          </div>
          <p className="text-cream/50 text-xs mt-10 max-w-md mx-auto leading-relaxed">
            Les prix sont indiqués TTC. Liste des allergènes disponible sur demande. Nos viandes sont halal, certifiées par l&apos;organisme AVS.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MENU ITEM CARD — Éditorial, asymétrique
   ═══════════════════════════════════════════════════════════ */
function MenuItemCard({
  item,
  index,
  reversed,
  outOfStock,
}: {
  item: MenuItem;
  index: number;
  reversed?: boolean;
  outOfStock?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "group relative transition",
        outOfStock ? "opacity-55 saturate-[0.55]" : "",
      ].join(" ")}
      aria-label={outOfStock ? `${item.name} — épuisé ce soir` : undefined}
    >
      <div className={`flex flex-col gap-5 ${reversed ? "md:flex-col" : "md:flex-col"}`}>
        {/* Image */}
        {item.image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-white-warm">
            <Image
              src={item.image}
              alt={`${item.name} — ${item.description}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
            {/* Warm overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-brown/10 via-transparent to-transparent pointer-events-none" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {outOfStock && (
                <span className="inline-flex items-center gap-1 bg-brown text-cream text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                  Épuisé ce soir
                </span>
              )}
              {item.signature && (
                <span className="inline-flex items-center gap-1 bg-brown/90 backdrop-blur-sm text-gold-light text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  ★ Signature
                </span>
              )}
              {item.chef && !item.signature && (
                <span className="inline-flex items-center gap-1 bg-gold/95 backdrop-blur-sm text-brown text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Choix du chef
                </span>
              )}
              {item.popular && !item.signature && !item.chef && (
                <span className="inline-flex items-center gap-1 bg-red/95 backdrop-blur-sm text-white-warm text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Populaire
                </span>
              )}
            </div>
          </div>
        )}

        {/* Text content */}
        <div className="flex flex-col">
          {/* Name + dots + price (classic editorial menu layout) */}
          <div className="flex items-baseline gap-3 mb-2">
            <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold text-brown leading-tight">
              {item.name}
            </h3>
            <span
              className="flex-1 border-b border-dotted border-brown/20 translate-y-[-6px]"
              aria-hidden="true"
            />
            <span className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-gold whitespace-nowrap">
              {item.price}
            </span>
          </div>

          {/* Description */}
          <p className="text-brown-light/80 text-sm sm:text-[0.95rem] leading-relaxed mb-3">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${TAG_LABELS[tag].color}`}
                >
                  {TAG_LABELS[tag].label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
