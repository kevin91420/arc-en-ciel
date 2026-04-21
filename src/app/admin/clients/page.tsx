"use client";

/**
 * Clients — search, grid/table toggle, detail drawer with recent reservations.
 * We pull reservations on drawer open so the list isn't loaded up front.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Customer, Reservation } from "@/lib/db/types";
import { formatCents, formatFrenchDateTime } from "../_lib/format";

type View = "grid" | "table";

export default function ClientsPage() {
  const [all, setAll] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("grid");
  const [selected, setSelected] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Customer[] = await res.json();
      setAll(data);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [all, query]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Base clients
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Clients
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {all.length} fiches · {all.filter((c) => c.vip).length} VIP
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 md:w-80">
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Recherche
            </label>
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, email, téléphone, tag…"
                className="w-full pl-9 pr-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-light"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex bg-white-warm border border-terracotta/40 rounded-lg p-1">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${view === "grid" ? "bg-brown text-cream" : "text-brown-light hover:text-brown"}`}
            >
              Grille
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${view === "table" ? "bg-brown text-cream" : "text-brown-light hover:text-brown"}`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 bg-white-warm rounded-xl border border-terracotta/30 text-center text-brown-light">
          Chargement…
        </div>
      ) : error ? (
        <div className="p-6 bg-red/5 text-red-dark rounded-xl border border-red/30">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 bg-white-warm rounded-xl border border-terracotta/30 text-center text-brown-light italic">
          Aucun client trouvé.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              onClick={() => setSelected(c)}
              className="group relative bg-white-warm rounded-xl border border-terracotta/30 p-4 text-left hover:border-gold hover:shadow-md hover:-translate-y-0.5 transition"
            >
              {c.vip && (
                <span className="absolute top-3 right-3 text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-gold text-brown font-bold">
                  VIP
                </span>
              )}
              <div className="flex items-start gap-3">
                <Avatar name={c.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brown truncate">{c.name}</p>
                  <p className="text-xs text-brown-light truncate mt-0.5">
                    {c.email || "—"}
                  </p>
                  <p className="text-xs text-brown-light truncate font-mono">
                    {c.phone || "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
                    Visites
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold leading-none">
                    {c.visits_count}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
                    Total
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-lg text-gold font-semibold leading-none mt-1">
                    {formatCents(c.total_spent_cents)}
                  </p>
                </div>
              </div>
              {c.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-terracotta/30 text-brown"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="bg-white-warm rounded-xl border border-terracotta/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-xs uppercase tracking-wider text-brown-light">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nom</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                <th className="px-4 py-3 text-center font-semibold">Visites</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-left font-semibold">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terracotta/25">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer hover:bg-cream/50 transition"
                >
                  <td className="px-4 py-3 font-semibold text-brown flex items-center gap-2">
                    {c.vip && (
                      <span className="text-[9px] tracking-wider px-1 py-0.5 rounded bg-gold text-brown font-bold">
                        VIP
                      </span>
                    )}
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs truncate max-w-[220px]">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-brown-light font-mono text-xs">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-brown">
                    {c.visits_count}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gold">
                    {formatCents(c.total_spent_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-terracotta/30 text-brown"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <CustomerDrawer
            key={selected.id}
            customer={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── sub-components ──────────────────────────── */

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brown to-brown-light text-cream flex items-center justify-center font-[family-name:var(--font-display)] text-base font-semibold shrink-0">
      {initials}
    </div>
  );
}

function CustomerDrawer({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [loadingRes, setLoadingRes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The reservations list API doesn't filter by customer id yet, so we
        // fetch and filter client-side. Fine at demo scale.
        const res = await fetch("/api/reservations", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const all: Reservation[] = await res.json();
        if (cancelled) return;
        const match = all
          .filter(
            (r) =>
              r.customer_id === customer.id ||
              (customer.phone &&
                r.customer_phone.replace(/\s/g, "") ===
                  customer.phone.replace(/\s/g, "")) ||
              (customer.email &&
                r.customer_email?.toLowerCase() ===
                  customer.email.toLowerCase())
          )
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setReservations(match);
      } catch {
        if (!cancelled) setReservations([]);
      } finally {
        if (!cancelled) setLoadingRes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, customer.phone, customer.email]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-brown/30 backdrop-blur-sm z-40"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[28rem] bg-white-warm border-l border-terracotta/30 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white-warm border-b border-terracotta/30 px-5 py-4 flex items-start gap-3">
          <Avatar name={customer.name} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
              Client {customer.vip && "· VIP"}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold truncate">
              {customer.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-brown-light hover:text-brown hover:bg-cream transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Visites" value={customer.visits_count} />
            <Metric label="Total dépensé" value={formatCents(customer.total_spent_cents)} />
            <Metric
              label="Dernière"
              value={
                customer.last_visit
                  ? new Date(customer.last_visit).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"
              }
            />
          </div>

          <div className="space-y-1 text-sm">
            {customer.email && (
              <p>
                <span className="text-brown-light text-xs uppercase tracking-wider mr-2">
                  Email
                </span>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-gold underline break-all"
                >
                  {customer.email}
                </a>
              </p>
            )}
            {customer.phone && (
              <p>
                <span className="text-brown-light text-xs uppercase tracking-wider mr-2">
                  Téléphone
                </span>
                <a href={`tel:${customer.phone}`} className="text-gold underline">
                  {customer.phone}
                </a>
              </p>
            )}
          </div>

          {customer.tags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-1 rounded-full bg-terracotta/30 text-brown"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(customer.allergies?.length ?? 0) > 0 && (
            <div className="bg-red/5 border border-red/30 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-red font-semibold">
                Allergies
              </p>
              <p className="text-sm text-brown mt-1">
                {customer.allergies?.join(", ")}
              </p>
            </div>
          )}

          {customer.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
                Notes
              </p>
              <p className="text-sm text-brown bg-cream rounded-lg p-3 border border-terracotta/30">
                {customer.notes}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Réservations récentes
            </p>
            {loadingRes ? (
              <p className="text-sm text-brown-light italic">Chargement…</p>
            ) : !reservations || reservations.length === 0 ? (
              <p className="text-sm text-brown-light italic">Aucune réservation enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {reservations.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="bg-cream border border-terracotta/30 rounded-lg px-3 py-2 text-sm flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-brown truncate">
                        {formatFrenchDateTime(r.date, r.time)}
                      </p>
                      <p className="text-xs text-brown-light">
                        {r.guests} couvert{r.guests > 1 ? "s" : ""} · {r.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-cream rounded-lg border border-terracotta/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold leading-none mt-1">
        {value}
      </p>
    </div>
  );
}
