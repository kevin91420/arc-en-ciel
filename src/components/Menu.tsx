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
            className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-5xl font-bold"
          >
            Nos <span className="italic text-red">Pizzas</span>
          </motion.h2>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat.key)}
              aria-pressed={active === cat.key}
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

        {/* Featured signature card */}
        <AnimatePresence mode="popLayout">
          {featured && (
            <motion.div
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
                    alt={featured.name}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pizza grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout">
            {rest.map((pizza, i) => (
              <motion.div
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
                    alt={pizza.name}
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
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Menu PDF links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-14"
        >
          <a
            href={data.menuPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brown-light font-semibold hover:text-red transition-colors border-b-2 border-terracotta/30 hover:border-red pb-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Menu sur place (PDF)
          </a>
          <a
            href={data.menuEmporterPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brown-light font-semibold hover:text-red transition-colors border-b-2 border-terracotta/30 hover:border-red pb-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Menu à emporter (PDF)
          </a>
          <a
            href={data.menuDessertsPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brown-light font-semibold hover:text-red transition-colors border-b-2 border-terracotta/30 hover:border-red pb-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Carte des desserts (PDF)
          </a>
        </motion.div>
      </div>
    </section>
  );
}
