"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRef, MouseEvent } from "react";
import { RESTAURANT } from "@/data/restaurant";

/* ── Bento Service Card with spotlight + 3D tilt ── */
function BentoServiceCard({
  icon,
  label,
  desc,
  image,
  span,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  image: string;
  span: string;
  accent: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);

    // 3D tilt
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((e.clientY - rect.top - centerY) / centerY) * -6;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 6;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  }

  const spotlightBg = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${accent}15, transparent 80%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={span}
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full overflow-hidden rounded-2xl border border-terracotta/20 bg-brown/95 transition-[transform,box-shadow] duration-300 ease-out group cursor-pointer"
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {/* Background image with overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brown via-brown/80 to-brown/30 group-hover:from-brown group-hover:via-brown/70 group-hover:to-brown/20 transition-all duration-500" />

        {/* Spotlight radial on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: spotlightBg }}
        />

        {/* Decorative corner arc */}
        <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <path d="M100 0 Q100 100 0 100" stroke={accent} strokeWidth="1" fill="none" opacity="0.3" />
            <path d="M100 20 Q100 100 20 100" stroke={accent} strokeWidth="0.5" fill="none" opacity="0.2" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-8">
          {/* Icon with animated ring */}
          <div className="mb-4">
            <div className="relative inline-flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out"
                style={{ background: `${accent}20`, width: "48px", height: "48px", margin: "-4px" }}
              />
              <div
                className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rounded-full"
                style={{ background: `${accent}25` }}
              >
                <div className="text-gold-light group-hover:text-white-warm transition-colors duration-300 [&_svg]:w-5 [&_svg]:h-5">
                  {icon}
                </div>
              </div>
            </div>
          </div>

          {/* Text with slide-up on hover */}
          <h3 className="font-[family-name:var(--font-display)] font-bold text-white-warm text-lg sm:text-xl mb-1 transition-transform duration-300 group-hover:-translate-y-1">
            {label}
          </h3>
          <p className="text-white-warm/60 text-sm leading-relaxed max-w-xs transition-all duration-300 group-hover:text-white-warm/80">
            {desc}
          </p>

          {/* Bottom line animation */}
          <div className="mt-4 h-[2px] w-0 group-hover:w-full transition-all duration-700 ease-out rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Service icons (same SVGs, cleaner) ── */
const ICONS: Record<string, React.ReactNode> = {
  truck: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
  ),
  bag: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
  ),
  sun: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ),
  users: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  ),
  chef: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546M9 6h6m-3-3v3M5 21h14a2 2 0 002-2v-3.546" /></svg>
  ),
  accessible: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4a1 1 0 100-2 1 1 0 000 2zm0 2c-1 0-1.5.5-2 1.5L8 12h8l-2-4.5C13.5 6.5 13 6 12 6zm-4 8a4 4 0 108 0" /></svg>
  ),
};

/* ── Background images per service ── */
const SERVICE_IMAGES: Record<string, string> = {
  truck: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=400&fit=crop",
  bag: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop",
  sun: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
  users: "https://images.unsplash.com/photo-1529543544282-ea666407ffc0?w=600&h=400&fit=crop",
  chef: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&h=400&fit=crop",
  accessible: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
};

/* ── Accent colors per card ── */
const SERVICE_ACCENTS: Record<string, string> = {
  truck: "#C0392B",
  bag: "#B8922F",
  sun: "#E8C97A",
  users: "#C0392B",
  chef: "#B8922F",
  accessible: "#E8C97A",
};

/* ── Bento grid spans — asymmetric layout ── */
const BENTO_SPANS = [
  "col-span-2 row-span-2 min-h-[320px]",           // Livraison — large
  "col-span-1 row-span-1 min-h-[150px]",            // A emporter
  "col-span-1 row-span-1 min-h-[150px]",            // Terrasse
  "col-span-1 row-span-1 min-h-[150px]",            // Evenements
  "col-span-1 row-span-1 min-h-[150px]",            // Traiteur
  "col-span-2 row-span-1 min-h-[150px]",            // PMR — wide
];

interface ServicesProps {
  services?: any[];
}

export default function Services({ services }: ServicesProps = {}) {
  const servicesList = services || RESTAURANT.services;

  return (
    <section className="py-20 sm:py-28 bg-cream relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #2C1810 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="font-[family-name:var(--font-script)] text-gold text-2xl mb-2"
          >
            A votre service
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-5xl font-bold mb-4"
          >
            Bien plus qu&apos;un restaurant
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-24 h-[2px] bg-gradient-to-r from-transparent via-red to-transparent"
          />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[150px] sm:auto-rows-[160px]">
          {servicesList.map((svc, i) => (
            <BentoServiceCard
              key={svc.label}
              icon={ICONS[svc.icon] || null}
              label={svc.label}
              desc={svc.desc}
              image={SERVICE_IMAGES[svc.icon] || ""}
              span={BENTO_SPANS[i] || "col-span-1 row-span-1 min-h-[150px]"}
              accent={SERVICE_ACCENTS[svc.icon] || "#B8922F"}
              delay={Math.min(i * 0.1, 0.5)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
