"use client";

import { motion } from "framer-motion";
import { SIGNATURES } from "@/data/restaurant";
import { FlameIcon, LeafIcon, DoughIcon, OliveBranch } from "./Decorations";

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  fire: FlameIcon,
  ingredients: LeafIcon,
  dough: DoughIcon,
};

export default function Signature() {
  return (
    <section id="savoir-faire" className="relative py-24 sm:py-32 bg-white-warm bg-linen vignette-warm overflow-hidden">
      {/* Decorative olive branches */}
      <OliveBranch className="absolute top-8 left-8 w-20 text-terracotta-deep opacity-20 -rotate-12 hidden lg:block" />
      <OliveBranch className="absolute bottom-8 right-8 w-20 text-terracotta-deep opacity-20 rotate-12 hidden lg:block" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header — LEFT ALIGNED to break monotony */}
        <div className="max-w-lg mb-16 sm:mb-20">
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
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-script)] text-gold text-2xl mb-2"
          >
            Notre savoir-faire
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-balance font-[family-name:var(--font-display)] text-brown text-3xl sm:text-5xl font-bold leading-tight"
          >
            Ce qui fait la{" "}
            <span className="italic text-terracotta-deep">différence</span>
          </motion.h2>
        </div>

        {/* Cards — staggered, not evenly centered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6">
          {SIGNATURES.map((item, i) => {
            const Icon = ICONS[item.icon] || FlameIcon;
            return (
              <motion.div
                key={item.icon}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-cream rounded-2xl p-8 sm:p-10 border-2 border-terracotta/15 hover:border-gold transition-all duration-500 hover:shadow-lg hover:shadow-gold/10"
              >
                <div className="w-14 h-14 mb-6 rounded-xl bg-terracotta/20 flex items-center justify-center text-terracotta-deep group-hover:bg-terracotta/30 transition-colors duration-300">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-brown mb-3">
                  {item.title}
                </h3>
                <p className="text-brown-light/80 leading-relaxed text-[0.95rem]">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
