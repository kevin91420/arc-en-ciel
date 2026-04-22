"use client";

/**
 * /admin/leads — Pipeline commercial GOURMET PACK.
 *
 * - Liste triée par recency avec auto-refresh toutes les 15s.
 * - Search (restaurant, contact, email), filtre par statut.
 * - Drawer détail : changer statut, éditer notes, fixer next_followup.
 * - Stats par statut en haut (new / contacted / qualified / won / lost).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PackLead, LeadStatus } from "@/lib/db/leads-types";
import { formatFrenchDateTime, relativeFr } from "../_lib/format";

const STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  won: "Gagné",
  lost: "Perdu",
};

/* Tailwind utility classes per status (bg + text).
   new = gold, contacted = blue-400, qualified = purple-500,
   won = green-500, lost = gray-400 */
const STATUS_PILL: Record<LeadStatus, string> = {
  new: "bg-gold/15 text-gold",
  contacted: "bg-blue-400/15 text-blue-500",
  qualified: "bg-purple-500/15 text-purple-600",
  won: "bg-green-500/15 text-green-600",
  lost: "bg-gray-400/15 text-gray-500",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-gold",
  contacted: "bg-blue-400",
  qualified: "bg-purple-500",
  won: "bg-green-500",
  lost: "bg-gray-400",
};

const STATUS_STAT_ACCENT: Record<
  LeadStatus,
  { border: string; text: string; dot: string }
> = {
  new: { border: "border-gold/50", text: "text-gold", dot: "bg-gold" },
  contacted: {
    border: "border-blue-400/50",
    text: "text-blue-500",
    dot: "bg-blue-400",
  },
  qualified: {
    border: "border-purple-500/50",
    text: "text-purple-600",
    dot: "bg-purple-500",
  },
  won: {
    border: "border-green-500/50",
    text: "text-green-600",
    dot: "bg-green-500",
  },
  lost: {
    border: "border-gray-400/50",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
};

export default function LeadsPage() {
  const [items, setItems] = useState<PackLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const initialLoadRef = useRef(true);

  const load = useCallback(async () => {
    if (initialLoadRef.current) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PackLead[] = await res.json();
      setItems(data);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  async function patchLead(
    id: string,
    patch: Partial<PackLead>
  ): Promise<PackLead | null> {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        cache: "no-store",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const updated: PackLead = await res.json();
      setItems((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
      return null;
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };
    for (const l of items) c[l.status] += 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter((l) => {
        return (
          l.restaurant_name.toLowerCase().includes(q) ||
          l.contact_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [items, search, statusFilter]);

  const selected = useMemo(
    () => items.find((l) => l.id === selectedId) || null,
    [items, selectedId]
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Pipeline commercial
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Leads <span className="text-gold font-normal">GOURMET PACK</span>
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {items.length} lead{items.length > 1 ? "s" : ""} au total · mise
            à jour auto toutes les 15s
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Recherche
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Restaurant, contact, email…"
              className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown placeholder-brown-light/50 focus:outline-none focus:ring-2 focus:ring-gold min-w-[16rem]"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as LeadStatus | "all")
              }
              className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="all">Tous</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => load()}
            className="px-3 py-2 bg-brown text-cream rounded-lg text-sm font-semibold hover:bg-brown-light transition"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_ORDER.map((s) => {
          const accent = STATUS_STAT_ACCENT[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "all" : s)}
              className={[
                "text-left bg-white-warm rounded-xl border-2 px-4 py-3 transition",
                active
                  ? `${accent.border} shadow-sm`
                  : "border-terracotta/30 hover:border-terracotta/60",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${accent.dot}`}
                  aria-hidden
                />
                <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
                  {STATUS_LABELS[s]}
                </p>
              </div>
              <p
                className={`font-[family-name:var(--font-display)] text-3xl ${accent.text} font-semibold leading-none mt-2`}
              >
                {counts[s]}
              </p>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white-warm rounded-xl border border-terracotta/30 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-brown-light text-sm">
            Chargement…
          </div>
        ) : error ? (
          <div className="p-6 bg-red/5 text-red-dark text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState hasItems={items.length > 0} />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-cream/60 text-xs uppercase tracking-wider text-brown-light">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Restaurant
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terracotta/25">
                {filtered.map((l, i) => (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.02 }}
                    onClick={() => setSelectedId(l.id)}
                    className="cursor-pointer hover:bg-cream/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-[family-name:var(--font-display)] font-semibold text-brown text-base">
                        {l.restaurant_name}
                      </div>
                      {l.next_followup && (
                        <div className="text-[10px] tracking-wider uppercase text-gold font-semibold mt-0.5">
                          Relance {l.next_followup}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brown">
                      {l.contact_name}
                      {l.phone && (
                        <div className="text-xs text-brown-light font-mono mt-0.5">
                          {l.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brown-light break-all max-w-[18rem]">
                      {l.email}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brown-light">
                      {relativeFr(l.created_at)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-terracotta/25">
              {filtered.map((l) => (
                <li
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className="p-4 active:bg-cream/60 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-brown truncate">
                        {l.restaurant_name}
                      </p>
                      <p className="text-sm text-brown mt-0.5 truncate">
                        {l.contact_name}
                      </p>
                      <p className="text-xs text-brown-light break-all">
                        {l.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusPill status={l.status} />
                      <span className="text-[10px] text-brown-light">
                        {relativeFr(l.created_at)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <Drawer
            key={selected.id}
            lead={selected}
            disabled={updatingId === selected.id}
            onClose={() => setSelectedId(null)}
            onUpdate={(patch) => patchLead(selected.id, patch)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ sub-components ═════════════════════════════════════ */

function EmptyState({ hasItems }: { hasItems: boolean }) {
  if (hasItems) {
    return (
      <div className="p-10 text-center text-brown-light text-sm italic">
        Aucun lead ne correspond à ces filtres.
      </div>
    );
  }
  return (
    <div className="p-12 text-center">
      <div
        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #B8922F22, #C4956A11 60%, transparent)",
          border: "2px dashed #C4956A66",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-9 h-9 text-gold"
          aria-hidden
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold">
        Pas encore de leads.
      </p>
      <p className="text-sm text-brown-light mt-2 max-w-sm mx-auto">
        Partagez votre landing{" "}
        <a
          href="/pro"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold font-semibold underline underline-offset-2 hover:text-gold-dark"
        >
          /pro
        </a>{" "}
        pour en recevoir.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_PILL[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function Drawer({
  lead,
  disabled,
  onClose,
  onUpdate,
}: {
  lead: PackLead;
  disabled: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<PackLead>) => Promise<PackLead | null> | void;
}) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [nextFollowup, setNextFollowup] = useState(lead.next_followup || "");

  async function saveNotes() {
    await onUpdate({ notes: notes.trim() || null });
  }

  async function saveFollowup() {
    await onUpdate({
      next_followup: nextFollowup.trim() === "" ? null : nextFollowup,
    });
  }

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
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[30rem] bg-white-warm border-l border-terracotta/30 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white-warm border-b border-terracotta/30 px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
              Lead · {lead.source}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold truncate">
              {lead.restaurant_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-brown-light hover:text-brown hover:bg-cream transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 gap-3">
            <InfoCell label="Contact">{lead.contact_name}</InfoCell>
            <InfoCell label="Email">
              <a
                href={`mailto:${lead.email}`}
                className="text-gold underline break-all"
              >
                {lead.email}
              </a>
            </InfoCell>
            {lead.phone && (
              <InfoCell label="Téléphone">
                <a
                  href={`tel:${lead.phone}`}
                  className="text-gold underline"
                >
                  {lead.phone}
                </a>
              </InfoCell>
            )}
            <InfoCell label="Reçu le">
              {formatFrenchDateTime(
                lead.created_at.slice(0, 10),
                lead.created_at.slice(11, 16)
              )}
            </InfoCell>
          </div>

          {/* Interest */}
          {lead.interest && lead.interest.trim().length > 0 && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">
                Intérêt / message
              </p>
              <p className="text-sm text-brown mt-1 whitespace-pre-wrap">
                {lead.interest}
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => {
                const active = lead.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onUpdate({ status: s })}
                    disabled={disabled}
                    className={[
                      "text-xs px-3 py-1.5 rounded-full border transition font-semibold inline-flex items-center gap-1.5",
                      active
                        ? "bg-brown text-cream border-brown"
                        : "bg-cream text-brown-light border-terracotta/40 hover:border-gold hover:text-brown",
                    ].join(" ")}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`}
                      aria-hidden
                    />
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next followup */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Prochaine relance
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={nextFollowup || ""}
                onChange={(e) => setNextFollowup(e.target.value)}
                className="flex-1 px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={saveFollowup}
                disabled={disabled}
                className="px-4 py-2 bg-gold text-brown font-semibold rounded-lg hover:bg-gold-light disabled:opacity-50 transition"
              >
                Enregistrer
              </button>
            </div>
            {lead.next_followup && (
              <button
                onClick={() => {
                  setNextFollowup("");
                  onUpdate({ next_followup: null });
                }}
                disabled={disabled}
                className="mt-2 text-xs text-brown-light hover:text-red underline"
              >
                Effacer la relance
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              placeholder="Contexte, call-to-action, objections…"
            />
            <button
              onClick={saveNotes}
              disabled={disabled}
              className="mt-2 px-4 py-2 bg-brown text-cream font-semibold rounded-lg hover:bg-brown-light disabled:opacity-50 transition text-sm"
            >
              Enregistrer les notes
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function InfoCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream rounded-lg px-3 py-2 border border-terracotta/30">
      <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold">
        {label}
      </p>
      <p className="text-sm text-brown font-medium mt-0.5">{children}</p>
    </div>
  );
}
