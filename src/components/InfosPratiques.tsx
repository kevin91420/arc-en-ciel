"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useId } from "react";
import { RESTAURANT } from "@/data/restaurant";

const MapboxMap = dynamic(() => import("./MapboxMap"), { ssr: false });

function DotPattern({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

interface InfosPratiquesProps {
  restaurant?: any;
}

export default function InfosPratiques({ restaurant }: InfosPratiquesProps = {}) {
  const data = restaurant || RESTAURANT;
  return (
    <section id="contact" className="relative py-24 sm:py-32 bg-cream overflow-hidden">
      {/* Dot pattern background */}
      <DotPattern className="text-brown/[0.08]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center font-[family-name:var(--font-script)] text-gold text-2xl mb-2"
        >
          Venez nous voir
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.1 }}
          className="text-center text-balance font-[family-name:var(--font-display)] text-brown text-3xl sm:text-5xl font-bold mb-14"
        >
          Infos Pratiques
        </motion.h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Horaires */}
            <div className="bg-white-warm rounded-2xl p-6 sm:p-8 border border-brown/[0.06]">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-brown mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Horaires d&apos;ouverture
              </h3>
              <div className="space-y-2">
                {data.hours.map((h: any) => (
                  <div
                    key={h.days}
                    className="flex justify-between items-center py-1.5 border-b border-terracotta/15 last:border-0"
                  >
                    <span className="text-brown font-medium">{h.days}</span>
                    <span
                      className={`text-sm ${
                        h.time === "Fermé"
                          ? "text-red font-semibold"
                          : "text-brown-light"
                      }`}
                    >
                      {h.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white-warm rounded-2xl p-6 sm:p-8 border border-brown/[0.06]">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-brown mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Nous trouver
              </h3>
              <p className="text-brown-light mb-3">{data.address}</p>
              <a
                href={data.phoneHref}
                className="inline-flex items-center gap-2 text-red font-semibold hover:text-red-dark transition-colors text-lg mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {data.phone}
              </a>
              <br />
              <a
                href={`mailto:${data.email}`}
                className="inline-flex items-center gap-2 text-brown-light hover:text-red transition-colors text-sm mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {data.email}
              </a>
              <div className="flex flex-wrap gap-2 mt-3">
                {data.payment.map((p: any) => (
                  <span
                    key={p}
                    className="bg-white-warm border border-terracotta/20 text-brown-light text-xs font-medium px-3 py-1.5 rounded-full"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl overflow-hidden shadow-lg shadow-brown/10 h-[400px] lg:h-full min-h-[400px]"
          >
            <MapboxMap />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
