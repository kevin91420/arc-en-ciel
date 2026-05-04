"use client";

/**
 * /admin/staff — Gestion du personnel (Sprint 7b QW#9).
 *
 * Liste les staff (manager, serveur, chef), permet de créer/éditer/désactiver,
 * affiche le PIN et le rôle. Le PIN est utilisé pour se connecter au POS
 * (/staff/login).
 *
 * Demandé par retour terrain (boulangerie patronne d'Angelo) :
 * "Gestion du personnel avec leurs infos : poste, téléphone, nom prénom,
 * mail, code serveur, photo, KPI sur le serveur".
 *
 * Pour cette première version on couvre :
 *   - Nom, PIN 4 chiffres, rôle (manager/server/chef), couleur
 *   - Activer / désactiver (soft delete)
 *
 * Les enrichissements (photo, mail, tel, KPI individuels) viendront dans
 * un sprint dédié "gestion personnel enrichie".
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import { ROLE_META, type StaffRole } from "@/lib/auth/roles";
import type { StaffMember } from "@/lib/db/pos-types";

interface LeaderboardEntry {
  staff_id: string;
  staff_name: string;
  staff_color: string | null;
  rank: number;
  revenue_cents: number;
  orders_count: number;
  tip_cents: number;
}

const COLOR_PRESETS = [
  "#C0392B", // rouge brique
  "#B8922F", // gold
  "#8B6914", // brun foncé
  "#2C7A7B", // teal
  "#5B3A29", // brown app
  "#3D5A80", // bleu nuit
  "#7B4F4F", // bordeaux
  "#4A6741", // vert sauge
];

export default function StaffAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | StaffRole>("all");
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [staffRes, lbRes] = await Promise.all([
        fetch("/api/admin/staff?include_inactive=1", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/staff/leaderboard?period=month", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!staffRes.ok) throw new Error("Impossible de charger le personnel");
      const data = (await staffRes.json()) as { staff: StaffMember[] };
      setRows(data.staff);
      if (lbRes.ok) {
        const lb = (await lbRes.json()) as { leaderboard: LeaderboardEntry[] };
        setLeaderboard(lb.leaderboard);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* Sprint 7b QW#11 — si on arrive avec ?edit=<staffId> (depuis page détail),
   * ouvre directement le modal d'édition. On lit window.location pour
   * éviter le bailout SSR de useSearchParams en Next 16. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId && rows.length > 0) {
      const target = rows.find((s) => s.id === editId);
      if (target) {
        setEditing(target);
        router.replace("/admin/staff");
      }
    }
  }, [rows, router]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") {
      list = list.filter((r) => r.role === filter);
    }
    return list;
  }, [rows, filter]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active);
    return {
      total: rows.length,
      active: active.length,
      managers: active.filter((r) => r.role === "manager").length,
      servers: active.filter((r) => r.role === "server").length,
      chefs: active.filter((r) => r.role === "chef").length,
    };
  }, [rows]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Permissions multi-niveaux
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Personnel & rôles
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Gère ton équipe et leurs droits. Chaque staff se connecte au POS
          avec son PIN à 4 chiffres et accède aux options selon son rôle.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
      >
        <StatCard label="Actifs" value={stats.active} tone="brown" emphasis />
        <StatCard
          label="Managers"
          value={stats.managers}
          tone="brown"
          icon="👔"
        />
        <StatCard
          label="Serveurs"
          value={stats.servers}
          tone="gold"
          icon="🍽"
        />
        <StatCard
          label="Cuisiniers"
          value={stats.chefs}
          tone="amber"
          icon="👨‍🍳"
        />
        <StatCard
          label="Désactivés"
          value={stats.total - stats.active}
          tone="muted"
        />
      </motion.section>

      {/* Leaderboard du mois — Sprint 7b QW#11 */}
      {leaderboard.length > 1 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6 rounded-2xl bg-gradient-to-br from-gold/15 via-gold/8 to-cream border border-gold/30 p-5"
        >
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown flex items-center gap-2">
              🏆 Classement du mois
            </h2>
            <p className="text-[11px] text-brown-light/70 italic">
              Challenge équipe — top serveurs par CA généré
            </p>
          </div>
          <ol className="space-y-2">
            {leaderboard.slice(0, 5).map((entry) => {
              const medal =
                entry.rank === 1
                  ? "🥇"
                  : entry.rank === 2
                    ? "🥈"
                    : entry.rank === 3
                      ? "🥉"
                      : null;
              return (
                <li key={entry.staff_id}>
                  <Link
                    href={`/admin/staff/${entry.staff_id}`}
                    className={[
                      "flex items-center gap-3 p-3 rounded-xl transition group",
                      entry.rank === 1
                        ? "bg-white-warm border-2 border-gold shadow-md"
                        : "bg-white-warm/60 border border-terracotta/20 hover:border-gold/50",
                    ].join(" ")}
                  >
                    {/* Rank / medal */}
                    <div className="flex-shrink-0 w-10 text-center">
                      {medal ? (
                        <span className="text-2xl" aria-hidden>
                          {medal}
                        </span>
                      ) : (
                        <span className="text-base font-bold text-brown-light tabular-nums">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-base font-bold text-cream flex-shrink-0"
                      style={{ background: entry.staff_color || "#B8922F" }}
                    >
                      {entry.staff_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + orders */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brown truncate">
                        {entry.staff_name}
                      </p>
                      <p className="text-[11px] text-brown-light tabular-nums">
                        {entry.orders_count} commande
                        {entry.orders_count > 1 ? "s" : ""}
                        {entry.tip_cents > 0 && (
                          <span className="ml-2">
                            · {formatCents(entry.tip_cents)} pourb.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Revenue */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className={[
                          "font-[family-name:var(--font-display)] font-bold tabular-nums",
                          entry.rank === 1
                            ? "text-2xl text-gold"
                            : "text-lg text-brown",
                        ].join(" ")}
                      >
                        {formatCents(entry.revenue_cents)}
                      </p>
                    </div>

                    <span className="text-brown-light/40 group-hover:text-gold transition">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </motion.section>
      )}

      {/* Toolbar */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tous"
            count={rows.length}
          />
          {(["manager", "server", "chef"] as StaffRole[]).map((r) => (
            <FilterPill
              key={r}
              active={filter === r}
              onClick={() => setFilter(r)}
              label={ROLE_META[r].label}
              icon={ROLE_META[r].icon}
              count={rows.filter((row) => row.role === r).length}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95 shadow-lg shadow-brown/20"
        >
          <span className="text-lg leading-none">+</span>
          Ajouter un staff
        </button>
      </motion.section>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            👥
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            {filter === "all"
              ? "Aucun staff. Crée-en un pour commencer."
              : `Aucun ${ROLE_META[filter as StaffRole]?.label?.toLowerCase()} pour le moment.`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              onEdit={() => setEditing(s)}
            />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <StaffModal
            staff={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Staff card
   ═══════════════════════════════════════════════════════════ */

function StaffCard({
  staff: s,
  onEdit,
}: {
  staff: StaffMember;
  onEdit: () => void;
}) {
  const role = (s.role as StaffRole) ?? "server";
  const meta = ROLE_META[role];
  const initial = s.name.charAt(0).toUpperCase();

  return (
    <motion.li layout className="relative">
      {/* Click card → navigation vers détail (stats individuelles) */}
      <Link
        href={`/admin/staff/${s.id}`}
        className={[
          "block rounded-2xl bg-white-warm border p-5 transition active:scale-[0.99] hover:shadow-md hover:border-gold pr-12",
          s.active
            ? "border-terracotta/20"
            : "border-terracotta/10 opacity-60",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-bold flex-shrink-0 text-cream"
            style={{ background: s.color || "#B8922F" }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight truncate">
                {s.name}
              </h3>
              <span
                className={[
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  meta.tone,
                ].join(" ")}
              >
                <span aria-hidden>{meta.icon}</span>
                {meta.label}
              </span>
              {!s.active && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brown-light/30 text-brown-light px-1.5 py-0.5 rounded">
                  Inactif
                </span>
              )}
            </div>
            <p className="text-xs text-brown-light/80 mt-0.5 font-mono">
              PIN : <span className="text-brown font-bold">{s.pin_code}</span>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-brown-light/70 mt-3 italic leading-snug">
          {meta.description}
        </p>
        <p className="text-[11px] text-gold font-semibold mt-2">
          Voir les stats →
        </p>
      </Link>

      {/* Bouton edit en overlay top-right (ne déclenche pas la navigation) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-cream hover:bg-gold/20 text-brown-light hover:text-brown border border-terracotta/30 flex items-center justify-center transition active:scale-90 text-sm"
        title="Modifier"
        aria-label={`Modifier ${s.name}`}
      >
        ✎
      </button>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card / Filter pill
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  tone = "brown",
  icon,
  emphasis,
}: {
  label: string;
  value: number;
  tone?: "brown" | "gold" | "amber" | "muted";
  icon?: string;
  emphasis?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    gold: "text-gold",
    amber: "text-amber-700",
    muted: "text-brown-light",
  };
  return (
    <div
      className={[
        "rounded-2xl bg-white-warm border p-4",
        emphasis ? "border-gold/40 bg-gold/5" : "border-terracotta/20",
      ].join(" ")}
    >
      <div className="flex items-baseline gap-2">
        {icon && <span className="text-base" aria-hidden>{icon}</span>}
        <div
          className={[
            "font-[family-name:var(--font-display)] font-bold leading-none tabular-nums",
            emphasis ? "text-3xl" : "text-2xl",
            tones[tone],
          ].join(" ")}
        >
          {value}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-2">
        {label}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95",
        active
          ? "bg-brown text-cream"
          : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
      ].join(" ")}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
      <span
        className={[
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
          active ? "bg-cream/20 text-cream" : "bg-cream text-brown-light",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Staff modal — create / edit
   ═══════════════════════════════════════════════════════════ */

function StaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = staff === null;
  const [name, setName] = useState(staff?.name ?? "");
  const [pin, setPin] = useState(staff?.pin_code ?? "");
  const [role, setRole] = useState<StaffRole>(
    (staff?.role as StaffRole) ?? "server"
  );
  const [color, setColor] = useState(staff?.color ?? COLOR_PRESETS[1]);
  const [active, setActive] = useState(staff?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("Le PIN doit contenir exactement 4 chiffres.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      if (isNew) {
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), pin_code: pin, role, color }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(d.error || `HTTP ${res.status}`);
        }
      } else {
        const res = await fetch(`/api/admin/staff/${staff!.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            pin_code: pin,
            role,
            color,
            active,
          }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(d.error || `HTTP ${res.status}`);
        }
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!staff) return;
    if (!confirm(`Désactiver ${staff.name} ?\nIl/elle ne pourra plus se connecter au POS, mais l'historique reste.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/staff/${staff.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      onSaved();
    } catch {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-[calc(100vw-2rem)] sm:max-h-[92vh] z-50 flex"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 h-full w-full flex flex-col overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-terracotta/20 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                {isNew ? "Nouveau staff" : `Modifier ${staff!.name}`}
              </h2>
              <p className="text-xs text-brown-light/70 mt-0.5">
                Le PIN sert à se connecter sur /staff/login
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-brown-light hover:text-brown w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
                Nom <span className="text-red">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sophie Martin"
                maxLength={80}
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
                Code PIN (4 chiffres) <span className="text-red">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                maxLength={4}
                className="w-full px-3 py-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-2xl font-bold tabular-nums tracking-[0.5em] text-center focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <p className="text-[10px] text-brown-light/70 mt-1">
                Doit être unique parmi les staffs actifs.
              </p>
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                Rôle <span className="text-red">*</span>
              </label>
              <div className="space-y-2">
                {(["manager", "server", "chef"] as StaffRole[]).map((r) => {
                  const meta = ROLE_META[r];
                  const selected = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={[
                        "w-full text-left rounded-lg border-2 p-3 transition",
                        selected
                          ? "bg-gold/10 border-gold"
                          : "bg-cream border-terracotta/30 hover:border-gold/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden>
                          {meta.icon}
                        </span>
                        <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown">
                          {meta.label}
                        </span>
                        {selected && (
                          <span className="ml-auto text-gold font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brown-light/80 mt-0.5">
                        {meta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                Couleur d&apos;identification
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => {
                  const selected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={[
                        "w-9 h-9 rounded-full transition",
                        selected
                          ? "ring-2 ring-offset-2 ring-brown scale-110 shadow-md"
                          : "hover:scale-105",
                      ].join(" ")}
                      style={{ background: c }}
                      title={c}
                      aria-label={`Couleur ${c}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Active toggle (édition seulement) */}
            {!isNew && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-cream border border-terracotta/30">
                <div>
                  <p className="text-sm font-semibold text-brown">
                    Compte actif
                  </p>
                  <p className="text-[11px] text-brown-light/80">
                    {active
                      ? "Peut se connecter au POS"
                      : "Connexion bloquée"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => setActive((v) => !v)}
                  className={[
                    "w-12 h-7 rounded-full relative transition",
                    active ? "bg-gold" : "bg-brown/20",
                  ].join(" ")}
                >
                  <motion.span
                    layout
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                    animate={{ left: active ? 22 : 2 }}
                    transition={{
                      type: "spring",
                      stiffness: 600,
                      damping: 32,
                    }}
                  />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2 flex items-start gap-2 flex-shrink-0"
            >
              <span aria-hidden className="text-base leading-none">⚠</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-between gap-2 flex-shrink-0 bg-white-warm">
            {!isNew ? (
              <button
                type="button"
                onClick={deactivate}
                disabled={busy}
                className="text-xs text-red hover:text-red-dark transition disabled:opacity-50"
              >
                {staff!.active ? "Désactiver" : "—"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95"
              >
                {busy
                  ? "Enregistrement…"
                  : isNew
                    ? "Créer le staff"
                    : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </>
  );
}

