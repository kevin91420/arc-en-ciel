"use client";

/**
 * /onboarding — Wizard de configuration initiale.
 *
 * Public, ~30 min pour un nouveau restaurant. Au bout, le tenant a :
 *   - Sa carte pré-remplie depuis un preset sectoriel
 *   - Ses tables, son équipe, ses infos légales
 *   - L'app accessible depuis /admin
 *
 * Auto-redirect vers /admin si setup_completed === true.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PRESETS, type RestaurantType } from "@/lib/onboarding/presets";

type Step =
  | "welcome"
  | "type"
  | "identity"
  | "contact"
  | "legal"
  | "tables"
  | "staff"
  | "summary";

const STEPS: Step[] = [
  "welcome",
  "type",
  "identity",
  "contact",
  "legal",
  "tables",
  "staff",
  "summary",
];

const STEP_LABELS: Record<Step, string> = {
  welcome: "Bienvenue",
  type: "Type",
  identity: "Identité",
  contact: "Contact",
  legal: "Légal",
  tables: "Tables",
  staff: "Équipe",
  summary: "Récap",
};

interface StaffEntry {
  name: string;
  pin: string;
  role: "manager" | "server" | "chef";
}

const DEFAULT_STAFF: StaffEntry[] = [
  { name: "", pin: "", role: "manager" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySetup, setAlreadySetup] = useState<boolean | null>(null);

  /* ── Step 2 — Type ── */
  const [presetType, setPresetType] = useState<RestaurantType>("bistro");
  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetType)!,
    [presetType]
  );

  /* ── Step 3 — Identity ── */
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [colorBrand, setColorBrand] = useState("#2C1810");
  const [colorAccent, setColorAccent] = useState("#B8922F");
  const [colorSignature, setColorSignature] = useState("#C0392B");

  /* ── Step 4 — Contact ── */
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  /* ── Step 5 — Legal ── */
  const [legalName, setLegalName] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  /* ── Step 6 — Tables ── */
  const [tableCount, setTableCount] = useState(10);

  /* ── Step 7 — Staff ── */
  const [staff, setStaff] = useState<StaffEntry[]>(DEFAULT_STAFF);

  /* ── Detect setup state ── */
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAlreadySetup(Boolean(d?.setup_completed));
      })
      .catch(() => setAlreadySetup(false));
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  }, [step]);

  const goBack = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }, [step]);

  /* ── Validation per step ── */
  const canProceed = useMemo(() => {
    switch (step) {
      case "identity":
        return name.trim().length >= 2;
      case "contact":
        return true; /* all optional */
      case "legal":
        return true;
      case "tables":
        return tableCount >= 1 && tableCount <= 50;
      case "staff":
        return staff.some(
          (s) =>
            s.name.trim().length >= 2 && /^\d{4,8}$/.test(s.pin.trim())
        );
      default:
        return true;
    }
  }, [step, name, tableCount, staff]);

  /* ── Submit ── */
  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: presetType,
          name,
          tagline,
          logo_url: logoUrl,
          color_brand: colorBrand,
          color_accent: colorAccent,
          color_signature: colorSignature,
          phone,
          email,
          address,
          postal_code: postalCode,
          city,
          legal_name: legalName,
          siret,
          vat_number: vatNumber,
          table_count: tableCount,
          staff: staff
            .filter((s) => s.name && s.pin)
            .map((s) => ({ name: s.name, pin: s.pin, role: s.role })),
          keep_starter_menu: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      /* Onboarding terminé — push vers /admin/login (nouveau resto) ou /admin
       * (existant). Le user devra se connecter avec admin2026 par défaut. */
      router.push("/admin/login");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    presetType,
    name,
    tagline,
    logoUrl,
    colorBrand,
    colorAccent,
    colorSignature,
    phone,
    email,
    address,
    postalCode,
    city,
    legalName,
    siret,
    vatNumber,
    tableCount,
    staff,
    router,
  ]);

  if (alreadySetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brown-light">
        Chargement…
      </div>
    );
  }

  if (alreadySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white-warm rounded-3xl border border-terracotta/20 p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden>
            ✅
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
            Restaurant déjà configuré
          </h1>
          <p className="text-sm text-brown-light mt-2">
            Cette installation est déjà en service. Connecte-toi à
            l&apos;admin pour gérer ton restaurant.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 bg-brown hover:bg-brown-light text-cream font-bold py-3 rounded-full transition active:scale-95"
            >
              Accéder à l&apos;admin
            </Link>
            <Link
              href="/admin/parametres"
              className="text-xs text-brown-light hover:text-brown transition"
            >
              Modifier les paramètres
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream bg-noise">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-terracotta/15 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <p className="font-[family-name:var(--font-script)] text-gold text-xl">
            Bienvenue
          </p>
          <span className="text-xs uppercase tracking-[0.18em] text-brown-light/70 font-bold">
            Étape {stepIndex + 1} / {STEPS.length} · {STEP_LABELS[step]}
          </span>
          <div className="ml-auto w-32 sm:w-48 h-1 rounded-full bg-brown/10 overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full bg-gold rounded-full"
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === "welcome" && (
              <Welcome onStart={() => setStep("type")} />
            )}

            {step === "type" && (
              <TypePicker
                value={presetType}
                onChange={setPresetType}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "identity" && (
              <IdentityStep
                name={name}
                onName={setName}
                tagline={tagline}
                onTagline={setTagline}
                logoUrl={logoUrl}
                onLogoUrl={setLogoUrl}
                colorBrand={colorBrand}
                onColorBrand={setColorBrand}
                colorAccent={colorAccent}
                onColorAccent={setColorAccent}
                colorSignature={colorSignature}
                onColorSignature={setColorSignature}
                presetTagline={preset.pitch}
                canProceed={canProceed}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "contact" && (
              <ContactStep
                phone={phone}
                onPhone={setPhone}
                email={email}
                onEmail={setEmail}
                address={address}
                onAddress={setAddress}
                postalCode={postalCode}
                onPostalCode={setPostalCode}
                city={city}
                onCity={setCity}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "legal" && (
              <LegalStep
                legalName={legalName}
                onLegalName={setLegalName}
                siret={siret}
                onSiret={setSiret}
                vatNumber={vatNumber}
                onVatNumber={setVatNumber}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "tables" && (
              <TablesStep
                count={tableCount}
                onCount={setTableCount}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "staff" && (
              <StaffStep
                staff={staff}
                onStaff={setStaff}
                canProceed={canProceed}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === "summary" && (
              <SummaryStep
                preset={preset}
                name={name}
                tagline={tagline || preset.pitch}
                phone={phone}
                email={email}
                tableCount={tableCount}
                staffCount={
                  staff.filter(
                    (s) => s.name && /^\d{4,8}$/.test(s.pin)
                  ).length
                }
                submitting={submitting}
                error={error}
                onSubmit={submit}
                onBack={goBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Steps
   ════════════════════════════════════════════════════════════ */

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center max-w-xl mx-auto py-8">
      <p className="font-[family-name:var(--font-script)] text-gold text-3xl mb-2">
        Bienvenue
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-brown leading-tight">
        Mettons ton restaurant en service en 5 minutes
      </h1>
      <p className="mt-5 text-brown-light text-base leading-relaxed">
        7 étapes simples. À la fin, tu auras une carte pré-remplie, ton plan
        de salle, ton équipe, et ton QR menu prêt à scanner. Tu pourras tout
        modifier à tout moment depuis l&apos;admin.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3 text-left">
        {[
          { icon: "🎨", label: "Identité visuelle" },
          { icon: "📍", label: "Coordonnées légales" },
          { icon: "🍽", label: "Carte pré-remplie" },
          { icon: "👥", label: "Équipe + PINs" },
          { icon: "🪑", label: "Plan de salle" },
          { icon: "📱", label: "QR menu actif" },
        ].map((b) => (
          <li
            key={b.label}
            className="flex items-center gap-2 text-sm text-brown-light"
          >
            <span aria-hidden>{b.icon}</span>
            {b.label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-10 inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream font-bold px-8 py-3.5 rounded-full transition active:scale-95 text-base"
      >
        Commencer →
      </button>

      <p className="mt-6 text-xs text-brown-light/70">
        Tu peux interrompre et reprendre — rien n&apos;est sauvegardé tant
        que tu cliques « Terminer ».
      </p>
    </div>
  );
}

function TypePicker({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: RestaurantType;
  onChange: (v: RestaurantType) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="Quel type de restaurant ?"
        subtitle="Cela détermine la carte de départ et les fonctionnalités activées. Tu pourras tout changer ensuite."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {PRESETS.map((p) => {
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={[
                "text-left rounded-2xl border-2 p-5 transition",
                selected
                  ? "bg-gold/15 border-gold shadow-md"
                  : "bg-white-warm border-terracotta/20 hover:border-terracotta/50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0" aria-hidden>
                  {p.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight">
                    {p.label}
                  </h3>
                  <p className="text-xs text-brown-light/80 mt-1">
                    {p.pitch}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.categories.slice(0, 4).map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] bg-brown/5 text-brown-light px-2 py-0.5 rounded"
                      >
                        {c.icon} {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <NavButtons
        onNext={onNext}
        onBack={onBack}
        nextLabel="Continuer"
        backLabel="← Retour"
        canProceed={true}
      />
    </div>
  );
}

function IdentityStep(props: {
  name: string;
  onName: (v: string) => void;
  tagline: string;
  onTagline: (v: string) => void;
  logoUrl: string;
  onLogoUrl: (v: string) => void;
  colorBrand: string;
  onColorBrand: (v: string) => void;
  colorAccent: string;
  onColorAccent: (v: string) => void;
  colorSignature: string;
  onColorSignature: (v: string) => void;
  presetTagline: string;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="L'identité de ton restaurant"
        subtitle="Le nom apparaîtra dans le POS, les tickets, l'addition et le QR menu."
      />
      <div className="space-y-5 mt-6">
        <Field label="Nom du restaurant" required>
          <input
            type="text"
            value={props.name}
            onChange={(e) => props.onName(e.target.value)}
            placeholder="L'Arc en Ciel"
            maxLength={80}
            autoFocus
            className={fieldCls}
          />
        </Field>

        <Field label="Tagline (optionnel)">
          <input
            type="text"
            value={props.tagline}
            onChange={(e) => props.onTagline(e.target.value)}
            placeholder={props.presetTagline}
            maxLength={120}
            className={fieldCls}
          />
        </Field>

        <Field label="Logo (URL d'image)" hint="Lien direct PNG/SVG (Cloudinary, Imgur, votre site...)">
          <input
            type="url"
            value={props.logoUrl}
            onChange={(e) => props.onLogoUrl(e.target.value)}
            placeholder="https://cdn.example.com/logo.png"
            className={fieldCls}
          />
          {props.logoUrl && (
            <div className="mt-2 inline-flex items-center gap-3 p-2 rounded-lg bg-cream border border-terracotta/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.logoUrl}
                alt="Aperçu"
                className="w-12 h-12 object-contain"
              />
              <span className="text-xs text-brown-light">Aperçu</span>
            </div>
          )}
        </Field>

        <Field
          label="Couleurs de marque"
          hint="Ces 3 couleurs se retrouvent partout — boutons, accents, en-tête."
        >
          <div className="grid grid-cols-3 gap-3">
            <ColorField
              label="Marque"
              value={props.colorBrand}
              onChange={props.onColorBrand}
            />
            <ColorField
              label="Accent"
              value={props.colorAccent}
              onChange={props.onColorAccent}
            />
            <ColorField
              label="Action"
              value={props.colorSignature}
              onChange={props.onColorSignature}
            />
          </div>
        </Field>
      </div>
      <NavButtons
        onNext={props.onNext}
        onBack={props.onBack}
        canProceed={props.canProceed}
      />
    </div>
  );
}

function ContactStep(props: {
  phone: string;
  onPhone: (v: string) => void;
  email: string;
  onEmail: (v: string) => void;
  address: string;
  onAddress: (v: string) => void;
  postalCode: string;
  onPostalCode: (v: string) => void;
  city: string;
  onCity: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="Coordonnées du restaurant"
        subtitle="Apparaissent sur l'addition imprimée, le QR menu et la fiche restaurant. Tout est optionnel."
      />
      <div className="space-y-5 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Téléphone">
            <input
              type="tel"
              value={props.phone}
              onChange={(e) => props.onPhone(e.target.value)}
              placeholder="01 64 54 00 30"
              className={fieldCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={props.email}
              onChange={(e) => props.onEmail(e.target.value)}
              placeholder="contact@restaurant.fr"
              className={fieldCls}
            />
          </Field>
        </div>

        <Field label="Adresse">
          <input
            type="text"
            value={props.address}
            onChange={(e) => props.onAddress(e.target.value)}
            placeholder="36 rue de l'Église"
            className={fieldCls}
          />
        </Field>

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label="Code postal">
            <input
              type="text"
              value={props.postalCode}
              onChange={(e) => props.onPostalCode(e.target.value)}
              placeholder="91420"
              className={fieldCls}
            />
          </Field>
          <Field label="Ville">
            <input
              type="text"
              value={props.city}
              onChange={(e) => props.onCity(e.target.value)}
              placeholder="Morangis"
              className={fieldCls}
            />
          </Field>
        </div>
      </div>
      <NavButtons
        onNext={props.onNext}
        onBack={props.onBack}
        canProceed={true}
      />
    </div>
  );
}

function LegalStep(props: {
  legalName: string;
  onLegalName: (v: string) => void;
  siret: string;
  onSiret: (v: string) => void;
  vatNumber: string;
  onVatNumber: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="Informations légales"
        subtitle="Apparaissent en bas des additions imprimées et du Z de fin de service. Tout est optionnel pour démarrer."
      />
      <div className="space-y-5 mt-6">
        <Field label="Raison sociale" hint="Si différente du nom commercial.">
          <input
            type="text"
            value={props.legalName}
            onChange={(e) => props.onLegalName(e.target.value)}
            placeholder="SARL L'Arc en Ciel"
            className={fieldCls}
          />
        </Field>
        <Field label="SIRET">
          <input
            type="text"
            value={props.siret}
            onChange={(e) => props.onSiret(e.target.value)}
            placeholder="123 456 789 00012"
            className={fieldCls}
          />
        </Field>
        <Field label="N° TVA intracommunautaire">
          <input
            type="text"
            value={props.vatNumber}
            onChange={(e) => props.onVatNumber(e.target.value)}
            placeholder="FR12 345678901"
            className={fieldCls}
          />
        </Field>
      </div>
      <NavButtons
        onNext={props.onNext}
        onBack={props.onBack}
        canProceed={true}
        nextLabel="Continuer"
        skipLabel="Plus tard"
      />
    </div>
  );
}

function TablesStep({
  count,
  onCount,
  onNext,
  onBack,
}: {
  count: number;
  onCount: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="Combien de tables ?"
        subtitle="Tu pourras les renommer, les regrouper par zone et dessiner ton plan visuel ensuite."
      />
      <div className="mt-8 flex flex-col items-center">
        <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-brown tabular-nums">
          {count}
        </div>
        <p className="text-sm text-brown-light mt-2">
          {count === 1 ? "table" : "tables"}
        </p>

        <div className="mt-6 w-full max-w-md">
          <input
            type="range"
            min={1}
            max={50}
            value={count}
            onChange={(e) => onCount(Number(e.target.value))}
            className="w-full h-2 rounded-full bg-brown/10 accent-gold cursor-pointer"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-brown-light/60 font-bold mt-2">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-w-md">
          {Array.from({ length: Math.min(count, 50) }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded bg-cream border border-terracotta/30 text-[10px] text-brown-light flex items-center justify-center font-bold tabular-nums"
            >
              T{i + 1}
            </div>
          ))}
        </div>
      </div>
      <NavButtons onNext={onNext} onBack={onBack} canProceed={count >= 1} />
    </div>
  );
}

function StaffStep({
  staff,
  onStaff,
  canProceed,
  onNext,
  onBack,
}: {
  staff: StaffEntry[];
  onStaff: (s: StaffEntry[]) => void;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  function update(idx: number, patch: Partial<StaffEntry>) {
    onStaff(staff.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function add() {
    onStaff([...staff, { name: "", pin: "", role: "server" }]);
  }
  function remove(idx: number) {
    onStaff(staff.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <StepHead
        title="Ton équipe"
        subtitle="Au moins le manager pour démarrer. Le PIN sert à se connecter au POS depuis la tablette."
      />
      <ul className="mt-6 space-y-3">
        {staff.map((s, i) => (
          <li
            key={i}
            className="grid grid-cols-1 sm:grid-cols-[1.5fr_120px_1fr_auto] gap-2 items-center bg-white-warm border border-terracotta/20 rounded-xl p-3"
          >
            <Field label="Prénom">
              <input
                type="text"
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Sophie"
                maxLength={60}
                className={fieldCls}
              />
            </Field>
            <Field label="PIN (4-8 chiffres)">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={s.pin}
                onChange={(e) =>
                  update(i, {
                    pin: e.target.value.replace(/\D/g, "").slice(0, 8),
                  })
                }
                placeholder="2024"
                className={`${fieldCls} font-mono tabular-nums`}
              />
            </Field>
            <Field label="Rôle">
              <select
                value={s.role}
                onChange={(e) =>
                  update(i, {
                    role: e.target.value as StaffEntry["role"],
                  })
                }
                className={fieldCls}
              >
                <option value="manager">Manager</option>
                <option value="server">Serveur</option>
                <option value="chef">Chef</option>
              </select>
            </Field>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={staff.length === 1}
              className="self-end justify-self-end w-9 h-9 rounded-full text-brown-light hover:text-red hover:bg-red/10 transition disabled:opacity-30"
              aria-label="Supprimer"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brown hover:text-gold"
      >
        <span className="text-lg leading-none">+</span> Ajouter un serveur
      </button>

      {!canProceed && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded-lg p-2">
          Au moins un membre avec un nom de 2 caractères et un PIN à 4-8
          chiffres.
        </p>
      )}

      <NavButtons
        onNext={onNext}
        onBack={onBack}
        canProceed={canProceed}
      />
    </div>
  );
}

function SummaryStep({
  preset,
  name,
  tagline,
  phone,
  email,
  tableCount,
  staffCount,
  submitting,
  error,
  onSubmit,
  onBack,
}: {
  preset: (typeof PRESETS)[number];
  name: string;
  tagline: string;
  phone: string;
  email: string;
  tableCount: number;
  staffCount: number;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHead
        title="Tout est prêt 🚀"
        subtitle="Récapitulatif avant de générer ton restaurant. Tu pourras tout modifier ensuite."
      />

      <div className="mt-6 rounded-2xl bg-white-warm border border-terracotta/20 p-6 space-y-5">
        <div className="text-center pb-4 border-b border-terracotta/15">
          <p className="text-3xl mb-1" aria-hidden>
            {preset.emoji}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
            {name}
          </h3>
          <p className="text-sm text-brown-light italic">{tagline}</p>
        </div>

        <ul className="space-y-2 text-sm">
          <SummaryRow label="Type" value={preset.label} icon={preset.emoji} />
          <SummaryRow
            label="Catégories"
            value={`${preset.categories.length} (${preset.categories.map((c) => c.title).join(", ")})`}
            icon="🍽"
          />
          <SummaryRow
            label="Plats de démarrage"
            value={`${preset.items.length} pré-remplis`}
            icon="🥘"
          />
          <SummaryRow
            label="Stations cuisine"
            value={preset.stations.length.toString()}
            icon="👨‍🍳"
          />
          <SummaryRow
            label="Tables"
            value={tableCount.toString()}
            icon="🪑"
          />
          <SummaryRow
            label="Membres équipe"
            value={staffCount.toString()}
            icon="👥"
          />
          {phone && <SummaryRow label="Téléphone" value={phone} icon="📞" />}
          {email && <SummaryRow label="Email" value={email} icon="✉" />}
        </ul>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-dark bg-red/10 border border-red/30 rounded-lg p-3">
          {error}
        </p>
      )}

      <p className="mt-6 text-xs text-brown-light/80 text-center">
        En cliquant « Terminer », ton restaurant sera initialisé. Tu seras
        redirigé vers la page de connexion admin (mot de passe par défaut :
        <code className="font-mono bg-cream px-1.5 py-0.5 rounded ml-1">
          admin2026
        </code>
        — change-le immédiatement).
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="h-12 px-5 text-sm text-brown-light hover:text-brown transition"
        >
          ← Modifier
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 h-12 rounded-full bg-brown text-cream font-bold text-base hover:bg-brown-light transition disabled:opacity-50 active:scale-95 inline-flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="inline-block w-4 h-4 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />
              Configuration en cours…
            </>
          ) : (
            <>🎉 Terminer et démarrer</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Primitives
   ════════════════════════════════════════════════════════════ */

const fieldCls =
  "w-full px-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/40";

function StepHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-brown leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm text-brown-light leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] text-brown-light/70">{hint}</p>
      )}
    </div>
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
      <label className="block relative w-full h-16 rounded-lg overflow-hidden border border-terracotta/30 cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span
          className="absolute inset-0"
          style={{ backgroundColor: value }}
        />
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`${fieldCls} mt-1 font-mono text-xs uppercase`}
      />
    </div>
  );
}

function NavButtons({
  onNext,
  onBack,
  canProceed,
  nextLabel = "Continuer",
  backLabel = "← Retour",
  skipLabel,
}: {
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="h-12 px-4 text-sm text-brown-light hover:text-brown transition"
      >
        {backLabel}
      </button>
      <div className="flex items-center gap-2">
        {skipLabel && (
          <button
            type="button"
            onClick={onNext}
            className="h-12 px-4 text-sm text-brown-light hover:text-brown transition"
          >
            {skipLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="h-12 px-7 rounded-full bg-brown text-cream font-bold text-sm hover:bg-brown-light transition disabled:opacity-40 active:scale-95"
        >
          {nextLabel} →
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <li className="flex items-center gap-3 text-brown">
      <span aria-hidden className="text-base flex-shrink-0">
        {icon}
      </span>
      <span className="text-brown-light/80 text-xs uppercase tracking-wider font-bold w-32 flex-shrink-0">
        {label}
      </span>
      <span className="font-semibold flex-1 break-words">{value}</span>
    </li>
  );
}
