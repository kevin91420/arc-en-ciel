"use client";

/**
 * /kitchen/stock — Gestion de la liste des 86.
 *
 * Un chef marque un plat « en rupture » ici ; l'info se propage :
 *   - /carte (page publique)       → item grisé + pastille « Épuisé »
 *   - /m/carte (QR menu)           → item grisé, CTA « Ajouter » désactivé
 *   - POS OrderEditor (staff)      → tuile grisée, ajout bloqué
 *   - Tickets cuisine              → n'arrive pas (le serveur a été stoppé)
 *
 * Les lignes déjà envoyées en cuisine ne sont PAS annulées — la rupture
 * concerne seulement les nouveaux ajouts.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CARTE } from "@/data/carte";

type StockState =
  | { kind: "loading" }
  | { kind: "ready"; list: Set<string> }
  | { kind: "error"; message: string };

export default function KitchenStockPage() {
  const [state, setState] = useState<StockState>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/stock", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { eighty_six_list: string[] };
      setState({
        kind: "ready",
        list: new Set(data.eighty_six_list ?? []),
      });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const toggle = useCallback(async (itemId: string, currentlyOut: boolean) => {
    setBusyId(itemId);
    /* Optimistic flip */
    setState((prev) =>
      prev.kind === "ready"
        ? {
            ...prev,
            list: (() => {
              const next = new Set(prev.list);
              if (currentlyOut) next.delete(itemId);
              else next.add(itemId);
              return next;
            })(),
          }
        : prev
    );
    try {
      await fetch("/api/staff/stock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          item_id: itemId,
          out_of_stock: !currentlyOut,
        }),
      });
    } catch {
      /* Snapshot inconsistent → resync. */
      fetchList();
    } finally {
      setBusyId(null);
    }
  }, [fetchList]);

  const outCount = state.kind === "ready" ? state.list.size : 0;

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CARTE;
    return CARTE.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  async function clearAll() {
    if (state.kind !== "ready" || state.list.size === 0) return;
    const confirmed = window.confirm(
      `Rétablir tous les ${state.list.size} plat${state.list.size > 1 ? "s" : ""} en rupture ?`
    );
    if (!confirmed) return;
    /* Fire-and-forget per item; refresh at the end. */
    await Promise.all(
      [...state.list].map((id) =>
        fetch("/api/staff/stock", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ item_id: id, out_of_stock: false }),
        }).catch(() => null)
      )
    );
    fetchList();
  }

  return (
    <div
      className="min-h-screen text-cream"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(184,146,47,0.08), transparent 60%), #1a0f0a",
      }}
    >
      <header className="px-6 md:px-10 pt-10 pb-6 max-w-5xl mx-auto">
        <Link
          href="/kitchen"
          className="inline-flex items-center gap-1.5 text-xs text-cream/50 hover:text-gold-light transition font-semibold uppercase tracking-[0.2em] mb-4"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour cuisine
        </Link>
        <p className="text-[11px] uppercase tracking-[0.3em] text-cream/40 font-bold mb-2">
          Gestion du stock · 86 list
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-cream leading-[1.02]">
          Ruptures du soir
        </h1>
        <p className="mt-3 text-cream/70 max-w-2xl text-sm md:text-base">
          Marque un plat épuisé ici. Il apparaîtra grisé partout — site public,
          menu QR, POS serveur. Les commandes déjà envoyées en cuisine ne sont
          pas affectées.
        </p>
      </header>

      <section className="px-6 md:px-10 max-w-5xl mx-auto flex flex-wrap gap-3 items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red/20 text-red-light border border-red/30 text-sm font-bold">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {outCount} {outCount > 1 ? "plats" : "plat"} en rupture
        </div>
        {outCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-cream/60 hover:text-gold-light font-semibold px-3 py-2 rounded-full hover:bg-cream/5 transition"
          >
            Tout rétablir
          </button>
        )}
        <div className="ml-auto">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un plat…"
              className="w-64 max-w-full bg-cream/5 border border-cream/15 rounded-full px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold"
            />
          </label>
        </div>
      </section>

      <main className="px-6 md:px-10 pb-24 pt-6 max-w-5xl mx-auto space-y-8">
        {state.kind === "loading" && (
          <p className="text-cream/50 text-sm">Chargement…</p>
        )}
        {state.kind === "error" && (
          <div className="rounded-xl border border-red/40 bg-red/10 p-4 text-red-light text-sm">
            {state.message}
          </div>
        )}
        {state.kind === "ready" &&
          filteredCategories.map((cat) => (
            <section key={cat.id}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-2xl" aria-hidden>
                  {cat.icon}
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-cream">
                  {cat.title}
                </h2>
                <span className="text-xs text-cream/40 uppercase tracking-wider">
                  {cat.items.length} plats
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence initial={false}>
                  {cat.items.map((item) => {
                    const out = state.list.has(item.id);
                    const isBusy = busyId === item.id;
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(item.id, out)}
                          disabled={isBusy}
                          className={[
                            "group w-full text-left rounded-2xl border p-4 transition relative",
                            out
                              ? "bg-red/15 border-red/50 text-cream/80"
                              : "bg-cream/5 border-cream/15 hover:border-gold text-cream",
                            isBusy ? "opacity-60" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-[family-name:var(--font-display)] font-bold text-base leading-tight min-w-0">
                              {item.name}
                            </p>
                            <span
                              className={[
                                "inline-flex items-center shrink-0 h-6 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                out
                                  ? "bg-red text-cream"
                                  : "bg-cream/10 text-cream/50 group-hover:bg-gold group-hover:text-brown",
                              ].join(" ")}
                            >
                              {out ? "86 — Épuisé" : "En stock"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-cream/60 line-clamp-2">
                            {item.description}
                          </p>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
      </main>
    </div>
  );
}
