"use client";

/**
 * Staff (POS) shell — horizontal top bar only (tablets use landscape; no sidebar).
 * The /staff/login route renders without the shell.
 *
 * The layout fetches GET /api/staff/auth on mount so we can show the current
 * server's name + color dot, and offers a logout button.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRestaurantBranding } from "@/lib/hooks/useRestaurantBranding";

type StaffInfo = {
  id: string;
  name: string;
  role: "server" | "chef" | "manager";
  color: string;
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [clock, setClock] = useState("");
  const branding = useRestaurantBranding();

  const isLoginPage = pathname === "/staff/login";

  /* Pull the current staff from the cookie-scoped endpoint. */
  useEffect(() => {
    if (isLoginPage) return;
    let cancelled = false;
    fetch("/api/staff/auth", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.id) setStaff(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoginPage]);

  /* Clock — pure vanity, but a service tablet without a clock looks unfinished. */
  useEffect(() => {
    if (isLoginPage) return;
    function tick() {
      const d = new Date();
      setClock(
        d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      );
    }
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [isLoginPage]);

  async function logout() {
    await fetch("/api/staff/auth", {
      method: "DELETE",
      credentials: "include",
    });
    router.push("/staff/login");
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream bg-noise flex flex-col">
      {/* ─── Top bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-brown text-cream border-b border-brown-light/40 shadow-[0_1px_0_rgba(0,0,0,0.35)]">
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-4">
          <Link
            href="/staff/tables"
            className="flex items-center gap-3 group"
            aria-label="Plan de salle"
          >
            <span className="font-[family-name:var(--font-script)] text-gold-light text-xl leading-none group-hover:text-gold transition">
              {branding.name}
            </span>
            <span className="hidden sm:inline-block text-[10px] tracking-[0.25em] px-2 py-0.5 rounded bg-gold/15 text-gold-light font-bold">
              POS SERVEUR
            </span>
          </Link>

          {/* Quick-nav tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <StaffTab href="/staff/tables" active={pathname === "/staff/tables"}>
              Plan de salle
            </StaffTab>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span
              className="hidden sm:inline-block text-sm text-cream/70 tabular-nums"
              aria-label="Heure actuelle"
            >
              {clock}
            </span>

            {staff && (
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-cream/20"
                  style={{ backgroundColor: staff.color }}
                  aria-hidden
                />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-cream">
                    {staff.name}
                  </p>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-cream/50">
                    {staff.role === "chef"
                      ? "Chef"
                      : staff.role === "manager"
                        ? "Manager"
                        : "Serveur"}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="p-2.5 rounded-lg text-cream/70 hover:text-cream hover:bg-red/70 transition"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M15 4h4v16h-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 16l-4-4 4-4M6 12h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main ────────────────────────────────────── */}
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex-1 min-w-0"
      >
        {children}
      </motion.main>
    </div>
  );
}

function StaffTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "px-3 py-1.5 rounded-md text-sm font-medium tracking-wide transition",
        active
          ? "bg-cream text-brown shadow-inner"
          : "text-cream/70 hover:text-gold-light hover:bg-brown-light/50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
