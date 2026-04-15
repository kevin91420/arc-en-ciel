"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_IMAGES, RESTAURANT } from "@/data/restaurant";
import { OliveBranch } from "./Decorations";

interface HeroProps {
  heroImages?: any[];
  restaurant?: any;
}

export default function Hero({ heroImages, restaurant }: HeroProps = {}) {
  const images = heroImages || HERO_IMAGES;
  const data = restaurant || RESTAURANT;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, []);

  const goTo = useCallback((i: number) => {
    setCurrent(i);
    setPaused(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, paused]);

  return (
    <section id="accueil" className="relative h-screen w-full overflow-hidden">
      {/* Background slides */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0"
            style={{
              animation: `kenburns-${(current % 3) + 1} 6s ease-out forwards`,
            }}
          >
            <Image
              src={images[current].src}
              alt={images[current].alt}
              fill
              className="object-cover"
              priority={current === 0}
              sizes="100vw"
              quality={85}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Overlay — richer gradient with warm tint */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0c06]/80 via-[#2C1810]/25 to-[#1a0c06]/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <OliveBranch className="w-28 sm:w-36 mx-auto mb-4 text-gold-light" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="font-[family-name:var(--font-script)] text-gold-light text-2xl sm:text-4xl mb-1"
        >
          Bienvenue chez
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-white-warm text-5xl sm:text-7xl lg:text-[6.5rem] font-bold tracking-tight mb-3 leading-[0.95]"
        >
          <span className="block">L&apos;Arc en Ciel</span>
          <span className="block text-gold-light/90 text-lg sm:text-2xl lg:text-3xl font-normal tracking-wide mt-2">
            Pizzeria au feu de bois à Morangis
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "6rem" }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="h-[2px] bg-gradient-to-r from-transparent via-gold-light to-transparent mb-4"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-white-warm/80 text-base sm:text-lg tracking-[0.25em] uppercase font-light mb-4"
        >
          Pizzas au Feu de Bois &middot; Grillades &middot; Pâtes &middot; Cuisine Méditerranéenne
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="text-white-warm/60 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Restaurant L&apos;Arc en Ciel à Morangis (91420) &mdash; pizzas artisanales cuites au feu de bois, grillades savoureuses et spécialités méditerranéennes. Livraison, à emporter ou sur place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href={data.phoneHref}
            className="bg-red hover:bg-red-dark text-white-warm font-bold text-lg px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Commander par telephone
            </span>
          </a>
          <a
            href="#menu"
            className="border-2 border-white-warm/40 hover:border-gold-light text-white-warm font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 hover:bg-white-warm/10 active:scale-95"
          >
            Voir le menu
          </a>
        </motion.div>

        {/* Bottom info bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-6 sm:bottom-10 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-6 text-white-warm/60 text-xs sm:text-sm tracking-wide">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              36 Rue de l&apos;Église, Morangis
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              01 64 54 00 30
            </span>
          </div>
          {/* Slide indicators */}
          <div className="flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-6 rounded-full transition-all duration-500 p-1 ${
                  i === current
                    ? "bg-gold w-10"
                    : "bg-white-warm/40 w-6 hover:bg-white-warm/70"
                }`}
                aria-label={`Photo ${i + 1} sur ${images.length}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
