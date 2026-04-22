"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   PROGRAMME FIDÉLITÉ — Landing publique
   Premium, mobile-first, éditorial.
   ═══════════════════════════════════════════════════════════ */

type EnrollStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; cardNumber: string }
  | { kind: "error"; message: string };

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Comment fonctionne le programme de fidélité ?",
    a: "Rien de plus simple : inscrivez-vous en moins d'une minute, présentez votre carte à chaque visite pour obtenir un tampon, et à la 5e pizza, nous vous en offrons une — maison, au feu de bois, comme d'habitude.",
  },
  {
    q: "Faut-il télécharger une application ?",
    a: "Non. Votre carte est une page web que vous pouvez ajouter à l'écran d'accueil de votre téléphone pour la retrouver comme une vraie application, sans installation.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Nous n'enregistrons que les informations strictement nécessaires (nom, téléphone, email optionnel) pour gérer vos tampons. Aucun partage, aucune publicité. Vous pouvez demander la suppression à tout moment.",
  },
  {
    q: "Quelles pizzas sont éligibles à la récompense ?",
    a: "Toutes les pizzas de notre carte sont éligibles, à l'exception des pizzas sur mesure hors carte. La récompense est valable sur place ou à emporter.",
  },
  {
    q: "Puis-je cumuler plusieurs tampons en une visite ?",
    a: "Un tampon est remis par visite, quel que soit le nombre de pizzas commandées. L'idée est de récompenser votre fidélité, pas le volume d'une seule commande.",
  },
  {
    q: "La récompense est-elle cumulable avec d'autres offres ?",
    a: "La pizza offerte ne se cumule pas avec d'autres promotions ou menus en cours. Elle reste valable 3 mois à partir du moment où vous complétez votre carte.",
  },
];

/* ═══ Validation helpers ═══ */
function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Merci d'indiquer votre nom complet";
  if (trimmed.length > 60) return "Le nom est trop long";
  return null;
}

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Le téléphone est obligatoire";
  if (!/^[+]?[\d\s().-]{6,20}$/.test(trimmed))
    return "Numéro de téléphone invalide";
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null; // optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Email invalide";
  return null;
}

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
export default function FidelitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<{
    name?: boolean;
    phone?: boolean;
    email?: boolean;
  }>({});
  const [status, setStatus] = useState<EnrollStatus>({ kind: "idle" });

  const errors = useMemo(
    () => ({
      name: validateName(name),
      phone: validatePhone(phone),
      email: validateEmail(email),
    }),
    [name, phone, email]
  );

  const isValid = !errors.name && !errors.phone && !errors.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (!isValid || status.kind === "loading") return;

    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data?.error || "Une erreur est survenue, merci de réessayer.",
        });
        return;
      }
      setStatus({ kind: "success", cardNumber: data.card_number });
    } catch {
      setStatus({
        kind: "error",
        message: "Impossible de contacter le serveur. Vérifiez votre connexion.",
      });
    }
  };

  return (
    <div className="bg-cream min-h-screen">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brown via-brown to-brown/95 text-cream">
        {/* Subtle gold patterns */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #E8C97A 0%, transparent 40%), radial-gradient(circle at 80% 70%, #B8922F 0%, transparent 50%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
          aria-hidden="true"
        />

        {/* Back link */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cream/70 hover:text-gold-light transition-colors text-sm font-medium group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour au site
          </Link>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-24 sm:pt-20 sm:pb-32 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-script)] text-gold-light text-3xl sm:text-4xl mb-4"
          >
            Programme Fidélité
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-balance mb-8"
          >
            Récompensons{" "}
            <span className="italic text-gold-light">vos visites</span>
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-24 h-[2px] bg-gold mx-auto mb-8 origin-center"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-cream/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          >
            Une carte simple, zéro application à installer.
            <br className="hidden sm:block" />
            Une pizza offerte toutes les 5 visites. C&apos;est tout.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-10"
          >
            <a
              href="#inscription"
              className="inline-flex items-center gap-3 bg-gold hover:bg-gold-light text-brown font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl shadow-gold/30 hover:shadow-gold-light/40 hover:-translate-y-0.5"
            >
              Recevoir ma carte
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </motion.div>
        </div>

        {/* Bottom curve */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-cream"
          style={{
            clipPath: "ellipse(75% 100% at 50% 100%)",
          }}
          aria-hidden="true"
        />
      </section>

      {/* ═══════════ 3-STEP EXPLAINER ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="font-[family-name:var(--font-script)] text-gold text-2xl sm:text-3xl mb-3">
              Comment ça marche
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Trois étapes, rien de plus
            </h2>
          </motion.div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                n: "1",
                title: "Inscrivez-vous",
                body: "Un prénom, un numéro — et votre carte numérique est prête en 10 secondes.",
              },
              {
                n: "2",
                title: "Scannez à chaque visite",
                body: "Présentez le QR code de votre carte à votre serveur. Il ajoute un tampon en un instant.",
              },
              {
                n: "3",
                title: "Offerte à la 5e pizza",
                body: "Au cinquième tampon, nous vous offrons la pizza de votre choix. Simple, généreux.",
              },
            ].map((step, i) => (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative"
              >
                <div className="flex flex-col items-start">
                  <span
                    className="font-[family-name:var(--font-display)] text-[7rem] sm:text-[8rem] leading-none font-bold text-gold/25 tracking-tighter"
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-brown text-2xl sm:text-3xl font-bold mt-[-1.5rem] sm:mt-[-2rem] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-brown-light leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══════════ ENROLLMENT CARD ═══════════ */}
      <section id="inscription" className="relative py-20 sm:py-28 bg-linen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white-warm rounded-[2rem] shadow-2xl shadow-brown/10 border border-terracotta/20 overflow-hidden"
          >
            {/* Decorative top band */}
            <div className="h-2 bg-gradient-to-r from-gold via-gold-light to-gold" />

            <div className="p-8 sm:p-12">
              <p className="font-[family-name:var(--font-script)] text-gold text-xl sm:text-2xl mb-2">
                Votre carte
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-4xl font-bold mb-3">
                Rejoignez le programme
              </h2>
              <p className="text-brown-light leading-relaxed mb-8">
                Inscription gratuite. Aucun engagement. Votre carte est prête
                dans quelques secondes.
              </p>

              <AnimatePresence mode="wait">
                {status.kind === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: 0.1,
                      }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/15 flex items-center justify-center"
                    >
                      <svg
                        className="w-10 h-10 text-gold"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                    <h3 className="font-[family-name:var(--font-display)] text-brown text-2xl sm:text-3xl font-bold mb-3">
                      Votre carte est prête !
                    </h3>
                    <p className="text-brown-light mb-8">
                      Numéro de carte :{" "}
                      <span className="font-mono font-bold text-brown">
                        {status.cardNumber}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/fidelite/carte/${status.cardNumber}`)
                      }
                      className="inline-flex items-center gap-3 bg-brown hover:bg-brown-light text-cream font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl shadow-brown/30 hover:-translate-y-0.5"
                    >
                      Découvrez-la
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-5"
                  >
                    <Field
                      id="loyalty-name"
                      label="Prénom et nom"
                      required
                      value={name}
                      error={touched.name ? errors.name : null}
                      onChange={(v) => setName(v)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      autoComplete="name"
                      placeholder="Sophie Martin"
                    />
                    <Field
                      id="loyalty-phone"
                      label="Téléphone"
                      required
                      type="tel"
                      value={phone}
                      error={touched.phone ? errors.phone : null}
                      onChange={(v) => setPhone(v)}
                      onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                      autoComplete="tel"
                      placeholder="06 12 34 56 78"
                      inputMode="tel"
                    />
                    <Field
                      id="loyalty-email"
                      label="Email (facultatif)"
                      type="email"
                      value={email}
                      error={touched.email ? errors.email : null}
                      onChange={(v) => setEmail(v)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      autoComplete="email"
                      placeholder="sophie@example.com"
                      inputMode="email"
                    />

                    {status.kind === "error" && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red bg-red/10 border border-red/20 text-sm px-4 py-3 rounded-xl"
                        role="alert"
                      >
                        {status.message}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={status.kind === "loading"}
                      className="w-full inline-flex items-center justify-center gap-3 bg-brown hover:bg-brown-light disabled:opacity-60 disabled:cursor-not-allowed text-cream font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl shadow-brown/20 active:scale-[0.99]"
                    >
                      {status.kind === "loading" ? (
                        <>
                          <svg
                            className="animate-spin w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Création de votre carte…
                        </>
                      ) : (
                        <>
                          Obtenir ma carte
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </>
                      )}
                    </button>

                    <p className="text-xs text-brown-light/70 leading-relaxed text-center mt-4">
                      Vos données sont utilisées uniquement pour gérer votre
                      carte. Aucune publicité, aucun partage. Suppression sur
                      simple demande.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ BENEFITS ═══════════ */}
      <section className="relative py-20 sm:py-28 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="font-[family-name:var(--font-script)] text-gold text-xl sm:text-2xl mb-3"
              >
                Pourquoi s&apos;inscrire
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-balance"
              >
                Un merci sincère à nos habitués
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-brown-light leading-relaxed"
              >
                Chaque visite compte. Ce programme est notre manière de vous
                remercier pour votre confiance, en récompensant les moments que
                vous partagez avec nous autour d&apos;une pizza au feu de bois.
              </motion.p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Sans application",
                  body: "Pas d'installation. Votre carte s'ajoute à l'écran d'accueil en deux gestes.",
                },
                {
                  title: "Gratuit, pour toujours",
                  body: "Zéro engagement, zéro abonnement. Juste un merci pour votre fidélité.",
                },
                {
                  title: "Récompense réelle",
                  body: "Une pizza offerte, pas une remise symbolique ou un coupon conditionnel.",
                },
                {
                  title: "Confidentiel",
                  body: "Vos données restent chez nous. Aucun partage, aucune publicité.",
                },
              ].map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="bg-white-warm rounded-2xl p-6 border border-terracotta/20 hover:border-gold/40 transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center mb-4">
                    <span className="w-2 h-2 rounded-full bg-gold" />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-brown text-xl font-bold mb-2">
                    {b.title}
                  </h3>
                  <p className="text-brown-light text-sm leading-relaxed">
                    {b.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="relative py-20 sm:py-28 bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="font-[family-name:var(--font-script)] text-gold text-2xl mb-3">
              Questions fréquentes
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-brown text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Tout ce qu&apos;il faut savoir
            </h2>
          </motion.div>

          <dl className="divide-y divide-terracotta/25 border-y border-terracotta/25">
            {FAQ_ITEMS.map((item, i) => (
              <FaqRow key={item.q} q={item.q} a={item.a} index={i} />
            ))}
          </dl>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative py-20 sm:py-28 bg-brown text-cream overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, #E8C97A 0%, transparent 45%)",
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-2xl sm:text-3xl mb-3">
            Prêt(e) ?
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold mb-6 text-balance">
            La première pizza offerte n&apos;attend plus que vous
          </h2>
          <p className="text-cream/75 mb-10 max-w-xl mx-auto">
            Inscription en moins d&apos;une minute. Votre carte numérique est
            prête immédiatement.
          </p>
          <a
            href="#inscription"
            className="inline-flex items-center gap-3 bg-gold hover:bg-gold-light text-brown font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl shadow-gold/30 hover:-translate-y-0.5"
          >
            Je crée ma carte
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM FIELD
   ═══════════════════════════════════════════════════════════ */
function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  placeholder,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error: string | null | undefined;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs uppercase tracking-widest text-brown-light font-semibold mb-2 block">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-4 py-3 rounded-xl border bg-white text-brown placeholder:text-brown-light/40 outline-none transition-all duration-200 ${
          error
            ? "border-red focus:border-red focus:ring-2 focus:ring-red/20"
            : "border-terracotta/30 focus:border-gold focus:ring-2 focus:ring-gold/20"
        }`}
      />
      {error && (
        <motion.span
          id={`${id}-error`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="block text-red text-xs mt-2"
        >
          {error}
        </motion.span>
      )}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════
   FAQ ROW
   ═══════════════════════════════════════════════════════════ */
function FaqRow({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
    >
      <dt>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full text-left flex items-center justify-between gap-6 py-5 group"
        >
          <span className="font-[family-name:var(--font-display)] text-brown text-lg sm:text-xl font-bold leading-snug group-hover:text-red transition-colors">
            {q}
          </span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 w-8 h-8 rounded-full border border-brown/20 flex items-center justify-center text-brown group-hover:border-gold group-hover:text-gold transition-colors"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </motion.span>
        </button>
      </dt>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dd
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-brown-light leading-relaxed pb-5 pr-12">{a}</p>
          </motion.dd>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
