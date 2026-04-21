"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function MenuPlaceholderPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto text-center py-16"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 text-gold flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
          <path
            d="M5 4h11l3 3v13H5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 9h8M8 13h8M8 17h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mt-6">
        Prochainement
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-brown font-semibold">
        Édition du menu
      </h1>
      <div className="section-divider mt-5" />
      <p className="mt-6 text-brown-light leading-relaxed">
        La gestion des plats, catégories et prix arrive très prochainement. En
        attendant, le menu continue d&apos;être édité depuis Sanity Studio.
      </p>
      <Link
        href="/studio"
        className="inline-block mt-6 text-sm font-semibold text-brown underline underline-offset-4 hover:text-gold transition"
      >
        Ouvrir Sanity Studio →
      </Link>
    </motion.div>
  );
}
