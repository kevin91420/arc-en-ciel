"use client";

import { motion } from "framer-motion";

export default function ParametresPlaceholderPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto text-center py-16"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-gold/15 text-gold flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mt-6">
        Bientôt
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-brown font-semibold">
        Paramètres
      </h1>
      <div className="section-divider mt-5" />
      <p className="mt-6 text-brown-light leading-relaxed">
        Gestion des utilisateurs, horaires d&apos;ouverture, capacité des
        tables, intégrations (Google My Business, TheFork)… Tous ces réglages
        seront disponibles ici très prochainement.
      </p>
    </motion.div>
  );
}
