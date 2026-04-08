"use client";

import { useState, useEffect, useCallback } from "react";

type Consent = "accepted" | "refused" | null;

function PizzaSlice({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pizza slice shape */}
      <path
        d="M32 4 L58 56 Q45 62 32 62 Q19 62 6 56 Z"
        fill="#F4A940"
        stroke="#D4882E"
        strokeWidth="1.5"
      />
      {/* Crust */}
      <path
        d="M6 56 Q19 62 32 62 Q45 62 58 56"
        fill="#D4882E"
        stroke="#B8721F"
        strokeWidth="1"
      />
      {/* Sauce */}
      <path
        d="M32 10 L54 54 Q42 58 32 58 Q22 58 10 54 Z"
        fill="#C0392B"
        opacity="0.6"
      />
      {/* Cheese bubbles */}
      <circle cx="28" cy="30" r="4" fill="#F5D76E" opacity="0.9" />
      <circle cx="38" cy="38" r="3.5" fill="#F5D76E" opacity="0.9" />
      <circle cx="25" cy="44" r="3" fill="#F5D76E" opacity="0.9" />
      <circle cx="35" cy="50" r="2.5" fill="#F5D76E" opacity="0.8" />
      {/* Pepperoni */}
      <circle cx="30" cy="22" r="3" fill="#922B21" />
      <circle cx="22" cy="36" r="2.5" fill="#922B21" />
      <circle cx="40" cy="46" r="2.8" fill="#922B21" />
      <circle cx="32" cy="42" r="2" fill="#922B21" />
      {/* Basil leaves */}
      <ellipse
        cx="36"
        cy="28"
        rx="3"
        ry="1.5"
        fill="#27AE60"
        transform="rotate(-30 36 28)"
      />
      <ellipse
        cx="28"
        cy="50"
        rx="2.5"
        ry="1.2"
        fill="#27AE60"
        transform="rotate(20 28 50)"
      />
    </svg>
  );
}

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent") as Consent;
    if (stored) {
      setConsent(stored);
      if (stored === "accepted") loadAnalytics();
    } else {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const loadAnalytics = useCallback(() => {
    if (document.getElementById("ga-script")) return;
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-KB88DS6GCC";
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", "G-KB88DS6GCC");
  }, []);

  const handleChoice = useCallback(
    (choice: "accepted" | "refused") => {
      setExiting(true);
      setTimeout(() => {
        setConsent(choice);
        setVisible(false);
        localStorage.setItem("cookie-consent", choice);
        if (choice === "accepted") loadAnalytics();
      }, 500);
    },
    [loadAnalytics]
  );

  if (consent || !visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 transition-all duration-500 ${
        exiting
          ? "translate-y-full opacity-0"
          : "translate-y-0 opacity-100 animate-slide-up"
      }`}
    >
      <div className="max-w-2xl mx-auto bg-cream border border-terracotta rounded-2xl shadow-2xl shadow-brown/20 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-red via-gold to-red" />

        <div className="p-5 md:p-6">
          <div className="flex gap-4 items-start">
            {/* Pizza icon */}
            <div className="flex-shrink-0 w-14 h-14 relative">
              <div className="absolute inset-0 animate-slow-spin">
                <PizzaSlice className="w-14 h-14 drop-shadow-md" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-display font-bold text-brown text-lg leading-tight mb-1">
                Nos cookies sont faits maison !
              </h3>
              <p className="text-sm text-brown-light leading-relaxed mb-4">
                Comme nos pizzas, on met que le necessaire : des cookies pour
                analyser la frequentation et ameliorer votre experience. Pas de
                garniture superflue, promis.{" "}
                <a
                  href="/mentions-legales"
                  className="text-red hover:text-red-dark underline underline-offset-2 transition-colors"
                >
                  En savoir plus
                </a>
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleChoice("accepted")}
                  className="px-5 py-2.5 bg-red hover:bg-red-dark text-white font-bold text-sm rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-red/20"
                >
                  Miam, j&apos;accepte !
                </button>
                <button
                  onClick={() => handleChoice("refused")}
                  className="px-5 py-2.5 bg-cream-dark hover:bg-terracotta text-brown-light hover:text-brown font-medium text-sm rounded-xl border border-terracotta transition-all active:scale-95 cursor-pointer"
                >
                  Non merci
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}
