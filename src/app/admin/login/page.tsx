"use client";

/**
 * Admin login — minimal, brand-styled password gate.
 *
 * Flow: submit password to POST /api/admin/auth. On 200 the server sets an
 * httpOnly cookie; we then hard-navigate to the originally requested path
 * (preserved in ?from=) or /admin.
 */

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function LoginForm() {
  const params = useSearchParams();
  const from = params.get("from") || "/admin";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Connexion impossible.");
        setLoading(false);
        return;
      }
      // Full navigation so the proxy re-runs and the cookie is attached.
      window.location.href = from;
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-xs uppercase tracking-[0.18em] text-brown-light mb-2 font-semibold"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-white-warm border border-terracotta/50 rounded-lg text-brown placeholder:text-brown-light/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red bg-red/5 border border-red/20 rounded px-3 py-2"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full py-3 bg-brown text-cream rounded-lg font-semibold tracking-wide hover:bg-brown-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            Connexion…
          </>
        ) : (
          "Entrer"
        )}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream bg-noise px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <p className="font-[family-name:var(--font-script)] text-gold text-2xl leading-none">
            L&apos;Arc en Ciel
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-brown font-semibold">
            Espace Admin
          </h1>
          <div className="section-divider mt-4" />
          <p className="mt-4 text-sm text-brown-light">
            Accès réservé à l&apos;équipe du restaurant.
          </p>
        </div>

        <div className="bg-white-warm rounded-2xl shadow-xl shadow-brown/10 p-8 border border-terracotta/30">
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 pt-6 border-t border-terracotta/30 text-xs text-brown-light/80">
            <p className="flex items-start gap-2">
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold tracking-wider">
                DEMO
              </span>
              <span>
                Mot de passe par défaut : <code className="font-mono bg-cream-dark px-1.5 py-0.5 rounded text-brown">admin2026</code>
              </span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-brown-light">
          <Link href="/" className="underline hover:text-gold transition">
            ← Retour au site public
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
