"use client";

/**
 * Layout commun aux 3 sous-pages stock :
 *   - /admin/stock          → Vue d'ensemble (alertes + stats consolidées)
 *   - /admin/stock/ingredients → CRUD ingrédients (le vrai stock)
 *   - /admin/stock/recettes    → Composition des plats
 *   - /admin/stock/items       → Stock Niveau 1 par plat (legacy/fallback)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: string }[] = [
  { href: "/admin/stock", label: "Vue d'ensemble", icon: "📊" },
  { href: "/admin/stock/ingredients", label: "Ingrédients", icon: "🥬" },
  { href: "/admin/stock/recettes", label: "Recettes", icon: "📖" },
  { href: "/admin/stock/items", label: "Plats (Niv. 1)", icon: "🍽" },
];

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="border-b border-brown/10 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
        <ul className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            /* exact match for hub, prefix for sub-routes */
            const active =
              t.href === "/admin/stock"
                ? pathname === "/admin/stock"
                : pathname?.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "text-brown-dark"
                      : "text-brown-light/70 hover:text-brown"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gold rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </div>
  );
}
