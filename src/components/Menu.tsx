"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PIZZAS, RESTAURANT } from "@/data/restaurant";
import type { PizzaCategory } from "@/data/restaurant";
import { OliveBranch } from "./Decorations";

const CATEGORIES: { key: PizzaCategory | "all"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "classiques", label: "Classiques" },
  { key: "speciales", label: "Spéciales" },
  { key: "vegetariennes", label: "Végétariennes" },
];

interface MenuProps {
  pizzas?: any[];
  restaurant?: any;
}

export default function Menu({ pizzas, restaurant }: MenuProps = {}) {
  const allPizzas = pizzas || PIZZAS;
  const data = restaurant || RESTAURANT;
  const [active, setActive] = useState<PizzaCategory | "all">("all");

  const filtered =
    active === "all" ? allPizzas : allPizzas.filter((p) => p.category === active);

  const featured = filtered.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <section id="menu" className="relative py-24 sm:py-32 bg-cream bg-paper overflow-hidden">
      {/* Background decorative element */}
      <div className="absolute top-20 right-0 w-72 h-72 bg-terracotta/5 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 left-0 w-60 h-60 bg-gold/5 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — RIGHT ALIGNED (breaks pattern) */}
        <div className="flex flex-col items-end text-right mb-14 max-w-lg ml-auto">
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: "3rem" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="h-[2px] bg-gold mb-6"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="font-[family-name:var(--font-script)] text-gold text-2xl mb-2"
          >
            À découvrir
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.1 }}
            className="text-balance font-[family-name:var(--font-display)] text-brown text-3xl sm:text-5xl font-bold"
          >
            Nos <span className="italic text-red">Pizzas</span>{" "}
            <span className="block text-base sm:text-lg font-normal text-brown-light/70 mt-1">au feu de bois</span>
          </motion.h2>
        </div>

        {/* Category filter */}
        <div role="tablist" aria-label="Catégories de pizzas" className="flex flex-wrap justify-center gap-3 mb-12">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              id={`tab-${cat.key}`}
              role="tab"
              aria-selected={active === cat.key}
              aria-controls="menu-tabpanel"
              onClick={() => setActive(cat.key)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
                active === cat.key
                  ? "text-white-warm"
                  : "bg-white-warm text-brown-light hover:bg-terracotta/20 border border-terracotta/30"
              }`}
            >
              {active === cat.key && (
                <motion.span
                  layoutId="activeFilter"
                  className="absolute inset-0 bg-red rounded-full shadow-lg shadow-red/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panel — filtered results */}
        <div id="menu-tabpanel" role="tabpanel" aria-labelledby={`tab-${active}`}>
        {/* Featured signature card */}
        <AnimatePresence mode="popLayout">
          {featured && (
            <motion.article
              key="featured"
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-10 group"
            >
              <div className="relative bg-brown rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="relative h-64 lg:h-auto min-h-[280px]">
                  <Image
                    src={featured.image.replace("w=600", "w=900").replace("h=400", "h=600")}
                    alt={`Pizza ${featured.name} — ${featured.ingredients}`}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-brown/30 lg:bg-gradient-to-l" />
                </div>
                <div className="p-8 sm:p-12 flex flex-col justify-center">
                  <span className="inline-block bg-gold text-brown text-xs font-bold px-4 py-1.5 rounded-full mb-4 w-fit tracking-wide uppercase">
                    {featured.badge}
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-white-warm text-3xl sm:text-4xl font-bold mb-3">
                    {featured.name}
                  </h3>
                  <p className="text-white-warm/70 leading-relaxed mb-6 max-w-md">
                    {featured.ingredients}
                  </p>
                  <div className="flex items-center gap-6">
                    <span className="font-[family-name:var(--font-display)] text-gold-light text-3xl font-bold">
                      {featured.price}
                    </span>
                    <a
                      href={data.orderUrl}
                      className="bg-red hover:bg-red-dark text-white-warm font-bold text-sm px-6 py-3 rounded-full transition-colors duration-300"
                    >
                      Commander
                    </a>
                  </div>
                  <OliveBranch className="w-24 text-white-warm/10 mt-6" />
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>

        {/* Pizza grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout">
            {rest.map((pizza, i) => (
              <motion.article
                key={pizza.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="group bg-white-warm rounded-2xl overflow-hidden shadow-md shadow-brown/5 hover:shadow-xl hover:shadow-brown/10 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-52 sm:h-56 overflow-hidden">
                  <Image
                    src={pizza.image}
                    alt={`Pizza ${pizza.name} — ${pizza.ingredients}`}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                  />
                  {pizza.badge && (
                    <span className="ribbon bg-gold text-brown shadow-md">
                      {pizza.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-brown">
                      {pizza.name}
                    </h3>
                    <span className="font-bold text-red text-lg whitespace-nowrap ml-3">
                      {pizza.price}
                    </span>
                  </div>
                  <p className="text-brown-light/80 text-sm leading-relaxed mb-4">
                    {pizza.ingredients}
                  </p>
                  <a
                    href={data.orderUrl}
                    className="inline-flex items-center gap-2 text-red font-semibold text-sm hover:text-red-dark transition-colors group/btn"
                  >
                    Commander
                    <svg
                      className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
        </div>

        {/* Full Menu CTA — entice customers to explore beyond pizzas */}
        <div id="menu-complet" className="mt-20 sm:mt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-10"
          >
            <p className="font-[family-name:var(--font-script)] text-gold text-xl sm:text-2xl mb-2">
              Bien plus que des pizzas
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-brown text-2xl sm:text-3xl font-bold">
              Découvrez toute notre <span className="italic text-terracotta-deep">carte</span>
            </h3>
            <p className="text-brown-light/70 mt-3 max-w-md mx-auto text-sm sm:text-base">
              Grillades, pâtes, salades, desserts… Consultez nos menus complets
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
            {[
              {
                href: data.menuPdf,
                title: "Menu sur place",
                ariaLabel: "Menu sur place (PDF, s'ouvre dans un nouvel onglet)",
                desc: "Pizzas, grillades, pâtes, salades & entrées",
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                accent: "from-red/10 to-terracotta/10",
                iconBg: "bg-red/15 text-red",
              },
              {
                href: data.menuEmporterPdf,
                title: "Menu à emporter",
                ariaLabel: "Menu à emporter (PDF, s'ouvre dans un nouvel onglet)",
                desc: "Toute la carte à déguster chez vous",
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
                accent: "from-gold/10 to-terracotta/10",
                iconBg: "bg-gold/20 text-gold-dark",
              },
              {
                href: data.menuDessertsPdf,
                title: "Carte des desserts",
                ariaLabel: "Carte des desserts (PDF, s'ouvre dans un nouvel onglet)",
                desc: "Tiramisu, panna cotta & douceurs maison",
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 8.25V4.125a2.625 2.625 0 00-5.25 0v.036c0 .466.09.917.256 1.332" />
                  </svg>
                ),
                accent: "from-terracotta/10 to-gold/10",
                iconBg: "bg-terracotta/15 text-terracotta-deep",
              },
            ].map((menu, i) => (
              <motion.a
                key={menu.title}
                href={menu.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={menu.ariaLabel}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-white-warm rounded-2xl p-6 sm:p-7 border-2 border-brown/[0.06] hover:border-gold/50 transition-all duration-500 hover:shadow-xl hover:shadow-gold/10 hover:-translate-y-1 overflow-hidden"
              >
                {/* Subtle gradient bg on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${menu.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${menu.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    {menu.icon}
                  </div>

                  {/* Title */}
                  <h4 className="font-[family-name:var(--font-display)] text-brown text-lg font-semibold mb-1.5">
                    {menu.title}
                  </h4>

                  {/* Description */}
                  <p className="text-brown-light/70 text-sm leading-relaxed mb-4">
                    {menu.desc}
                  </p>

                  {/* CTA arrow */}
                  <span className="inline-flex items-center gap-2 text-red font-semibold text-sm group-hover:text-red-dark transition-colors">
                    Consulter
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
