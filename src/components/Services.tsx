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
    icon: "truck",
    label: "Livraison",
    desc: "A domicile dans Morangis et environs",
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&h=600&fit=crop&q=80",
    tag: "30 min",
  },
  {
    icon: "bag",
    label: "A emporter",
    desc: "Pret en 20 min, appelez pour commander",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80",
    tag: "20 min",
  },
  {
    icon: "sun",
    label: "Terrasse",
    desc: "Profitez des beaux jours en exterieur",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop&q=80",
    tag: "Plein air",
  },
  {
    icon: "users",
    label: "Evenements prives",
    desc: "Mariages, anniversaires, receptions",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=600&fit=crop&q=80",
    tag: "Sur mesure",
  },
  {
    icon: "chef",
    label: "Service traiteur",
    desc: "Pour vos evenements sur mesure",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&h=600&fit=crop&q=80",
    tag: "A la carte",
  },
  {
    icon: "accessible",
    label: "Acces PMR",
    desc: "Accessible aux personnes a mobilite reduite",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
    tag: "Pour tous",
  },
];

/* ── Icon SVGs ── */
const ICONS: Record<string, React.ReactNode> = {
  truck: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  bag: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  sun: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  users: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  chef: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546M5 21h14a2 2 0 002-2v-3.546" /></svg>,
  accessible: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4a1 1 0 100-2 1 1 0 000 2zm0 2c-1 0-1.5.5-2 1.5L8 12h8l-2-4.5C13.5 6.5 13 6 12 6zm-4 8a4 4 0 108 0" /></svg>,
};

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
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-500 ease-out
        ${isFeatured ? "md:row-span-2" : ""}
        ${hovered !== null && hovered !== index ? "blur-[3px] scale-[0.97] opacity-70" : ""}
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
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center mb-4
          transition-all duration-500 backdrop-blur-sm
          ${hovered === index
            ? "bg-red/30 border border-red/40 text-white"
            : "bg-white/10 border border-white/10 text-white/60"
          }
        `}>
          {ICONS[card.icon]}
        </div>

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
    <section className="relative py-24 sm:py-32 bg-brown overflow-hidden">
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[200px] sm:auto-rows-[220px]">
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
