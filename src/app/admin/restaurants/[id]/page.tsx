"use client";

/**
 * /admin/restaurants/[id] — Page détail + édition d'un tenant.
 *
 * Sections :
 *   - Header avec breadcrumb + status badge
 *   - Infos générales (nom, slug, email, tel, adresse)
 *   - Branding (couleurs, logo URL) avec live preview
 *   - Abonnement (status, trial_ends_at, stripe IDs)
 *   - Actions dangereuses (désactiver)
 *
 * Sprint 7b — Phase E.
 */

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type {
  RestaurantBranding,
  RestaurantRow,
  SubscriptionStatus,
  UpdateRestaurantPayload,
} from "@/lib/db/restaurants-types";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: "🔵 Trial — essai gratuit",
  active: "✅ Actif — abonnement payant",
  past_due: "🟡 Impayé — paiement en attente",
  canceled: "⚫ Résilié",
  expired: "🔴 Expiré",
};

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [row, setRow] = useState<RestaurantRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Restaurant introuvable.");
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { restaurant: RestaurantRow };
      setRow(data.restaurant);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  async function save(patch: UpdateRestaurantPayload) {
    if (!row) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
      flashToast("Mis à jour ✓");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!row) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/restaurants/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      router.push("/admin/restaurants");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-brown-light">
        Chargement…
      </div>
    );
  }

  if (error && !row) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-dark mb-4">{error}</p>
        <Link
          href="/admin/restaurants"
          className="text-brown font-semibold hover:text-gold"
        >
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  if (!row) return null;

  const branding = row.branding ?? {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/admin/restaurants"
          className="inline-flex items-center gap-1.5 text-xs text-brown-light/70 hover:text-brown font-semibold mb-3 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour à la flotte
        </Link>
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown">
            {row.name}
          </h1>
          <span className="font-mono text-xs text-brown-light/70">
            /r/{row.slug}
          </span>
        </div>
        <p className="text-brown-light/80 mt-2">
          {STATUS_LABEL[row.subscription_status]}
        </p>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {/* Section : infos générales */}
      <Section title="Informations générales">
        <EditableField
          label="Nom"
          value={row.name}
          onSave={(v) => save({ name: v })}
          busy={busy}
          required
        />
        <EditableField
          label="Slug"
          value={row.slug}
          onSave={(v) => save({ slug: v })}
          busy={busy}
          mono
          hint="⚠ Changer le slug change l'URL. Les anciens liens /r/[ancien-slug] ne fonctionneront plus."
        />
        <EditableField
          label="Email du propriétaire"
          value={row.owner_email ?? ""}
          onSave={(v) => save({ owner_email: v })}
          busy={busy}
          type="email"
        />
        <EditableField
          label="Téléphone"
          value={row.owner_phone ?? ""}
          onSave={(v) => save({ owner_phone: v || null })}
          busy={busy}
          type="tel"
        />
        <EditableField
          label="Adresse"
          value={row.address ?? ""}
          onSave={(v) => save({ address: v || null })}
          busy={busy}
        />
        <EditableField
          label="Ville"
          value={row.city ?? ""}
          onSave={(v) => save({ city: v || null })}
          busy={busy}
        />
        <EditableField
          label="Code postal"
          value={row.postal_code ?? ""}
          onSave={(v) => save({ postal_code: v || null })}
          busy={busy}
        />
      </Section>

      {/* Section : branding */}
      <Section
        title="Branding (white-label)"
        description="Couleurs et fonts injectées au runtime via CSS variables. Aperçu en bas."
      >
        <BrandingEditor
          branding={branding}
          onSave={(b) => save({ branding: b })}
          busy={busy}
        />
        <BrandingPreview branding={branding} name={row.name} />
      </Section>

      {/* Section : abonnement */}
      <Section title="Abonnement">
        <InfoRow label="Statut" value={STATUS_LABEL[row.subscription_status]} />
        <InfoRow
          label="Trial expire le"
          value={
            row.trial_ends_at
              ? new Date(row.trial_ends_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"
          }
        />
        <InfoRow
          label="Stripe Customer ID"
          value={row.stripe_customer_id || "—"}
          mono
        />
        <InfoRow
          label="Stripe Subscription ID"
          value={row.stripe_subscription_id || "—"}
          mono
        />
        <InfoRow
          label="Onboarding terminé"
          value={row.onboarding_completed ? "✓ Oui" : "✗ Non"}
        />
        <InfoRow
          label="Créé le"
          value={new Date(row.created_at).toLocaleString("fr-FR")}
        />
        <p className="text-[11px] text-brown-light/70 italic mt-3">
          La gestion Stripe Billing complète arrive au Sprint 8 (changement
          de plan, factures, portail client, etc.).
        </p>
      </Section>

      {/* Section : actions dangereuses */}
      <Section title="Actions" tone="danger">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={!row.active}
            className="h-10 px-4 rounded-lg border border-red/30 text-red-dark text-sm font-semibold hover:bg-red/10 transition disabled:opacity-40"
          >
            {row.active ? "Désactiver ce tenant" : "Tenant déjà désactivé"}
          </button>
        ) : (
          <div className="rounded-lg border border-red/40 bg-red/5 p-4 space-y-3">
            <p className="text-sm text-red-dark font-semibold">
              ⚠ Confirmer la désactivation de « {row.name} »
            </p>
            <p className="text-xs text-brown-light/90">
              Le tenant passe en <code>active = false</code>. Les données
              restent en base (pour la compta), mais l'accès est coupé. Tu
              peux le réactiver après en éditant <code>active</code> via
              l'API.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-brown-light hover:text-brown"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={deactivate}
                disabled={busy}
                className="h-9 px-4 rounded-lg bg-red text-white text-xs font-bold hover:bg-red-dark transition active:scale-95 disabled:opacity-50"
              >
                {busy ? "Désactivation…" : "Confirmer désactivation"}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brown text-cream px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <span aria-hidden className="text-gold">
              ✓
            </span>
            <span className="font-semibold text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Section wrapper
   ═══════════════════════════════════════════════════════════ */

function Section({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description?: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "mb-6 rounded-2xl bg-white-warm p-5 sm:p-6",
        tone === "danger"
          ? "border-2 border-red/20"
          : "border border-terracotta/20",
      ].join(" ")}
    >
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-1">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-brown-light/80 mb-4">{description}</p>
      )}
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════
   Editable field (click-to-edit + save inline)
   ═══════════════════════════════════════════════════════════ */

function EditableField({
  label,
  value,
  onSave,
  busy,
  type = "text",
  mono,
  hint,
  required,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  busy: boolean;
  type?: "text" | "email" | "tel";
  mono?: boolean;
  hint?: string;
  required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    if (required && !draft.trim()) return;
    if (draft === value) {
      setEditing(false);
      return;
    }
    onSave(draft);
    setEditing(false);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-start py-1.5">
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
          {label}
          {required && <span className="text-red ml-1">*</span>}
        </label>
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
            autoFocus
            className={`flex-1 px-3 py-2 rounded-lg bg-white-warm border border-gold text-brown text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 ${mono ? "font-mono" : ""}`}
          />
          <button
            type="button"
            onClick={commit}
            disabled={busy}
            className="px-3 rounded-lg bg-brown text-cream text-xs font-bold hover:bg-brown-light disabled:opacity-50"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="px-3 rounded-lg text-brown-light hover:text-brown text-xs"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left text-sm text-brown py-2 px-3 -mx-3 rounded-lg hover:bg-cream transition ${mono ? "font-mono" : ""}`}
          title="Clique pour modifier"
        >
          {value || <span className="text-brown-light/50 italic">Vide</span>}
          {hint && (
            <span className="block text-[11px] text-brown-light/70 italic mt-1">
              {hint}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Info row (read-only)
   ═══════════════════════════════════════════════════════════ */

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-baseline py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-brown-light/80 font-bold">
        {label}
      </span>
      <span
        className={[
          "text-sm text-brown break-all",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Branding editor
   ═══════════════════════════════════════════════════════════ */

function BrandingEditor({
  branding,
  onSave,
  busy,
}: {
  branding: RestaurantBranding;
  onSave: (b: RestaurantBranding) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<RestaurantBranding>(branding);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(branding);
    setDirty(false);
  }, [branding]);

  function update(patch: Partial<RestaurantBranding>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ColorField
          label="Couleur principale"
          value={draft.primary_color || "#5b3a29"}
          onChange={(v) => update({ primary_color: v })}
        />
        <ColorField
          label="Couleur d'accent"
          value={draft.accent_color || "#b8922f"}
          onChange={(v) => update({ accent_color: v })}
        />
        <ColorField
          label="Couleur de fond"
          value={draft.background_color || "#fdf6e3"}
          onChange={(v) => update({ background_color: v })}
        />
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
            Font Display
          </label>
          <input
            value={draft.font_display ?? ""}
            onChange={(e) => update({ font_display: e.target.value })}
            placeholder="Playfair Display"
            className="w-full px-3 py-2 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
          Logo URL (optionnel)
        </label>
        <input
          type="url"
          value={draft.logo_url ?? ""}
          onChange={(e) => update({ logo_url: e.target.value || null })}
          placeholder="https://…"
          className="w-full px-3 py-2 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      </div>
      {dirty && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(branding);
              setDirty(false);
            }}
            className="text-xs text-brown-light hover:text-brown px-3 py-2"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              setDirty(false);
            }}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-brown text-cream text-xs font-bold hover:bg-brown-light disabled:opacity-50 active:scale-95"
          >
            Sauvegarder le branding
          </button>
        </div>
      )}
    </>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-terracotta/30 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm font-mono focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Branding preview
   ═══════════════════════════════════════════════════════════ */

function BrandingPreview({
  branding,
  name,
}: {
  branding: RestaurantBranding;
  name: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-terracotta/20 overflow-hidden">
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold bg-cream/50 px-3 py-2 border-b border-terracotta/15">
        Aperçu
      </div>
      <div
        className="p-6 transition-colors"
        style={{
          background: branding.background_color || "#fdf6e3",
          color: branding.primary_color || "#5b3a29",
        }}
      >
        <h3
          className="text-2xl font-bold mb-2"
          style={{
            fontFamily: branding.font_display
              ? `${branding.font_display}, serif`
              : "var(--font-display, serif)",
          }}
        >
          {name}
        </h3>
        <p className="text-sm opacity-80 mb-4">
          Bienvenue chez {name}. Carte du jour disponible.
        </p>
        <button
          type="button"
          className="px-5 py-2.5 rounded-full text-cream text-sm font-bold transition active:scale-95"
          style={{ background: branding.accent_color || "#b8922f" }}
        >
          Commander
        </button>
      </div>
    </div>
  );
}
