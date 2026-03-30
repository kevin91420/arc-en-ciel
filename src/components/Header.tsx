"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RESTAURANT } from "@/data/restaurant";
import { RainbowArc } from "./Decorations";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Menu", href: "#menu" },
    { label: "Galerie", href: "#galerie" },
    { label: "Avis", href: "#avis" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-cream/95 backdrop-blur-md shadow-lg shadow-brown/5 border-b border-terracotta/15"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="#" className="flex flex-col items-start group">
            <span
              className={`font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-500 ${
                scrolled ? "text-brown" : "text-white-warm"
              }`}
            >
              L&apos;Arc en Ciel
            </span>
            <RainbowArc className={`w-20 sm:w-24 -mt-1 transition-opacity duration-500 ${scrolled ? "opacity-80" : "opacity-50"}`} />
          </a>

          {/* Desktop Nav */}
          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`font-[family-name:var(--font-body)] text-sm font-medium tracking-wide uppercase transition-colors duration-300 hover:text-gold ${
                  scrolled ? "text-brown-light" : "text-white-warm/90"
                }`}
              >
                {link.label}
              </a>
            ))}
            <a
              href={RESTAURANT.orderUrl}
              className="bg-red hover:bg-red-dark text-white-warm font-bold text-sm px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105"
            >
              Commander
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-3 md:hidden">
            <a
              href={RESTAURANT.orderUrl}
              className="bg-red text-white-warm font-bold text-xs px-3.5 py-2 rounded-full"
            >
              Commander
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`p-2 transition-colors ${
                scrolled ? "text-brown" : "text-white-warm"
              }`}
              aria-label="Menu de navigation"
              aria-expanded={mobileOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            aria-label="Navigation principale"
            className="md:hidden bg-cream/98 backdrop-blur-lg border-t border-terracotta/20 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-brown font-medium py-2 text-lg font-[family-name:var(--font-display)]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={RESTAURANT.phoneHref}
                className="text-brown-light py-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {RESTAURANT.phone}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
