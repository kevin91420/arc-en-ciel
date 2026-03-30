"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REVIEWS } from "@/data/restaurant";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Note : ${count} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < count ? "text-gold" : "text-terracotta/30"}`}
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

export default function Reviews() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % REVIEWS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, paused]);

  return (
    <section id="avis" className="py-20 sm:py-28 bg-brown bg-noise relative overflow-hidden">
      {/* Subtle noise overlay for dark section */}
      <div className="absolute inset-0 bg-noise opacity-30" aria-hidden="true" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
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
          className="text-center font-[family-name:var(--font-display)] text-white-warm text-3xl sm:text-5xl font-bold mb-14"
        >
          Avis Clients
        </motion.h2>

        {/* Carousel */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="bg-white-warm/10 backdrop-blur-sm border border-white-warm/10 rounded-2xl p-6 sm:p-10 md:p-12 text-center"
            >
              <div className="flex justify-center mb-5">
                <Stars count={REVIEWS[current].rating} />
              </div>
              <blockquote className="font-[family-name:var(--font-display)] text-white-warm text-lg sm:text-xl italic leading-relaxed mb-6 max-w-2xl mx-auto">
                &ldquo;{REVIEWS[current].text}&rdquo;
              </blockquote>
              <p className="font-[family-name:var(--font-script)] text-gold-light text-xl mb-1">
                {REVIEWS[current].name}
              </p>
              <p className="text-white-warm/60 text-sm">
                {REVIEWS[current].date}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-400 ${
                i === current
                  ? "bg-gold-light w-7"
                  : "bg-white-warm/30 hover:bg-white-warm/50"
              }`}
              aria-label={`Avis ${i + 1} sur ${REVIEWS.length}`}
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
