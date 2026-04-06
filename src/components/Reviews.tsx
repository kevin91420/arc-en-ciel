"use client";

import { motion } from "framer-motion";
import { REVIEWS } from "@/data/restaurant";
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
          className="text-center font-[family-name:var(--font-display)] text-white-warm text-3xl sm:text-5xl font-bold mb-4"
        >
          Avis Clients
        </motion.h2>

        {/* Google rating */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-14"
        >
          <Stars count={5} size="w-5 h-5" />
          <span className="text-white-warm/80 text-sm font-medium ml-1">4.8/5 sur Google</span>
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
                  <p className="text-white-warm/60 text-xs">{review.date}</p>
                </div>
              </footer>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Marquee bottom — solid color + low opacity */}
      <div className="relative py-6 border-t border-white-warm/5">
        <Marquee text="Arc en Ciel" className="text-white-warm opacity-[0.04]" />
      </div>
    </section>
  );
}
