"use client";

/**
 * Admin shell: sidebar on desktop, bottom tab bar on mobile, header with
 * restaurant name + today's date + logout. Fetches /api/admin/auth on mount
 * to display a "DEMO" badge when the default password is in use.
 *
 * The /admin/login route renders without the shell (see conditional below).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { formatFrenchDate, todayISO } from "./_lib/format";

/** Returns today's formatted date on the client, "" during SSR (avoids hydration mismatch). */
function useTodayLabel(): string {
  return useSyncExternalStore(
    () => () => {},
    () => formatFrenchDate(todayISO()),
    () => ""
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  soon?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Tableau de bord",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <path d="M3 12 12 3l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/reservations",
    label: "Réservations",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/clients",
    label: "Clients",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/demandes",
    label: "Demandes table",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <path d="M12 3a7 7 0 0 1 7 7v3l1.5 3h-17L5 13v-3a7 7 0 0 1 7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 19a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/integrations",
    label: "Intégrations",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/menu",
    label: "Menu",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/parametres",
    label: "Paramètres",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDemo, setIsDemo] = useState(false);
  const today = useTodayLabel();

  // Login page renders bare — no shell.
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    let cancelled = false;
    fetch("/api/admin/auth", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.demo) setIsDemo(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoginPage]);

  async function logout() {
    await fetch("/api/admin/auth", {
      method: "DELETE",
      credentials: "include",
    });
    router.push("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream-dark/40 bg-noise flex">
      {/* ─── Sidebar (desktop) ─────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 sticky top-0 h-screen bg-brown text-cream border-r border-brown-light/30">
        <div className="px-5 pt-6 pb-5 border-b border-cream/10">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-xl leading-none">
            L&apos;Arc en Ciel
          </p>
          <p className="font-[family-name:var(--font-display)] text-cream text-xl font-semibold mt-1">
            Admin
          </p>
          {isDemo && (
            <span className="inline-block mt-2 text-[10px] tracking-[0.18em] px-2 py-0.5 rounded bg-gold/20 text-gold-light font-bold">
              MODE DEMO
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition relative",
                  active
                    ? "bg-cream text-brown font-semibold shadow-inner"
                    : "text-cream/75 hover:text-gold-light hover:bg-brown-light/40",
                ].join(" ")}
              >
                <span
                  className={
                    active ? "text-gold" : "text-cream/60 group-hover:text-gold-light"
                  }
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.soon && (
                  <span className="ml-auto text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-cream/10 text-cream/60">
                    BIENTÔT
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-cream/10 space-y-1 text-sm">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-cream/70 hover:text-gold-light hover:bg-brown-light/40 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <path d="M14 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Site public
          </Link>
          <Link
            href="/m/qr"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-cream/70 hover:text-gold-light hover:bg-brown-light/40 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M14 14h3v3h-3zM20 14v3M14 20h7" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Générateur QR
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-dark/80 hover:text-cream hover:bg-red/80 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <path d="M15 4h4v16h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 16l-4-4 4-4M6 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Main column ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white-warm/90 backdrop-blur-sm border-b border-terracotta/30 px-4 md:px-8 py-3 flex items-center gap-4">
          <div className="md:hidden">
            <p className="font-[family-name:var(--font-script)] text-gold text-lg leading-none">
              L&apos;Arc en Ciel
            </p>
            <p className="text-xs text-brown-light">Admin</p>
          </div>
          <div className="hidden md:block">
            <h1 className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold leading-tight">
              L&apos;Arc en Ciel{" "}
              <span className="text-gold font-normal">— Admin</span>
            </h1>
            <p className="text-xs text-brown-light capitalize mt-0.5">{today}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isDemo && (
              <span className="hidden sm:inline-block text-[10px] tracking-[0.18em] px-2 py-1 rounded bg-gold/15 text-gold-dark font-bold" style={{ color: "#8a6e22" }}>
                DEMO
              </span>
            )}
            <button
              onClick={logout}
              className="md:hidden p-2 rounded-lg text-brown hover:text-red transition"
              aria-label="Déconnexion"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M15 4h4v16h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 16l-4-4 4-4M6 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 min-w-0"
        >
          {children}
        </motion.main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-brown text-cream border-t border-brown-light/40 flex justify-around px-1 py-2">
          {NAV.filter((n) => !n.soon)
            .slice(0, 4)
            .map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] min-w-[64px]",
                    active
                      ? "text-gold-light"
                      : "text-cream/70 hover:text-cream",
                  ].join(" ")}
                >
                  {item.icon}
                  <span className="tracking-wide">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
        </nav>
      </div>
    </div>
  );
}
