"use client";

import { motion } from "framer-motion";
import { REVIEWS, RESTAURANT } from "@/data/restaurant";
import Marquee from "./Marquee";

function Stars({ count, size = "w-4 h-4" }: { count: number; size?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Note : ${count} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`${size} ${i < count ? "text-gold-light" : "text-white-warm/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface ReviewsProps {
  reviews?: any[];
}

export default function Reviews({ reviews }: ReviewsProps = {}) {
  const reviewsList = reviews || REVIEWS;
  return (
    <section id="avis" className="relative bg-brown overflow-hidden">
      {/* Marquee top — solid color + low opacity container to stay vectoriel/crisp */}
      <div className="relative py-6 border-b border-white-warm/5">
        <Marquee text="Feu de Bois" className="text-white-warm opacity-[0.04]" />
      </div>

      <div className="relative py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center font-[family-name:var(--font-script)] text-gold-light text-2xl mb-2"
        >
          Ils en parlent
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.1 }}
          className="text-center text-balance font-[family-name:var(--font-display)] text-white-warm text-3xl sm:text-5xl font-bold mb-4"
        >
          Avis Clients
        </motion.h2>

        {/* Google rating badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-3 mb-14"
        >
          <div className="flex items-center gap-3 bg-white-warm/[0.08] backdrop-blur-sm border border-white-warm/[0.1] rounded-full px-6 py-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="flex items-center gap-2">
              <span className="text-white-warm font-bold text-xl">4,4</span>
              <Stars count={4} size="w-4 h-4" />
              <span className="text-white-warm/80 text-sm">(430 avis)</span>
            </div>
          </div>
        </motion.div>

        {/* Reviews grid — all 5 visible like V3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviewsList.map((review, i) => (
            <motion.article
              key={review.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              className={`bg-white-warm/[0.08] backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white-warm/[0.1] hover:border-gold/20 transition-all duration-500 ${
                i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : ""
              }`}
            >
              <Stars count={review.rating} />
              <blockquote className={`text-white-warm leading-relaxed mt-4 mb-6 ${i === 0 ? "text-lg" : "text-sm"}`}>
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <footer className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-terracotta-deep/30 flex items-center justify-center">
                  <span className="text-white-warm font-bold text-sm">
                    {review.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <cite className="text-white-warm font-semibold text-sm not-italic">{review.name}</cite>
                  <div className="flex items-center gap-2">
                    <p className="text-white-warm/80 text-xs">{review.date}</p>
                    <span className="text-white-warm/40 text-xs">· Google</span>
                  </div>
                </div>
              </footer>
            </motion.article>
          ))}
        </div>

        {/* Laisser un avis CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mt-12"
        >
          <a
            href={RESTAURANT.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gold/20 hover:bg-gold/30 text-gold-light font-semibold px-6 py-3 rounded-full border border-gold/30 hover:border-gold/50 transition-all duration-300 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            Laisser un avis sur Google
          </a>
          <p className="text-white-warm/50 text-xs mt-3">
            Vos avis nous aident a nous ameliorer !
          </p>
        </motion.div>
      </div>

      {/* Marquee bottom — solid color + low opacity */}
      <div className="relative py-6 border-t border-white-warm/5">
        <Marquee text="Arc en Ciel" className="text-white-warm opacity-[0.04]" />
      </div>
    </section>
  );
}
