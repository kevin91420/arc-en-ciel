"use client";

import { useMemo, useState, FormEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { OliveBranch } from "./Decorations";

/* ═══════════════════════════════════════════════════════════
   RESERVATION — Form section wired to /api/reservations
   ═══════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Lunch 11:30-14:30 + Dinner 18:30-22:00 every 30 min */
const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  const push = (startH: number, startM: number, endH: number, endM: number) => {
    let h = startH;
    let m = startM;
    while (h < endH || (h === endH && m <= endM)) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      m += 30;
      if (m >= 60) {
        m -= 60;
        h += 1;
      }
    }
  };
  push(11, 30, 14, 30);
  push(18, 30, 22, 0);
  return slots;
})();

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; id?: string }
  | { status: "error"; message: string };

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maxDateISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Light French phone validation: 10 digits starting with 0, or +33... */
function isValidFrenchPhone(raw: string): boolean {
  const digits = raw.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(digits)) return true;
  if (/^\+33\d{9}$/.test(digits)) return true;
  return false;
}

export default function Reservation() {
  const minDate = useMemo(todayISO, []);
  const maxDate = useMemo(maxDateISO, []);

  const [date, setDate] = useState<string>(minDate);
  const [time, setTime] = useState<string>("19:30");
  const [guests, setGuests] = useState<number>(2);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [occasion, setOccasion] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const decGuests = () => setGuests((g) => Math.max(1, g - 1));
  const incGuests = () => setGuests((g) => Math.min(20, g + 1));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValidFrenchPhone(phone)) {
      setPhoneError("Numéro de téléphone invalide (ex : 06 12 34 56 78).");
      return;
    }
    setPhoneError(null);

    setSubmit({ status: "loading" });

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
          date,
          time,
          guests,
          special_occasion: occasion.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSubmit({
          status: "error",
          message:
            data?.error ||
            "Un problème est survenu. Merci de réessayer ou d'appeler le restaurant.",
        });
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string };
      setSubmit({ status: "success", id: data.id });
    } catch {
      setSubmit({
        status: "error",
        message:
          "Connexion impossible. Vérifiez votre réseau ou appelez-nous directement.",
      });
    }
  };

  return (
    <section
      id="reserver"
      aria-labelledby="reserver-heading"
      className="relative overflow-hidden bg-brown bg-paper py-20 sm:py-28"
    >
      {/* Decorative warm aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-red/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* ─── Left: image + copy ─── */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="text-cream"
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.1, duration: 0.7, ease: EASE }}
              className="font-[family-name:var(--font-script)] text-gold-light text-2xl sm:text-3xl mb-2"
            >
              Une soirée chez nous
            </motion.p>
            <motion.h2
              id="reserver-heading"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.15, duration: 0.8, ease: EASE }}
              className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold text-balance leading-[1.05] mb-6"
            >
              Réserver{" "}
              <span className="italic text-gold-light">votre table</span>
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
              className="origin-left h-[2px] w-24 bg-gold mb-6"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
              className="text-cream/80 text-base sm:text-lg leading-relaxed mb-8 max-w-xl"
            >
              Parce qu&apos;un bon repas se partage sans attendre, réservez
              votre table en quelques clics. Nous vous confirmons par téléphone
              sous deux heures, et votre place vous attend — pizza au feu de
              bois, terrasse d&apos;été, ou coin intime selon votre envie.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.45, duration: 0.8, ease: EASE }}
              className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-gold/20"
            >
              <div className="relative aspect-[4/3] sm:aspect-[5/4]">
                <Image
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=900&fit=crop&q=75"
                  alt="Table dressée dans l'ambiance chaleureuse de L'Arc en Ciel"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brown/60 via-brown/10 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-[family-name:var(--font-script)] text-gold-light text-xl leading-none">
                      Ambiance
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-white-warm text-2xl font-bold">
                      Méditerranéenne
                    </p>
                  </div>
                  <OliveBranch className="w-14 text-gold-light/70" />
                </div>
              </div>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
              className="mt-6 grid grid-cols-3 gap-3 text-center"
            >
              {[
                { k: "Confirmation", v: "< 2 h" },
                { k: "Capacité", v: "1 — 20" },
                { k: "Terrasse", v: "Été" },
              ].map((item) => (
                <li
                  key={item.k}
                  className="rounded-2xl bg-cream/[0.04] ring-1 ring-cream/10 py-3 px-2"
                >
                  <p className="text-[11px] uppercase tracking-widest text-cream/60">
                    {item.k}
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-gold-light text-lg font-bold">
                    {item.v}
                  </p>
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* ─── Right: form card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-cream text-brown shadow-2xl shadow-black/40 ring-1 ring-gold/20">
              {/* Corner ribbon */}
              <div className="absolute -top-3 left-6 bg-red text-white-warm text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg shadow-red/30">
                Réservation en ligne
              </div>

              <AnimatePresence mode="wait">
                {submit.status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="p-8 sm:p-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        damping: 12,
                        stiffness: 260,
                      }}
                      className="mx-auto w-20 h-20 rounded-full bg-[#1f8f5f]/10 ring-4 ring-[#1f8f5f]/20 flex items-center justify-center mb-6"
                    >
                      <svg
                        className="w-10 h-10 text-[#1f8f5f]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                    <h3 className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown mb-3">
                      Réservation envoyée !
                    </h3>
                    <p className="text-brown-light leading-relaxed mb-6">
                      Nous vous confirmerons par téléphone sous 2h. Merci de
                      votre confiance.
                    </p>
                    <div className="inline-flex items-center gap-3 bg-brown/5 rounded-full px-5 py-3 text-sm text-brown-light mb-6">
                      <span className="font-semibold text-brown">
                        {new Date(date + "T00:00:00").toLocaleDateString(
                          "fr-FR",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          }
                        )}
                      </span>
                      <span aria-hidden>•</span>
                      <span>{time}</span>
                      <span aria-hidden>•</span>
                      <span>
                        {guests} {guests > 1 ? "couverts" : "couvert"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmit({ status: "idle" });
                        setName("");
                        setPhone("");
                        setEmail("");
                        setOccasion("");
                      }}
                      className="block mx-auto text-sm font-semibold text-red hover:text-red-dark transition-colors underline underline-offset-4"
                    >
                      Faire une autre réservation
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={onSubmit}
                    className="p-6 sm:p-8 space-y-5"
                    noValidate
                  >
                    {/* Date + Time row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="res-date"
                          className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                        >
                          Date
                        </label>
                        <input
                          id="res-date"
                          type="date"
                          required
                          min={minDate}
                          max={maxDate}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="res-time"
                          className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                        >
                          Heure
                        </label>
                        <select
                          id="res-time"
                          required
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition appearance-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%226%22%20viewBox=%220%200%2010%206%22%3E%3Cpath%20fill=%22%235C3D2E%22%20d=%22M5%206L0%200h10z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Guests counter */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5">
                        Nombre de couverts
                      </label>
                      <div className="flex items-center justify-between gap-2 px-2 py-2 bg-white-warm border border-terracotta/30 rounded-xl">
                        <button
                          type="button"
                          onClick={decGuests}
                          disabled={guests <= 1}
                          aria-label="Retirer un couvert"
                          className="w-10 h-10 rounded-lg bg-brown text-cream font-bold text-lg flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center">
                          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown tabular-nums">
                            {guests}
                          </span>
                          <span className="block text-[11px] uppercase tracking-widest text-brown-light/70">
                            {guests > 1 ? "personnes" : "personne"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={incGuests}
                          disabled={guests >= 20}
                          aria-label="Ajouter un couvert"
                          className="w-10 h-10 rounded-lg bg-brown text-cream font-bold text-lg flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label
                        htmlFor="res-name"
                        className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                      >
                        Nom <span className="text-red">*</span>
                      </label>
                      <input
                        id="res-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Prénom et nom"
                        className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="res-phone"
                        className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                      >
                        Téléphone <span className="text-red">*</span>
                      </label>
                      <input
                        id="res-phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError(null);
                        }}
                        placeholder="06 12 34 56 78"
                        aria-invalid={!!phoneError}
                        aria-describedby={
                          phoneError ? "res-phone-err" : undefined
                        }
                        className={`w-full px-4 py-3 bg-white-warm border rounded-xl text-brown text-sm placeholder:text-brown-light/50 focus:outline-none focus:ring-2 transition ${
                          phoneError
                            ? "border-red focus:border-red focus:ring-red/20"
                            : "border-terracotta/30 focus:border-gold focus:ring-gold/20"
                        }`}
                      />
                      {phoneError && (
                        <p
                          id="res-phone-err"
                          className="mt-1.5 text-xs text-red font-medium"
                        >
                          {phoneError}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="res-email"
                        className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                      >
                        Email{" "}
                        <span className="font-normal text-brown-light/50 normal-case tracking-normal">
                          (optionnel)
                        </span>
                      </label>
                      <input
                        id="res-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.fr"
                        className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
                      />
                    </div>

                    {/* Occasion */}
                    <div>
                      <label
                        htmlFor="res-occasion"
                        className="block text-[11px] font-bold uppercase tracking-widest text-brown-light/80 mb-1.5"
                      >
                        Occasion spéciale ou allergie ?{" "}
                        <span className="font-normal text-brown-light/50 normal-case tracking-normal">
                          (optionnel)
                        </span>
                      </label>
                      <textarea
                        id="res-occasion"
                        rows={3}
                        maxLength={500}
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        placeholder="Anniversaire, allergie au gluten, fauteuil roulant…"
                        className="w-full px-4 py-3 bg-white-warm border border-terracotta/30 rounded-xl text-brown text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition resize-none"
                      />
                    </div>

                    {/* Error alert */}
                    <AnimatePresence>
                      {submit.status === "error" && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="flex items-start gap-3 bg-red/10 border border-red/30 text-red-dark rounded-xl p-4 text-sm"
                        >
                          <svg
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
                            />
                          </svg>
                          <p className="leading-snug">{submit.message}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submit.status === "loading"}
                      className="relative w-full bg-red hover:bg-red-dark text-white-warm font-bold text-base sm:text-lg py-4 rounded-full transition-all duration-300 shadow-xl shadow-red/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-3"
                    >
                      {submit.status === "loading" ? (
                        <>
                          <svg
                            className="w-5 h-5 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeOpacity="0.25"
                            />
                            <path
                              d="M22 12a10 10 0 01-10 10"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                          Envoi en cours…
                        </>
                      ) : (
                        <>
                          Réserver ma table
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-brown-light/60 text-center leading-relaxed pt-1">
                      En réservant, vous acceptez d&apos;être recontacté par
                      téléphone par notre équipe.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
