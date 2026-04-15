"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { RESTAURANT } from "@/data/restaurant";
import { OliveBranch } from "./Decorations";

interface OrderCTAProps {
  restaurant?: any;
}

export default function OrderCTA({ restaurant }: OrderCTAProps = {}) {
  const data = restaurant || RESTAURANT;
  return (
    <section
      id="commander"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background image instead of plain gradient */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&h=600&fit=crop&q=70"
          alt=""
          fill
          className="object-cover"
          loading="lazy"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C1810]/90 via-[#2C1810]/80 to-[#2C1810]/70" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <OliveBranch className="w-24 mx-auto mb-6 text-gold-light/50" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-balance font-[family-name:var(--font-display)] text-white-warm text-4xl sm:text-6xl font-bold mb-4"
        >
          Commander{" "}
          <span className="font-[family-name:var(--font-script)] text-gold-light font-normal">
            votre pizza
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-white-warm/80 text-lg sm:text-xl mb-10 max-w-xl mx-auto"
        >
          Livraison à domicile, à emporter ou en terrasse &mdash; appelez-nous et votre commande sera prête en 20 minutes.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5"
        >
          <a
            href={data.phoneHref}
            className="bg-red hover:bg-red-dark text-white-warm font-bold text-lg px-10 py-4 rounded-full transition-all duration-300 shadow-xl shadow-red/20 flex items-center gap-3 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {data.phone}
          </a>
          <a
            href={data.menuPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white-warm/30 hover:border-gold-light text-white-warm font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Voir le menu
          </a>
        </motion.div>
      </div>
    </section>
  );
}
