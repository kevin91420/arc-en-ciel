"use client";

/**
 * /admin/prospection — Pipeline OUTBOUND GOURMET PACK.
 *
 * - Liste triée par recency avec filtres (statut, ville, recherche texte).
 * - Stats pills en haut.
 * - Actions : importer JSON (modal), générer démo Morangis.
 * - Drawer détail : infos complètes, historique emails, envoi d'email,
 *   changement de statut, notes, tags.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  Prospect,
  ProspectEmail,
  ProspectStatus,
  ProspectTemplateId,
} from "@/lib/db/prospects-types";
import { PROSPECT_STATUSES } from "@/lib/db/prospects-types";
import { formatFrenchDateTime, relativeFr } from "../_lib/format";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "Nouveau",
  queued: "En file",
  contacted: "Contacté",
  replied: "A répondu",
  meeting_booked: "RDV posé",
  negotiating: "En négo",
  won: "Gagné",
  lost: "Perdu",
  unreachable: "Injoignable",
};

const STATUS_PILL: Record<ProspectStatus, string> = {
  new: "bg-gray-400/15 text-gray-600",
  queued: "bg-gold/15 text-gold",
  contacted: "bg-blue-400/15 text-blue-500",
  replied: "bg-purple-500/15 text-purple-600",
  meeting_booked: "bg-teal-500/15 text-teal-600",
  negotiating: "bg-orange-500/15 text-orange-600",
  won: "bg-green-500/15 text-green-600",
  lost: "bg-red-400/15 text-red-500",
  unreachable: "bg-gray-500/15 text-gray-500",
};

const STATUS_DOT: Record<ProspectStatus, string> = {
  new: "bg-gray-400",
  queued: "bg-gold",
  contacted: "bg-blue-400",
  replied: "bg-purple-500",
  meeting_booked: "bg-teal-500",
  negotiating: "bg-orange-500",
  won: "bg-green-500",
  lost: "bg-red-400",
  unreachable: "bg-gray-500",
};

const KEY_STATS: ProspectStatus[] = [
  "new",
  "queued",
  "contacted",
  "replied",
  "won",
  "lost",
];

const TEMPLATE_LABELS: Record<ProspectTemplateId, string> = {
  intro: "Intro (premier contact)",
  follow_up_1: "Follow-up #1 (J+3)",
  follow_up_2: "Follow-up #2 (J+7)",
  last_chance: "Last chance (J+14)",
};

const ALL_TEMPLATES: ProspectTemplateId[] = [
  "intro",
  "follow_up_1",
  "follow_up_2",
  "last_chance",
];

export default function ProspectionPage() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">(
    "all"
  );
  const [cityFilter, setCityFilter] = useState<string>("all");

  const [importOpen, setImportOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const initialLoadRef = useRef(true);

  const load = useCallback(async () => {
    if (initialLoadRef.current) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Prospect[] = await res.json();
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
  }, [load]);

  /* Patch un prospect et met à jour la liste localement. */
  async function patchProspect(
    id: string,
    patch: Partial<Prospect>
  ): Promise<Prospect | null> {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const updated: Prospect = await res.json();
      setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
      return null;
    } finally {
      setUpdatingId(null);
    }
  }

  async function sendEmail(
    id: string,
    templateId: ProspectTemplateId
  ): Promise<boolean> {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/send`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data?.skipped) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      if (data?.skipped) {
        setToast("Email loggé (Resend non configuré en local).");
      } else {
        setToast(`Email "${TEMPLATE_LABELS[templateId]}" envoyé.`);
      }
      setTimeout(() => setToast(null), 3500);
      await load();
      return true;
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  async function seedDemo() {
    if (!confirm("Générer 10 prospects démo à Morangis ?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/prospects/demo-seed", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setToast(
        `Seed : ${data.imported} ajouté${data.imported > 1 ? "s" : ""}, ${data.skipped} déjà présent${data.skipped > 1 ? "s" : ""}.`
      );
      setTimeout(() => setToast(null), 3500);
      await load();
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
    } finally {
      setSeeding(false);
    }
  }

  /* Derived */
  const counts = useMemo(() => {
    const c = {} as Record<ProspectStatus, number>;
    for (const s of PROSPECT_STATUSES) c[s] = 0;
    for (const p of items) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [items]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) if (p.city) set.add(p.city);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (cityFilter !== "all") {
      list = list.filter((p) => (p.city || "") === cityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter((p) => {
        return (
          p.restaurant_name.toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          (p.phone || "").toLowerCase().includes(q) ||
          (p.city || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [items, search, statusFilter, cityFilter]);

  const selected = useMemo(
    () => items.find((p) => p.id === selectedId) || null,
    [items, selectedId]
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Outbound · démarchage ciblé
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Prospection{" "}
            <span className="text-gold font-normal">commerciale</span>
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {items.length} prospect{items.length > 1 ? "s" : ""} au total ·
            séquences d&apos;emails
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-brown text-cream rounded-lg text-sm font-semibold hover:bg-brown-light transition inline-flex items-center gap-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              aria-hidden
            >
              <path
                d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Importer JSON
          </button>
          <button
            onClick={seedDemo}
            disabled={seeding}
            className="px-4 py-2 bg-gold text-brown rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50 transition inline-flex items-center gap-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              aria-hidden
            >
              <path
                d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 5L21 11l-5.5 3-2.5 5-2.5-5L5 11l5.5-3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {seeding ? "…" : "Démo Morangis"}
          </button>
          <button
            onClick={() => load()}
            className="px-3 py-2 bg-cream border border-terracotta/40 text-brown rounded-lg text-sm font-semibold hover:border-gold transition"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* ─── Stats pills ────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {KEY_STATS.map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "all" : s)}
              className={[
                "text-left bg-white-warm rounded-xl border-2 px-4 py-3 transition",
                active
                  ? "border-gold shadow-sm"
                  : "border-terracotta/30 hover:border-terracotta/60",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`}
                  aria-hidden
                />
                <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold truncate">
                  {STATUS_LABELS[s]}
                </p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-3xl text-brown font-semibold leading-none mt-2">
                {counts[s] || 0}
              </p>
            </button>
          );
        })}
      </div>

      {/* ─── Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
            Recherche
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, téléphone, ville…"
            className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown placeholder-brown-light/50 focus:outline-none focus:ring-2 focus:ring-gold min-w-[18rem]"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
            Statut
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProspectStatus | "all")
            }
            className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">Tous</option>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
            Ville
          </label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">Toutes</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── List ───────────────────────────────────────── */}
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
                  <th className="px-4 py-3 text-left font-semibold">Ville</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Note
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Emails
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Dernier contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terracotta/25">
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.018 }}
                    onClick={() => setSelectedId(p.id)}
                    className="cursor-pointer hover:bg-cream/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-[family-name:var(--font-display)] font-semibold text-brown text-base truncate max-w-[18rem]">
                        {p.restaurant_name}
                      </div>
                      {p.cuisine_type && (
                        <div className="text-[11px] text-brown-light mt-0.5 truncate max-w-[18rem]">
                          {p.cuisine_type}
                          {p.price_range && (
                            <span className="ml-2 text-gold">
                              {p.price_range}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brown-light">
                      {p.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-brown">
                      {p.email ? (
                        <div className="text-xs text-gold truncate max-w-[14rem]">
                          {p.email}
                        </div>
                      ) : (
                        <div className="text-[11px] text-brown-light italic">
                          pas d&apos;email
                        </div>
                      )}
                      {p.phone && (
                        <div className="text-xs text-brown-light font-mono mt-0.5">
                          {p.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.rating ? (
                        <div className="inline-flex items-center gap-1 text-xs text-brown">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5 text-gold"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path d="M12 2l2.4 6.9h7.3l-5.9 4.3 2.3 7L12 16l-6.1 4.2 2.3-7-5.9-4.3h7.3z" />
                          </svg>
                          <span className="font-semibold">{p.rating}</span>
                          {p.reviews_count !== null &&
                            p.reviews_count !== undefined && (
                              <span className="text-brown-light">
                                ({p.reviews_count})
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-brown-light">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-brown">
                      {p.emails_sent || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brown-light">
                      {p.last_email_at ? relativeFr(p.last_email_at) : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-terracotta/25">
              {filtered.map((p) => (
                <li
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="p-4 active:bg-cream/60 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-brown truncate">
                        {p.restaurant_name}
                      </p>
                      <p className="text-xs text-brown-light mt-0.5 truncate">
                        {p.city || "—"}
                        {p.cuisine_type && <> · {p.cuisine_type}</>}
                      </p>
                      {p.email && (
                        <p className="text-xs text-gold break-all mt-0.5">
                          {p.email}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusPill status={p.status} />
                      <span className="text-[10px] text-brown-light">
                        {p.emails_sent || 0} email
                        {(p.emails_sent || 0) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ─── Drawer ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <Drawer
            key={selected.id}
            prospect={selected}
            disabled={updatingId === selected.id}
            onClose={() => setSelectedId(null)}
            onUpdate={(patch) => patchProspect(selected.id, patch)}
            onSend={(tpl) => sendEmail(selected.id, tpl)}
          />
        )}
      </AnimatePresence>

      {/* ─── Import modal ───────────────────────────────── */}
      <AnimatePresence>
        {importOpen && (
          <ImportModal
            onClose={() => setImportOpen(false)}
            onImported={(summary) => {
              setImportOpen(false);
              setToast(
                `Import : ${summary.imported} ajouté${summary.imported > 1 ? "s" : ""}, ${summary.skipped} skippé${summary.skipped > 1 ? "s" : ""}.`
              );
              setTimeout(() => setToast(null), 4000);
              load();
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-brown text-cream text-sm font-semibold px-5 py-3 rounded-full shadow-xl"
          >
            {toast}
          </motion.div>
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
        Aucun prospect ne correspond à ces filtres.
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
            d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold">
        Pas encore de prospects.
      </p>
      <p className="text-sm text-brown-light mt-2 max-w-sm mx-auto">
        Clique sur <strong>Démo Morangis</strong> pour seeder 10 restos de
        test, ou <strong>Importer JSON</strong> pour coller un export Apify /
        Phantombuster.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: ProspectStatus }) {
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
  prospect,
  disabled,
  onClose,
  onUpdate,
  onSend,
}: {
  prospect: Prospect;
  disabled: boolean;
  onClose: () => void;
  onUpdate: (
    patch: Partial<Prospect>
  ) => Promise<Prospect | null> | void;
  onSend: (tpl: ProspectTemplateId) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState(prospect.notes || "");
  const [template, setTemplate] = useState<ProspectTemplateId>("intro");
  const [emails, setEmails] = useState<ProspectEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);

  const loadEmails = useCallback(async () => {
    setEmailsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/prospects/${prospect.id}/emails`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data: ProspectEmail[] = await res.json();
        setEmails(data);
      }
    } catch {
      /* ignore */
    } finally {
      setEmailsLoading(false);
    }
  }, [prospect.id]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  async function saveNotes() {
    await onUpdate({ notes: notes.trim() || null });
  }

  async function send() {
    const ok = await onSend(template);
    if (ok) await loadEmails();
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
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[34rem] bg-white-warm border-l border-terracotta/30 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white-warm border-b border-terracotta/30 px-5 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
              Prospect · {prospect.source}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold truncate">
              {prospect.restaurant_name}
            </h2>
            {prospect.city && (
              <p className="text-xs text-brown-light mt-0.5 truncate">
                {prospect.city}
                {prospect.postal_code && ` · ${prospect.postal_code}`}
              </p>
            )}
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
          {/* Identity grid */}
          <div className="grid grid-cols-1 gap-3">
            {prospect.email && (
              <InfoCell label="Email">
                <a
                  href={`mailto:${prospect.email}`}
                  className="text-gold underline break-all"
                >
                  {prospect.email}
                </a>
              </InfoCell>
            )}
            {prospect.phone && (
              <InfoCell label="Téléphone">
                <a
                  href={`tel:${prospect.phone}`}
                  className="text-gold underline"
                >
                  {prospect.phone}
                </a>
              </InfoCell>
            )}
            {prospect.address && (
              <InfoCell label="Adresse">{prospect.address}</InfoCell>
            )}
            {prospect.website && (
              <InfoCell label="Site web">
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline break-all"
                >
                  {prospect.website}
                </a>
              </InfoCell>
            )}
            {prospect.rating !== null && prospect.rating !== undefined && (
              <InfoCell label="Note Google">
                {prospect.rating} / 5
                {prospect.reviews_count !== null &&
                  prospect.reviews_count !== undefined && (
                    <span className="text-brown-light">
                      {" "}
                      · {prospect.reviews_count} avis
                    </span>
                  )}
              </InfoCell>
            )}
            {prospect.cuisine_type && (
              <InfoCell label="Cuisine">
                {prospect.cuisine_type}
                {prospect.price_range && (
                  <span className="text-gold ml-2">
                    {prospect.price_range}
                  </span>
                )}
              </InfoCell>
            )}
            <InfoCell label="Ajouté">
              {formatFrenchDateTime(
                prospect.created_at.slice(0, 10),
                prospect.created_at.slice(11, 16)
              )}
            </InfoCell>
          </div>

          {/* Status switcher */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {PROSPECT_STATUSES.map((s) => {
                const active = prospect.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onUpdate({ status: s })}
                    disabled={disabled}
                    className={[
                      "text-[11px] px-2.5 py-1 rounded-full border transition font-semibold inline-flex items-center gap-1.5",
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

          {/* Send email */}
          <div className="bg-cream rounded-xl border border-terracotta/30 p-4">
            <p className="text-[10px] uppercase tracking-wider text-gold font-semibold mb-2">
              Envoyer un email
            </p>
            {!prospect.email ? (
              <p className="text-sm text-red-dark italic">
                Ce prospect n&apos;a pas d&apos;email. Ajoute-le d&apos;abord
                pour envoyer.
              </p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={template}
                    onChange={(e) =>
                      setTemplate(e.target.value as ProspectTemplateId)
                    }
                    className="flex-1 px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    {ALL_TEMPLATES.map((t) => (
                      <option key={t} value={t}>
                        {TEMPLATE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={send}
                    disabled={disabled}
                    className="px-4 py-2 bg-gold text-brown font-semibold rounded-lg hover:bg-gold-light disabled:opacity-50 transition text-sm"
                  >
                    {disabled ? "Envoi…" : "Envoyer →"}
                  </button>
                </div>
                <p className="text-[11px] text-brown-light mt-2">
                  Reply-to :{" "}
                  <span className="font-mono">kaubouin@gmail.com</span>
                </p>
              </>
            )}
          </div>

          {/* History */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brown-light font-semibold mb-2">
              Historique ({emails.length})
            </p>
            {emailsLoading ? (
              <p className="text-xs text-brown-light italic">Chargement…</p>
            ) : emails.length === 0 ? (
              <p className="text-xs text-brown-light italic">
                Aucun email envoyé pour l&apos;instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {emails.map((e) => (
                  <li
                    key={e.id}
                    className="bg-cream border border-terracotta/30 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">
                          {TEMPLATE_LABELS[
                            e.template_id as ProspectTemplateId
                          ] || e.template_id}
                        </p>
                        <p className="text-sm text-brown font-semibold truncate">
                          {e.subject}
                        </p>
                      </div>
                      <span className="text-[10px] text-brown-light shrink-0">
                        {relativeFr(e.sent_at)}
                      </span>
                    </div>
                    {e.opened_at && (
                      <p className="text-[10px] text-green-600 mt-1">
                        Ouvert · {relativeFr(e.opened_at)}
                      </p>
                    )}
                    {e.replied_at && (
                      <p className="text-[10px] text-purple-600 mt-1">
                        Répondu · {relativeFr(e.replied_at)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
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
              rows={4}
              className="w-full px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none text-sm"
              placeholder="Contexte, objections, prochaines étapes…"
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

function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (summary: { imported: number; skipped: number }) => void;
}) {
  const [city, setCity] = useState("");
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!city.trim()) {
      setErr("La ville est obligatoire.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setErr("JSON invalide.");
      return;
    }
    const prospects = Array.isArray(parsed) ? parsed : null;
    if (!prospects) {
      setErr(
        'Le JSON doit être un tableau : [{"restaurant_name": "...", ...}]'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/prospects/import", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), prospects }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      onImported({ imported: data.imported, skipped: data.skipped });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-brown/50 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white-warm w-full max-w-2xl rounded-2xl border border-terracotta/30 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-terracotta/30">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
                Import manuel
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-brown font-semibold">
                Coller un JSON de prospects
              </h2>
              <p className="text-xs text-brown-light mt-1">
                Tableau d&apos;objets. Dedup auto sur (restaurant_name, ville).
              </p>
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

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
                Ville cible
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex : Orly, Paris 11e…"
                className="w-full px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
                JSON (tableau)
              </label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={10}
                placeholder={`[
  {
    "restaurant_name": "Le Petit Bistrot",
    "address": "12 Rue...",
    "phone": "01 ...",
    "email": "contact@...",
    "rating": 4.4,
    "reviews_count": 187
  }
]`}
                className="w-full px-3 py-2 bg-cream border border-terracotta/40 rounded-lg text-xs font-mono text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              />
            </div>
            {err && (
              <div className="bg-red/10 border border-red/30 text-red-dark text-xs px-3 py-2 rounded-lg">
                {err}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-cream border border-terracotta/40 text-brown font-semibold rounded-lg hover:border-gold transition text-sm"
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 bg-brown text-cream font-semibold rounded-lg hover:bg-brown-light disabled:opacity-50 transition text-sm"
              >
                {submitting ? "Import…" : "Importer"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
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
      <p className="text-sm text-brown font-medium mt-0.5 break-words">
        {children}
      </p>
    </div>
  );
}
