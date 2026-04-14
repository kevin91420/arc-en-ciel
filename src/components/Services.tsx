"use client";

import { motion } from "framer-motion";
import { useState, useCallback, memo } from "react";
import { RESTAURANT } from "@/data/restaurant";

/* ═══════════════════════════════════════════════════════════
   SERVICES — Focus Cards + Cinematic Layout
   Inspired by Aceternity Focus Cards — hover = focus + blur
   ═══════════════════════════════════════════════════════════ */

const SERVICES_DATA = [
  {
    label: "Livraison",
    desc: "A domicile dans Morangis et environs",
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&h=600&fit=crop&q=80",
    tag: "30 min",
  },
  {
    label: "A emporter",
    desc: "Pret en 20 min, appelez pour commander",
    image: "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=800&h=600&fit=crop&q=80",
    tag: "20 min",
  },
  {
    label: "Terrasse",
    desc: "Profitez des beaux jours en exterieur",
    image: "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800&h=600&fit=crop&q=80",
    tag: "Plein air",
  },
  {
    label: "Evenements prives",
    desc: "Mariages, anniversaires, receptions",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=600&fit=crop&q=80",
    tag: "Sur mesure",
  },
  {
    label: "Service traiteur",
    desc: "Pour vos evenements sur mesure",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&h=600&fit=crop&q=80",
    tag: "A la carte",
  },
  {
    label: "Acces PMR",
    desc: "Accessible aux personnes a mobilite reduite",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
    tag: "Pour tous",
  },
];


/* ── Focus Card — blurs others on hover ── */
const ServiceCard = memo(function ServiceCard({
  card,
  index,
  hovered,
  setHovered,
  total,
}: {
  card: (typeof SERVICES_DATA)[0];
  index: number;
  hovered: number | null;
  setHovered: (i: number | null) => void;
  total: number;
}) {
  // First 2 cards are tall, rest are normal
  const isFeatured = index < 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      tabIndex={0}
      role="group"
      aria-label={card.label}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(index)}
      onBlur={() => setHovered(null)}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-500 ease-out outline-none
        focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brown
        ${isFeatured ? "md:row-span-2" : ""}
        ${hovered === index ? "scale-[1.02] shadow-2xl shadow-black/40 z-10" : ""}
      `}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={card.image}
          alt={card.label}
          className={`
            w-full h-full object-cover
            transition-transform duration-700 ease-out
            ${hovered === index ? "scale-110" : "scale-100"}
          `}
        />
      </div>

      {/* Gradient overlay — always dark bottom, lighter on hover */}
      <div className={`
        absolute inset-0 transition-all duration-500
        ${hovered === index
          ? "bg-gradient-to-t from-black/90 via-black/40 to-transparent"
          : "bg-gradient-to-t from-black/80 via-black/50 to-black/30"
        }
      `} />

      {/* Tag badge — top right */}
      <div className={`
        absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
        backdrop-blur-md border transition-all duration-500
        ${hovered === index
          ? "bg-red/80 border-red/50 text-white-warm"
          : "bg-white/10 border-white/20 text-white/70"
        }
      `}>
        {card.tag}
      </div>

      {/* Content — bottom */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-8">
        {/* Title */}
        <h3 className={`
          font-[family-name:var(--font-display)] font-bold text-xl sm:text-2xl mb-2
          transition-all duration-500
          ${hovered === index
            ? "text-white translate-y-0"
            : "text-white/90"
          }
        `}>
          {card.label}
        </h3>

        {/* Description — slides up on hover */}
        <p className={`
          text-sm leading-relaxed max-w-xs
          transition-all duration-500
          ${hovered === index
            ? "text-white/80 opacity-100 translate-y-0 max-h-20"
            : "text-white/0 opacity-0 translate-y-4 max-h-0"
          }
        `}>
          {card.desc}
        </p>

        {/* Animated line */}
        <div className={`
          mt-4 h-[2px] rounded-full bg-gradient-to-r from-red via-gold to-transparent
          transition-all duration-700 ease-out
          ${hovered === index ? "w-full" : "w-0"}
        `} />
      </div>
    </motion.div>
  );
});

/* ── Main Section ── */
interface ServicesProps {
  services?: any[];
}

export default function Services({ services }: ServicesProps = {}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const handleSetHovered = useCallback((i: number | null) => setHovered(i), []);

  return (
    <section id="services" className="relative py-24 sm:py-32 bg-brown overflow-hidden">
      {/* Clean background — no grain */}

      {/* Decorative arcs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]">
        <svg viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="200" stroke="#B8922F" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="250" stroke="#B8922F" strokeWidth="0.3" />
          <circle cx="300" cy="300" r="300" stroke="#B8922F" strokeWidth="0.2" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-[family-name:var(--font-script)] text-gold-light text-2xl mb-3"
          >
            A votre service
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-[family-name:var(--font-display)] text-white-warm text-4xl sm:text-6xl font-bold mb-5"
          >
            Bien plus qu&apos;un restaurant
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white-warm/50 text-base sm:text-lg max-w-xl mx-auto"
          >
            Un lieu de vie, de partage et de gourmandise
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 w-32 h-[1px] bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          />
        </div>

        {/* Focus Cards Grid — 2 tall + 4 smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[240px] sm:auto-rows-[260px]">
          {SERVICES_DATA.map((card, i) => (
            <ServiceCard
              key={card.label}
              card={card}
              index={i}
              hovered={hovered}
              setHovered={handleSetHovered}
              total={SERVICES_DATA.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
