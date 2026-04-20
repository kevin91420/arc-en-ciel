"use client";

import { motion } from "framer-motion";
import { HERO_IMAGES, RESTAURANT } from "@/data/restaurant";
import { OliveBranch } from "./Decorations";

const HERO_VIDEO_DESKTOP =
  "/hf_20260413_111125_5cf727e4-470a-429d-8216-8a94f01ec1bb.mp4";
const HERO_VIDEO_MOBILE =
  "/hf_20260420_080351_2b1c37ce-426b-42c4-8936-49c7746032b4.mp4";

interface HeroProps {
  heroImages?: { src: string; alt?: string }[];
  /** URL poster optimisée (ex. Sanity via urlFor), prioritaire sur heroImages[0].src */
  heroPosterUrl?: string;
  restaurant?: { phoneHref: string };
}

export default function Hero({
  heroImages,
  heroPosterUrl,
  restaurant,
}: HeroProps = {}) {
  const data = restaurant || RESTAURANT;
  const images =
    heroImages && heroImages.length > 0 ? heroImages : HERO_IMAGES;
  const posterSrc = heroPosterUrl || images[0]?.src;

  return (
    <section id="accueil" className="relative h-screen w-full overflow-hidden bg-black">
      {/* Deux balises vidéo (pas de <source media>) : le SSR et le client doivent produire le même arbre pour l’hydratation. */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-100 md:hidden"
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        aria-hidden
      >
        <source src={HERO_VIDEO_MOBILE} type="video/mp4" />
      </video>
      <video
        className="absolute inset-0 hidden h-full w-full object-cover opacity-100 md:block"
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        aria-hidden
      >
        <source src={HERO_VIDEO_DESKTOP} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0c06]/80 via-[#2C1810]/25 to-[#1a0c06]/40" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <OliveBranch className="mx-auto mb-4 w-28 text-gold-light sm:w-36" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="font-[family-name:var(--font-script)] mb-1 text-2xl text-gold-light sm:text-4xl"
        >
          Bienvenue chez
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-[family-name:var(--font-display)] mb-3 text-5xl font-bold leading-[0.95] tracking-tight text-white-warm sm:text-7xl lg:text-[6.5rem]"
        >
          <span className="block">L&apos;Arc en Ciel</span>
          <span className="mt-2 block text-lg font-normal tracking-wide text-gold-light/90 sm:text-2xl lg:text-3xl">
            Pizzeria au feu de bois à Morangis
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "6rem" }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mb-4 h-[2px] bg-gradient-to-r from-transparent via-gold-light to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mb-4 text-base font-light uppercase tracking-[0.25em] text-white-warm/80 sm:text-lg"
        >
          Pizzas au Feu de Bois &middot; Grillades &middot; Pâtes &middot;
          Cuisine Méditerranéenne
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-white-warm/60 sm:text-base"
        >
          Restaurant L&apos;Arc en Ciel à Morangis (91420) &mdash; pizzas
          artisanales cuites au feu de bois, grillades savoureuses et
          spécialités méditerranéennes. Livraison, à emporter ou sur place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <a
            href={data.phoneHref}
            className="rounded-full bg-red px-8 py-4 text-lg font-bold text-white-warm transition-all duration-300 hover:scale-105 hover:bg-red-dark active:scale-95"
          >
            <span className="flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Commander par telephone
            </span>
          </a>
          <a
            href="#menu"
            className="rounded-full border-2 border-white-warm/40 px-8 py-4 text-lg font-semibold text-white-warm transition-all duration-300 hover:border-gold-light hover:bg-white-warm/10 active:scale-95"
          >
            Voir le menu
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-6 flex flex-col items-center gap-4 sm:bottom-10"
        >
          <div className="flex flex-col items-center gap-2 text-xs tracking-wide text-white-warm/60 sm:flex-row sm:gap-6 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              36 Rue de l&apos;Église, Morangis
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              01 64 54 00 30
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
