"use client";

import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Design tokens (inline) — kept as strings for Framer props
   Palette: cream #FDF8F0 · white-warm #FFFDF9 · brown #2C1810
            gold #B8922F · red #C0392B · terracotta #C4956A
   ───────────────────────────────────────────────────────────── */

const DEMO_URL = "https://arc-en-ciel-theta.vercel.app";

const MODULES = [
  {
    tag: "01",
    emoji: "🌍",
    name: "Site Vitrine",
    value:
      "Un site Next.js 16 taillé pour le SEO local et la conversion directe.",
    features: [
      "One-page SEO-first, Lighthouse 95+",
      "Bouton réservation intégré",
      "Editable depuis Sanity Studio",
      "Déployé sur Vercel (CDN mondial)",
    ],
    href: `${DEMO_URL}`,
    accent: "var(--color-red)",
  },
  {
    tag: "02",
    emoji: "📖",
    name: "Carte Éditoriale",
    value:
      "Une carte web qui ressemble à un magazine gastronomique. Print-ready A4 inclus.",
    features: [
      "Layout magazine, typo Playfair",
      "Version imprimable @page A4",
      "SEO riche (ItemList schema.org)",
      "Mise à jour en 2 clics",
    ],
    href: `${DEMO_URL}/carte`,
    accent: "var(--color-gold)",
  },
  {
    tag: "03",
    emoji: "📱",
    name: "Menu QR mobile",
    value:
      "Le client scanne le QR à sa table. Recherche, filtres, favoris, appel serveur.",
    features: [
      "Scan à table (param table=N)",
      "Search instantané + filtres allergènes",
      "Favoris persistants (localStorage)",
      "Bouton “Appeler le serveur” → admin",
    ],
    href: `${DEMO_URL}/m/carte?table=1`,
    accent: "var(--color-terracotta-deep)",
  },
  {
    tag: "04",
    emoji: "📊",
    name: "CRM unifié",
    value:
      "Toutes vos résas dans un seul dashboard. TheFork, Google, Deliveroo, site.",
    features: [
      "Webhooks TheFork / Google Reserve",
      "Fiches clients auto (taux de retour)",
      "Calendrier hebdo + exports CSV",
      "Staff multi-comptes",
    ],
    href: `${DEMO_URL}/admin`,
    accent: "var(--color-red-dark)",
  },
  {
    tag: "05",
    emoji: "🎫",
    name: "Programme fidélité",
    value:
      "Carte digitale Apple-Wallet-like. Tampons, paliers, récompenses automatiques.",
    features: [
      "Inscription sans app (web)",
      "QR unique par client",
      "Scanner staff pour valider",
      "Récompenses auto (ex: 10e pizza offerte)",
    ],
    href: `${DEMO_URL}/fidelite`,
    accent: "var(--color-gold-light)",
  },
  {
    tag: "06",
    emoji: "✉️",
    name: "Emails automatiques",
    value:
      "Resend + React Email. Templates premium, délivrabilité pro.",
    features: [
      "Confirmation réservation",
      "Rappel J-1 automatique",
      "Récompense fidélité débloquée",
      "DKIM + SPF propres",
    ],
    href: null,
    accent: "var(--color-terracotta-deep)",
  },
] as const;

const PAIN_POINTS = [
  {
    k: "298€/mois",
    t: "5 abonnements mensuels différents",
    d: "TheFork 150€, Zelty 200€, Mailchimp 40€, un QR menu SaaS à 50€, Deliveroo plus une commission. Ça finit à plus de 10K€ par an. Chaque mois.",
  },
  {
    k: "3 dashboards",
    t: "Des résas éparpillées partout",
    d: "Le matin, vous ouvrez TheFork, Google My Business, vos emails et l’onglet Deliveroo. Vous recopiez à la main sur le carnet papier. C’est 2026.",
  },
  {
    k: "90%",
    t: "Pas de fidélisation",
    d: "Neuf clients sur dix ne reviennent jamais. Vous n’avez pas leur email, pas leur numéro, pas de quoi les rappeler. Chaque service, vous recommencez à zéro.",
  },
  {
    k: "< 60",
    t: "Un site web hors d’âge",
    d: "Wix, WordPress 2016, ou rien. Score Google 40 sur mobile, photos floues, bouton réservation qui ne marche pas. Votre carte papier est plus moderne que votre site.",
  },
];

const COMPARE_ROWS = [
  {
    feature: "Site web premium",
    thefork: false,
    zelty: false,
    innovo: "limité",
    us: true,
  },
  {
    feature: "CRM unifié (toutes sources)",
    thefork: "partiel",
    zelty: true,
    innovo: true,
    us: true,
  },
  {
    feature: "Menu QR mobile",
    thefork: false,
    zelty: "plugin",
    innovo: true,
    us: true,
  },
  {
    feature: "Programme fidélité",
    thefork: false,
    zelty: "add-on",
    innovo: true,
    us: true,
  },
  {
    feature: "Emails transactionnels",
    thefork: false,
    zelty: false,
    innovo: "basique",
    us: true,
  },
  {
    feature: "Webhooks ouverts",
    thefork: false,
    zelty: false,
    innovo: false,
    us: true,
  },
  {
    feature: "Vous êtes propriétaire du code",
    thefork: false,
    zelty: false,
    innovo: false,
    us: true,
  },
  {
    feature: "Abonnement mensuel",
    thefork: "150€",
    zelty: "200€",
    innovo: "300€",
    us: "0€",
  },
];

const FAQ = [
  {
    q: "Je suis déjà sur TheFork — je dois tout changer ?",
    a: "Non. TheFork garde ses clients fidèles, on branche juste un webhook pour que chaque réservation TheFork tombe automatiquement dans votre dashboard unifié. Vous gardez les deux mondes, sans double saisie.",
  },
  {
    q: "Qu’est-ce qui m’appartient vraiment ?",
    a: "Tout. Le code source (repo GitHub à votre nom), la base de données (Supabase sur votre compte), le domaine, le design, les clients collectés. Si demain vous coupez les ponts, vous gardez tout. Aucune clause de rachat.",
  },
  {
    q: "Combien de temps pour tout déployer ?",
    a: "48h pour la stack de base (site + menu QR + CRM), une semaine pour intégrer vos webhooks existants (TheFork, Google, Deliveroo) et la fidélité. Formation staff en visio (2h).",
  },
  {
    q: "Et si Vercel ferme ou Supabase change de prix ?",
    a: "Le code est portable. Vercel se remplace par Netlify, Cloudflare Pages ou un VPS en 2h. Supabase se migre vers un PostgreSQL auto-hébergé puisque c’est du Postgres standard. Pas de verrou propriétaire.",
  },
  {
    q: "Qui fait la maintenance ?",
    a: "Trois mois de support inclus (tickets + petites évolutions). Après, vous pouvez : (1) prolonger en forfait mensuel optionnel, (2) passer le repo à votre développeur, (3) ne rien faire — ça continue de tourner seul. Les dépendances sont scannées par Dependabot.",
  },
  {
    q: "Je peux modifier le menu moi-même ?",
    a: "Oui. Sanity Studio intégré — une interface propre équivalente à un back-office restaurant. Vous ajoutez un plat, la carte web et la carte print se mettent à jour toutes seules en 30s.",
  },
  {
    q: "Comment ça marche pour recevoir les emails des résas TheFork ?",
    a: "TheFork expose un webhook pour les partenaires certifiés (et sinon on parse leur email de confirmation avec un inbox dédié). Chaque résa crée automatiquement une fiche client dans le CRM, avec marquage \"source: TheFork\".",
  },
  {
    q: "C’est quoi le piège ?",
    a: "Il n’y en a pas, et c’est pour ça qu’on vend à ce prix : on ne vous loue pas un service, on vous livre un actif. Le seul \"piège\" c’est que si vous voulez un truc très custom dans 6 mois, il faudra un devis — comme n’importe quel logiciel.",
  },
];

/* ─────────────────────────────────────────────────────────────
   Helper motion variants
   ───────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ─────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────── */
export default function ProPage() {
  return (
    <main className="bg-cream text-brown overflow-x-clip">
      <NavPro />
      <Hero />
      <Problem />
      <Solution />
      <Modules />
      <BeforeAfter />
      <Compare />
      <DemoProof />
      <Pricing />
      <Faq />
      <Contact />
      <FooterPro />
    </main>
  );
}

/* ─── Nav ───────────────────────────────────────────────────── */
function NavPro() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[color:var(--color-brown)]/85 backdrop-blur-xl border-b border-[color:var(--color-gold)]/15"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group">
          <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--color-gold)] group-hover:bg-[color:var(--color-red)] transition-colors" />
          <span className="font-[family-name:var(--font-display)] text-white-warm tracking-[0.2em] text-sm uppercase">
            Gourmet Pack
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-white-warm/70 text-[13px] tracking-wide uppercase">
          <a href="#modules" className="hover:text-white-warm transition-colors">Modules</a>
          <a href="#avant-apres" className="hover:text-white-warm transition-colors">Avant/Après</a>
          <a href="#pricing" className="hover:text-white-warm transition-colors">Tarif</a>
          <a href="#faq" className="hover:text-white-warm transition-colors">FAQ</a>
        </nav>
        <a
          href="#contact"
          className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] px-5 py-2 text-sm font-semibold hover:bg-[color:var(--color-gold-light)] transition-colors"
        >
          Demander un devis
          <span aria-hidden>→</span>
        </a>
      </div>
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────── */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);
  return (
    <section
      id="top"
      ref={ref}
      className="relative min-h-[100svh] w-full bg-[color:var(--color-brown)] text-white-warm overflow-hidden"
    >
      {/* Background: gold grid + gradient + particles */}
      <HeroBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-32 pb-20 lg:pt-40 lg:pb-24 grid lg:grid-cols-12 gap-12 items-center min-h-[100svh]">
        {/* Left: copy */}
        <motion.div
          style={{ y, opacity }}
          className="lg:col-span-7 flex flex-col gap-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]"
          >
            <span className="inline-block w-8 h-px bg-[color:var(--color-gold)]" />
            Stack pour restaurants indépendants
          </motion.div>

          <h1 className="font-[family-name:var(--font-display)] text-[44px] leading-[1.02] sm:text-6xl lg:text-[96px] lg:leading-[0.98] tracking-tight">
            <AnimatedTitle />
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="max-w-xl text-white-warm/70 text-lg lg:text-xl leading-relaxed"
          >
            Le pack complet pour les restaurateurs indépendants qui veulent
            arrêter de payer <em className="not-italic text-[color:var(--color-gold-light)]">298€/mois</em>{" "}
            à TheFork, Zelty et Mailchimp.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener"
              className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] px-8 py-4 font-semibold overflow-hidden"
            >
              <span className="relative z-10">Voir la démo live</span>
              <span
                aria-hidden
                className="relative z-10 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
              <span className="absolute inset-0 bg-[color:var(--color-gold-light)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-3 rounded-full border border-white-warm/25 px-8 py-4 font-semibold hover:bg-white-warm/5 transition-colors"
            >
              Parler à un humain
            </a>
          </motion.div>

          {/* Trust signals */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-[12px] tracking-wider uppercase text-white-warm/50"
          >
            <li className="flex items-center gap-2">
              <Dot /> Déployé en production
            </li>
            <li className="flex items-center gap-2">
              <Dot /> 6 modules
            </li>
            <li className="flex items-center gap-2">
              <Dot /> 0 abonnement
            </li>
            <li className="flex items-center gap-2">
              <Dot /> Code ouvert
            </li>
          </motion.ul>
        </motion.div>

        {/* Right: rotating screens */}
        <div className="lg:col-span-5 relative h-[460px] sm:h-[560px]">
          <RotatingShowcase />
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white-warm/40 text-[10px] tracking-[0.3em] uppercase"
      >
        Scroll
        <span className="block w-px h-10 bg-gradient-to-b from-[color:var(--color-gold)] to-transparent" />
      </motion.div>
    </section>
  );
}

function Dot() {
  return <span className="w-1 h-1 rounded-full bg-[color:var(--color-gold)]" />;
}

function AnimatedTitle() {
  const words = ["Votre", "restaurant,", "transformé", "en", "machine", "digitale"];
  return (
    <span className="block">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: 0.15 + i * 0.08,
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={`inline-block mr-[0.25em] ${
            w.startsWith("machine") || w === "digitale"
              ? "italic text-[color:var(--color-gold-light)] font-[family-name:var(--font-display)]"
              : ""
          }`}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

function HeroBackground() {
  const prefersReduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Radial warm gradient */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(184,146,47,0.18), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(192,57,43,0.12), transparent 55%), linear-gradient(180deg, #1B0F08 0%, #2C1810 100%)",
        }}
      />
      {/* Fine grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #B8922F 1px, transparent 1px), linear-gradient(to bottom, #B8922F 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Noise */}
      <div aria-hidden className="absolute inset-0 bg-noise opacity-50" />
      {/* Gold particles */}
      {!prefersReduced && (
        <div aria-hidden className="absolute inset-0">
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute block w-1 h-1 rounded-full bg-[color:var(--color-gold-light)]"
              style={{
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 100}%`,
                opacity: 0.2 + ((i * 17) % 60) / 100,
              }}
              animate={{
                y: [0, -18, 0],
                opacity: [0.15, 0.55, 0.15],
              }}
              transition={{
                duration: 5 + (i % 5),
                repeat: Infinity,
                delay: (i % 7) * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
      {/* Bottom fade to cream */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, #FDF8F0)",
        }}
      />
    </div>
  );
}

/* ─── Rotating product showcase (hero right) ─────────────────── */
function RotatingShowcase() {
  const [i, setI] = useState(0);
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => setI((v) => (v + 1) % MODULES.length), 2800);
    return () => clearInterval(id);
  }, [prefersReduced]);
  const current = MODULES[i];

  return (
    <div className="relative h-full w-full flex items-center justify-center perspective-[1600px]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-8 rounded-[2rem] blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(184,146,47,0.25), transparent 65%)" }}
      />

      <AnimatePresence mode="popLayout">
        <motion.div
          key={current.tag}
          initial={{ opacity: 0, rotateY: -24, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, rotateY: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: 22, y: -30, scale: 0.94 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm aspect-[9/15] rounded-[2rem] border border-white-warm/10 bg-[color:var(--color-brown-light)]/40 backdrop-blur-md shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Faux screen chrome */}
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-white-warm/5">
            <span className="w-2 h-2 rounded-full bg-[color:var(--color-red)]/70" />
            <span className="w-2 h-2 rounded-full bg-[color:var(--color-gold)]/70" />
            <span className="w-2 h-2 rounded-full bg-[color:var(--color-gold-light)]/70" />
            <span className="ml-3 text-[9px] tracking-[0.25em] uppercase text-white-warm/40">
              {current.tag} · {current.name}
            </span>
          </div>

          <FauxScreen module={current} />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
        {MODULES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Afficher module ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-1 rounded-full transition-all ${
              idx === i ? "w-8 bg-[color:var(--color-gold)]" : "w-3 bg-white-warm/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FauxScreen({ module: m }: { module: (typeof MODULES)[number] }) {
  return (
    <div className="h-full w-full p-5 flex flex-col gap-3 text-[11px] text-white-warm/80">
      {/* Each module gets a distinct layout */}
      {m.name === "Site Vitrine" && (
        <>
          <div className="h-24 rounded-lg bg-gradient-to-br from-[color:var(--color-red)]/50 to-[color:var(--color-brown)]/60 flex items-center justify-center font-[family-name:var(--font-display)] text-white-warm/90 text-lg">
            Arc en Ciel
          </div>
          <div className="h-3 rounded bg-white-warm/10 w-4/5" />
          <div className="h-3 rounded bg-white-warm/10 w-3/5" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="h-16 rounded bg-white-warm/5 border border-white-warm/10" />
            <div className="h-16 rounded bg-white-warm/5 border border-white-warm/10" />
          </div>
          <div className="mt-auto h-8 rounded-full bg-[color:var(--color-gold)]/90 w-full" />
        </>
      )}
      {m.name === "Carte Éditoriale" && (
        <>
          <div className="text-center font-[family-name:var(--font-display)] italic text-[color:var(--color-gold-light)] text-base">
            La Carte
          </div>
          <div className="h-px bg-white-warm/10 w-1/2 mx-auto" />
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="flex items-start justify-between gap-2 pt-1">
              <div className="flex-1">
                <div className="h-2.5 rounded bg-white-warm/20 w-4/5 mb-1" />
                <div className="h-2 rounded bg-white-warm/10 w-3/5" />
              </div>
              <div className="h-3 rounded bg-[color:var(--color-gold)]/70 w-10" />
            </div>
          ))}
        </>
      )}
      {m.name === "Menu QR mobile" && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-white-warm/20" />
            <div className="h-2.5 rounded bg-white-warm/20 w-24" />
            <div className="ml-auto h-5 w-5 rounded-full bg-[color:var(--color-gold)]/70" />
          </div>
          <div className="h-7 rounded-full bg-white-warm/10 flex items-center px-3 text-[10px] text-white-warm/40">
            Chercher un plat…
          </div>
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              className="flex gap-2 p-2 rounded-lg bg-white-warm/5 border border-white-warm/10"
            >
              <div className="h-10 w-10 rounded bg-[color:var(--color-red)]/30" />
              <div className="flex-1">
                <div className="h-2.5 rounded bg-white-warm/20 w-3/4 mb-1" />
                <div className="h-2 rounded bg-white-warm/10 w-1/2" />
              </div>
              <div className="h-5 w-8 rounded bg-[color:var(--color-gold)]/80 self-center" />
            </div>
          ))}
          <div className="mt-auto h-8 rounded-full bg-[color:var(--color-red)] flex items-center justify-center text-[10px] text-white-warm font-semibold">
            Appeler le serveur
          </div>
        </>
      )}
      {m.name === "CRM unifié" && (
        <>
          <div className="flex items-center justify-between">
            <div className="h-3 rounded bg-white-warm/25 w-20" />
            <div className="h-5 w-5 rounded-full bg-[color:var(--color-gold)]/70" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="rounded p-2 bg-white-warm/5 border border-white-warm/10">
              <div className="text-[10px] text-white-warm/40">Résas</div>
              <div className="text-lg font-[family-name:var(--font-display)] text-[color:var(--color-gold-light)]">47</div>
            </div>
            <div className="rounded p-2 bg-white-warm/5 border border-white-warm/10">
              <div className="text-[10px] text-white-warm/40">Clients</div>
              <div className="text-lg font-[family-name:var(--font-display)] text-[color:var(--color-gold-light)]">312</div>
            </div>
            <div className="rounded p-2 bg-white-warm/5 border border-white-warm/10">
              <div className="text-[10px] text-white-warm/40">CA/sem</div>
              <div className="text-lg font-[family-name:var(--font-display)] text-[color:var(--color-gold-light)]">8.2k</div>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-2">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${30 + k * 18}%`,
                    background: k % 2 ? "var(--color-gold)" : "var(--color-red)",
                    opacity: 0.6,
                  }}
                />
                <div className="h-2 rounded bg-white-warm/10 flex-1" />
              </div>
            ))}
          </div>
        </>
      )}
      {m.name === "Programme fidélité" && (
        <>
          <div className="rounded-xl p-3 bg-gradient-to-br from-[color:var(--color-gold)] to-[color:var(--color-red)] text-white-warm">
            <div className="text-[9px] uppercase tracking-widest opacity-80">
              Carte fidélité
            </div>
            <div className="font-[family-name:var(--font-display)] text-lg mt-1">
              Marie Dupont
            </div>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 10 }).map((_, k) => (
                <span
                  key={k}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    k < 7 ? "bg-white-warm border-white-warm" : "border-white-warm/50"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-center mt-2 text-[10px] text-white-warm/60">
            3 tampons avant la prochaine pizza offerte
          </div>
          <div className="mt-auto h-24 rounded-lg bg-white-warm/5 border border-white-warm/10 flex items-center justify-center">
            <div className="h-16 w-16 bg-white-warm/90 rounded grid grid-cols-4 gap-0.5 p-1.5">
              {Array.from({ length: 16 }).map((_, k) => (
                <span
                  key={k}
                  className={(k * 7) % 3 ? "bg-[color:var(--color-brown)]" : "bg-transparent"}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {m.name === "Emails automatiques" && (
        <>
          <div className="rounded-lg p-3 bg-white-warm/[0.04] border border-white-warm/10">
            <div className="text-[9px] uppercase tracking-widest text-[color:var(--color-gold-light)]">
              De : Arc en Ciel
            </div>
            <div className="font-[family-name:var(--font-display)] text-[13px] italic mt-1">
              Votre table vous attend demain à 20h
            </div>
            <div className="h-px bg-white-warm/10 my-2" />
            <div className="text-[10px] text-white-warm/60 leading-relaxed">
              Marie, on a hâte de vous revoir. Votre table pour 2 est confirmée. Un petit
              mot si vous voulez nous prévenir d’une allérgie…
            </div>
            <div className="mt-2 inline-block rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] text-[10px] px-3 py-1 font-semibold">
              Voir ma résa
            </div>
          </div>
          <div className="rounded-lg p-3 bg-white-warm/[0.04] border border-white-warm/10">
            <div className="text-[9px] uppercase tracking-widest text-[color:var(--color-gold-light)]">
              Récompense débloquée
            </div>
            <div className="font-[family-name:var(--font-display)] text-[13px] italic mt-1">
              Votre 10e pizza est offerte
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Problem ──────────────────────────────────────────────── */
function Problem() {
  return (
    <section className="relative py-28 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="01" label="Le problème" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Le casse-tête quotidien d’un{" "}
          <em className="text-[color:var(--color-red)]">restaurateur</em>
        </motion.h2>
        <p className="max-w-2xl text-brown-light mt-6 text-lg">
          Vous signez pour une application. Puis une autre. Puis trois. Deux ans après, vous
          payez 10&nbsp;000&nbsp;€ par an et vous passez votre samedi matin à recopier des résas.
        </p>

        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 gap-6 lg:gap-8 mt-16"
        >
          {PAIN_POINTS.map((p, i) => (
            <motion.li
              key={p.t}
              variants={fadeUp}
              custom={i}
              className="group relative rounded-2xl bg-white-warm p-8 border border-[color:var(--color-terracotta-deep)]/15 hover:border-[color:var(--color-red)]/40 transition-colors overflow-hidden"
            >
              <div className="flex items-start gap-6">
                <div className="shrink-0">
                  <div className="font-[family-name:var(--font-display)] italic text-4xl lg:text-5xl text-[color:var(--color-red)]">
                    {p.k}
                  </div>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-brown leading-tight">
                    {p.t}
                  </h3>
                  <p className="mt-3 text-brown-light leading-relaxed">{p.d}</p>
                </div>
              </div>
              <span
                aria-hidden
                className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[color:var(--color-red)]/5 group-hover:bg-[color:var(--color-red)]/10 transition-colors"
              />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/* ─── Solution (diagram) ────────────────────────────────────── */
function Solution() {
  return (
    <section className="relative py-28 lg:py-40 bg-[color:var(--color-brown)] text-white-warm overflow-hidden">
      {/* background accents */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #B8922F 1px, transparent 1px), linear-gradient(to bottom, #B8922F 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="02" label="La solution" dark />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Une seule stack. Un seul dashboard.{" "}
          <em className="text-[color:var(--color-gold-light)]">Zéro abonnement.</em>
        </motion.h2>

        <div className="mt-20 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <Diagram />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-8">
            {[
              {
                t: "Vous êtes propriétaire du code",
                d: "Repo GitHub à votre nom. Supabase sur votre compte. Vous partez avec tout, quand vous voulez.",
              },
              {
                t: "Stack moderne 2026",
                d: "Next.js 16, React 19, Tailwind 4, Framer Motion, Supabase, Resend. Pas de PHP, pas de WordPress.",
              },
              {
                t: "Setup en 48 heures",
                d: "On déploie la base en 2 jours. On connecte TheFork, Google, Deliveroo dans la semaine.",
              },
            ].map((x, i) => (
              <motion.div
                key={x.t}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.7 }}
                className="border-l-2 border-[color:var(--color-gold)] pl-6"
              >
                <h3 className="font-[family-name:var(--font-display)] text-2xl lg:text-3xl text-white-warm leading-tight">
                  {x.t}
                </h3>
                <p className="mt-2 text-white-warm/60 leading-relaxed">{x.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Diagram() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-square max-w-[560px] mx-auto"
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border border-[color:var(--color-gold)]/20"
        aria-hidden
      />
      <div
        className="absolute inset-10 rounded-full border border-[color:var(--color-gold)]/10"
        aria-hidden
      />
      {/* Center dashboard */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full border border-dashed border-[color:var(--color-gold)]/20" />
      </motion.div>
      <div className="absolute inset-[30%] rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] flex flex-col items-center justify-center text-center p-6 shadow-[0_30px_80px_-10px_rgba(184,146,47,0.4)]">
        <span className="text-[10px] tracking-[0.3em] uppercase">1 seul</span>
        <span className="font-[family-name:var(--font-display)] text-xl lg:text-2xl leading-tight mt-1">
          Dashboard
        </span>
        <span className="text-[10px] tracking-widest uppercase mt-1 opacity-70">Admin</span>
      </div>

      {/* 6 modules around */}
      {MODULES.map((m, i) => {
        const angle = (i / MODULES.length) * Math.PI * 2 - Math.PI / 2;
        const r = 44; // percentage radius from center
        const x = 50 + Math.cos(angle) * r;
        const y = 50 + Math.sin(angle) * r;
        return (
          <motion.div
            key={m.tag}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-[color:var(--color-brown-light)] border border-[color:var(--color-gold)]/30 flex items-center justify-center text-2xl shadow-xl">
                {m.emoji}
              </div>
              <span className="text-[10px] tracking-wider uppercase text-white-warm/60 whitespace-nowrap">
                {m.name}
              </span>
            </div>
            {/* connector line */}
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 w-px bg-gradient-to-b from-[color:var(--color-gold)]/40 to-transparent origin-top"
              style={{
                height: "34%",
                transform: `translate(-50%, -50%) rotate(${
                  (angle + Math.PI / 2) * (180 / Math.PI) + 180
                }deg)`,
                transformOrigin: "center top",
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ─── Modules grid ─────────────────────────────────────────── */
function Modules() {
  return (
    <section id="modules" className="relative py-28 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="03" label="Les 6 modules" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Tout ce dont votre restaurant{" "}
          <em className="text-[color:var(--color-gold)]">a besoin</em>
        </motion.h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid gap-6 lg:gap-8 md:grid-cols-2"
        >
          {MODULES.map((m, i) => (
            <ModuleCard key={m.tag} module={m} i={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ModuleCard({ module: m, i }: { module: (typeof MODULES)[number]; i: number }) {
  return (
    <motion.article
      variants={fadeUp}
      custom={i}
      className="group relative flex flex-col rounded-2xl bg-white-warm border border-[color:var(--color-terracotta-deep)]/15 overflow-hidden hover:border-[color:var(--color-gold)]/60 hover:shadow-[0_30px_80px_-30px_rgba(44,24,16,0.3)] transition-all duration-500"
    >
      {/* Screenshot placeholder */}
      <div
        className="relative h-48 lg:h-56 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-brown) 0%, #3A2216 50%, var(--color-brown-light) 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #B8922F 1px, transparent 1px), linear-gradient(to bottom, #B8922F 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
          <span className="text-5xl mb-2">{m.emoji}</span>
          <span className="font-[family-name:var(--font-display)] italic text-white-warm/90 text-xl lg:text-2xl">
            {m.name}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white-warm/40 mt-2">
            Module {m.tag}
          </span>
        </div>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: m.accent as string }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex flex-col">
        <h3 className="font-[family-name:var(--font-display)] text-2xl lg:text-3xl text-brown leading-tight">
          {m.name}
        </h3>
        <p className="mt-3 text-brown-light leading-relaxed">{m.value}</p>
        <ul className="mt-6 space-y-2.5">
          {m.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-brown">
              <span
                aria-hidden
                className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: m.accent as string }}
              />
              <span className="text-sm leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>

        {m.href ? (
          <a
            href={m.href}
            target="_blank"
            rel="noopener"
            className="mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-[color:var(--color-red)] group/link"
          >
            Voir en vrai
            <span
              aria-hidden
              className="inline-block transition-transform group-hover/link:translate-x-1"
            >
              →
            </span>
          </a>
        ) : (
          <span className="mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-brown-light">
            Template inclus dans le pack
          </span>
        )}
      </div>
    </motion.article>
  );
}

/* ─── Before / After ──────────────────────────────────────── */
function BeforeAfter() {
  return (
    <section
      id="avant-apres"
      className="relative py-28 lg:py-40 bg-[color:var(--color-brown)] text-white-warm overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #B8922F 1px, transparent 1px), linear-gradient(to bottom, #B8922F 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="04" label="Avant / Après" dark />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Ce qui change,{" "}
          <em className="text-[color:var(--color-gold-light)]">concrètement</em>.
        </motion.h2>

        <div className="mt-16 grid lg:grid-cols-2 gap-6 lg:gap-10">
          {/* AVANT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl p-10 lg:p-12 bg-white-warm/[0.02] border border-white-warm/10"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase text-white-warm/40 mb-3">
              Avant
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-3xl lg:text-4xl text-white-warm/60 line-through decoration-[color:var(--color-red)] decoration-2">
              Le restaurant 2010
            </h3>
            <ul className="mt-8 space-y-5">
              {[
                { k: "5 abonnements", v: "298€ / mois cumulé" },
                { k: "3 dashboards", v: "TheFork + Google + Deliveroo" },
                { k: "Site WordPress", v: "lent, 0 SEO mobile" },
                { k: "0% fidélisation", v: "clients perdus à chaque service" },
              ].map((x) => (
                <li
                  key={x.k}
                  className="flex items-baseline justify-between gap-4 border-b border-white-warm/10 pb-4"
                >
                  <span className="text-white-warm/60 text-lg">{x.k}</span>
                  <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-red)] text-xl">
                    {x.v}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 text-white-warm/50 text-sm">
              Total&nbsp;: <span className="text-white-warm">3&nbsp;576€ / an</span> de frais
              récurrents.
            </div>
          </motion.div>

          {/* APRES */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative rounded-3xl p-10 lg:p-12 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--color-gold) 0%, #D4A437 50%, var(--color-gold-light) 100%)",
              color: "var(--color-brown)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4), transparent 50%)",
              }}
            />
            <div className="relative">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-brown)]/70 mb-3">
                Après
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-3xl lg:text-4xl">
                Avec Gourmet Pack
              </h3>
              <ul className="mt-8 space-y-5">
                {[
                  { k: "1 pack one-shot", v: "prix fixe" },
                  { k: "1 dashboard unifié", v: "toutes les sources" },
                  { k: "Site Next.js 16", v: "Lighthouse 95+" },
                  { k: "Fidélité intégrée", v: "+30% de retours" },
                ].map((x) => (
                  <li
                    key={x.k}
                    className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-brown)]/15 pb-4"
                  >
                    <span className="text-[color:var(--color-brown)]/80 text-lg">{x.k}</span>
                    <span className="font-[family-name:var(--font-display)] italic text-lg">
                      {x.v}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-[color:var(--color-brown)]/80 text-sm">
                Total&nbsp;: <span className="font-semibold">un seul investissement</span>. Vous
                êtes propriétaire.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Compare ─────────────────────────────────────────────── */
function Compare() {
  return (
    <section className="relative py-28 lg:py-40 bg-white-warm">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="05" label="Le comparatif" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Pourquoi pas{" "}
          <em className="text-[color:var(--color-red)]">TheFork</em>{" "}
          ou{" "}
          <em className="text-[color:var(--color-red)]">Zelty</em>&nbsp;?
        </motion.h2>
        <p className="max-w-2xl text-brown-light mt-6 text-lg">
          Ces outils sont bien pour leur fonction unique. Ils ne remplacent pas une stack complète
          — et surtout, vous n’en êtes pas propriétaire.
        </p>

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="mt-16 hidden lg:block overflow-hidden rounded-3xl border border-[color:var(--color-terracotta-deep)]/20"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-cream">
                <th className="text-left p-6 font-[family-name:var(--font-display)] text-lg text-brown">
                  Fonctionnalité
                </th>
                <th className="p-6 text-center">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-brown-light">
                    TheFork
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-brown mt-1">
                    Manager
                  </div>
                </th>
                <th className="p-6 text-center">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-brown-light">
                    Zelty
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-brown mt-1">
                    POS
                  </div>
                </th>
                <th className="p-6 text-center">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-brown-light">
                    Innovorder
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-brown mt-1">
                    Enterprise
                  </div>
                </th>
                <th
                  className="p-6 text-center"
                  style={{ background: "var(--color-brown)", color: "var(--color-white-warm)" }}
                >
                  <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                    Gourmet
                  </div>
                  <div className="font-[family-name:var(--font-display)] italic text-white-warm mt-1">
                    Pack
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-[color:var(--color-terracotta-deep)]/15">
                  <td className="p-5 text-brown font-medium">{row.feature}</td>
                  <td className="p-5 text-center">
                    <Cell v={row.thefork} />
                  </td>
                  <td className="p-5 text-center">
                    <Cell v={row.zelty} />
                  </td>
                  <td className="p-5 text-center">
                    <Cell v={row.innovo} />
                  </td>
                  <td
                    className="p-5 text-center"
                    style={{ background: "var(--color-brown)", color: "var(--color-white-warm)" }}
                  >
                    <Cell v={row.us} highlight />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile: stacked cards */}
        <div className="mt-16 lg:hidden grid gap-6">
          {[
            { name: "TheFork Manager", price: "~150€/mois", k: "thefork" },
            { name: "Zelty POS", price: "~200€/mois", k: "zelty" },
            { name: "Innovorder", price: "~300€/mois", k: "innovo" },
            { name: "Gourmet Pack", price: "one-shot", k: "us", us: true },
          ].map((col) => (
            <div
              key={col.name}
              className={`rounded-2xl p-6 border ${
                col.us
                  ? "bg-[color:var(--color-brown)] text-white-warm border-[color:var(--color-gold)]"
                  : "bg-cream border-[color:var(--color-terracotta-deep)]/20"
              }`}
            >
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-[family-name:var(--font-display)] text-xl">{col.name}</h3>
                <span
                  className={`text-sm ${col.us ? "text-[color:var(--color-gold-light)]" : "text-brown-light"}`}
                >
                  {col.price}
                </span>
              </div>
              <ul className="space-y-2">
                {COMPARE_ROWS.map((row) => {
                  const v =
                    col.k === "thefork"
                      ? row.thefork
                      : col.k === "zelty"
                      ? row.zelty
                      : col.k === "innovo"
                      ? row.innovo
                      : row.us;
                  return (
                    <li key={row.feature} className="flex justify-between items-center gap-3 text-sm">
                      <span className={col.us ? "text-white-warm/70" : "text-brown-light"}>
                        {row.feature}
                      </span>
                      <Cell v={v} highlight={!!col.us} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cell({ v, highlight = false }: { v: boolean | string; highlight?: boolean }) {
  if (v === true)
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
          highlight ? "bg-[color:var(--color-gold)] text-[color:var(--color-brown)]" : "bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)]"
        }`}
      >
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[color:var(--color-red)]/10 text-[color:var(--color-red)]">
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </span>
    );
  return (
    <span
      className={`inline-block text-[11px] tracking-wider uppercase px-2 py-1 rounded ${
        highlight
          ? "bg-[color:var(--color-gold)] text-[color:var(--color-brown)] font-semibold"
          : "bg-[color:var(--color-terracotta)]/40 text-brown"
      }`}
    >
      {v}
    </span>
  );
}

/* ─── Demo proof ──────────────────────────────────────────── */
function DemoProof() {
  return (
    <section className="relative py-28 lg:py-40 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionLabel index="06" label="La preuve" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] max-w-4xl mt-6"
        >
          Voyez tout ça en{" "}
          <em className="text-[color:var(--color-red)]">60 secondes</em>.
        </motion.h2>
        <p className="max-w-2xl text-brown-light mt-6 text-lg">
          Le pack tourne en production pour L&rsquo;Arc en Ciel, une pizzeria de Morangis.
          Site, carte, résas, fidélité, CRM — tout est live et vérifiable.
        </p>

        {/* Browser frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 rounded-3xl overflow-hidden border border-[color:var(--color-terracotta-deep)]/25 bg-white-warm shadow-[0_40px_120px_-30px_rgba(44,24,16,0.35)]"
        >
          {/* chrome */}
          <div className="flex items-center gap-2 px-5 py-3 bg-[color:var(--color-brown)]/95">
            <span className="w-3 h-3 rounded-full bg-[color:var(--color-red)]/80" />
            <span className="w-3 h-3 rounded-full bg-[color:var(--color-gold)]/80" />
            <span className="w-3 h-3 rounded-full bg-[color:var(--color-gold-light)]/80" />
            <div className="mx-auto text-[11px] text-white-warm/60 tracking-wide font-mono">
              arc-en-ciel-theta.vercel.app
            </div>
          </div>
          <div className="aspect-[16/10] relative bg-cream">
            <iframe
              src={DEMO_URL}
              title="Démo live — Arc en Ciel"
              loading="lazy"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </motion.div>

        {/* Deep links */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          {[
            {
              t: "Testez le menu QR",
              d: "Comme si vous étiez à table",
              url: `${DEMO_URL}/m/carte?table=1`,
              k: "01",
            },
            {
              t: "Connectez-vous au CRM",
              d: "admin / password : admin2026",
              url: `${DEMO_URL}/admin`,
              k: "02",
            },
            {
              t: "Créez une carte fidélité",
              d: "Inscription en 30s, sans app",
              url: `${DEMO_URL}/fidelite`,
              k: "03",
            },
          ].map((x) => (
            <motion.a
              key={x.t}
              variants={fadeUp}
              href={x.url}
              target="_blank"
              rel="noopener"
              className="group relative rounded-2xl p-6 bg-white-warm border border-[color:var(--color-terracotta-deep)]/20 hover:border-[color:var(--color-gold)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="font-[family-name:var(--font-display)] italic text-[color:var(--color-gold)] text-sm mb-2">
                {x.k}
              </div>
              <div className="font-[family-name:var(--font-display)] text-xl text-brown leading-tight">
                {x.t}
              </div>
              <div className="text-brown-light text-sm mt-2">{x.d}</div>
              <div className="mt-4 text-[color:var(--color-red)] text-sm font-semibold inline-flex items-center gap-2">
                Ouvrir{" "}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </motion.a>
          ))}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-3 rounded-full bg-[color:var(--color-brown)] text-white-warm px-10 py-5 text-lg font-semibold hover:bg-[color:var(--color-brown-light)] transition-colors"
          >
            Ouvrir la démo live
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              ↗
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */
function Pricing() {
  return (
    <section
      id="pricing"
      className="relative py-28 lg:py-40 bg-[color:var(--color-brown)] text-white-warm overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(184,146,47,0.18), transparent 60%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 lg:px-10">
        <SectionLabel index="07" label="Le prix" dark />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] mt-6 text-center"
        >
          Un seul prix.{" "}
          <em className="text-[color:var(--color-gold-light)]">Votre restaurant.</em>
          <br />
          Pour toujours.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 relative rounded-[2rem] p-10 lg:p-14 overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,253,249,0.06), rgba(255,253,249,0.02))",
            border: "1px solid rgba(184,146,47,0.3)",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl"
            style={{ background: "rgba(184,146,47,0.25)" }}
          />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                  Édition complète
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-3xl lg:text-4xl mt-2">
                  Gourmet Pack
                </h3>
              </div>
              <div className="sm:text-right">
                <div className="text-white-warm/50 text-sm">À partir de</div>
                <div className="font-[family-name:var(--font-display)] italic text-[color:var(--color-gold-light)] text-5xl lg:text-6xl leading-none mt-1">
                  2&nbsp;490&nbsp;€
                </div>
                <div className="text-white-warm/50 text-sm mt-1">one-shot · HT</div>
              </div>
            </div>

            <div className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-4">
              {[
                "Les 6 modules complètement intégrés",
                "Setup technique en 48h",
                "Formation staff de 2h (visio)",
                "3 mois de support inclus",
                "Repo GitHub à votre nom",
                "Supabase et Vercel sur vos comptes",
              ].map((x) => (
                <div key={x} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] shrink-0">
                    <svg viewBox="0 0 20 20" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-white-warm/85">{x}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 rounded-xl bg-white-warm/[0.04] border border-white-warm/10 text-white-warm/70 text-sm leading-relaxed">
              <strong className="text-white-warm">Pas d’abonnement mensuel.</strong> Vous
              êtes propriétaire du code et de votre base de données. Si vous voulez
              partir demain, vous partez avec tout.
            </div>

            <div className="mt-6 text-white-warm/60 text-sm">
              <strong className="text-white-warm/80">Add-ons optionnels&nbsp;:</strong> Domaine
              custom (50€) · Configuration Resend/Stripe (inclus) · Formation staff
              étendue (200€) · Import clients existants (dévis)
            </div>

            <a
              href="#contact"
              className="mt-10 group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] px-10 py-5 text-lg font-semibold overflow-hidden"
            >
              <span className="relative z-10">Demander un devis personnalisé</span>
              <span
                aria-hidden
                className="relative z-10 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
              <span className="absolute inset-0 bg-[color:var(--color-gold-light)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-28 lg:py-40 bg-cream">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <SectionLabel index="08" label="FAQ" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[72px] leading-[1.05] mt-6"
        >
          Les questions que vous{" "}
          <em className="text-[color:var(--color-gold)]">vous posez</em>
        </motion.h2>

        <ul className="mt-16 divide-y divide-[color:var(--color-terracotta-deep)]/20 border-t border-b border-[color:var(--color-terracotta-deep)]/20">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-6 py-6 lg:py-8 text-left group"
                >
                  <span className="flex items-baseline gap-5">
                    <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-gold)] text-sm shrink-0 pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-xl lg:text-2xl text-brown leading-snug group-hover:text-[color:var(--color-red)] transition-colors">
                      {item.q}
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0 mt-2 text-2xl text-brown-light"
                    aria-hidden
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-8 pl-14 pr-10 text-brown-light text-lg leading-relaxed max-w-3xl">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ─── Contact ─────────────────────────────────────────────── */
function Contact() {
  type Status = "idle" | "submitting" | "success" | "error";
  const [status, setStatus] = useState<Status>("idle");
  const [submittedName, setSubmittedName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      restaurantName: String(data.get("restaurantName") || ""),
      contactName: String(data.get("contactName") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      message: String(data.get("message") || ""),
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("request_failed");
      setSubmittedName(payload.contactName.split(" ")[0] || payload.contactName);
      setStatus("success");
      form.reset();
    } catch {
      setError(
        "Un souci avec l’envoi. Réessayez, ou écrivez directement à hello."
      );
      setStatus("error");
    }
  }

  return (
    <section
      id="contact"
      className="relative py-28 lg:py-40 bg-[color:var(--color-brown)] text-white-warm overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #B8922F 1px, transparent 1px), linear-gradient(to bottom, #B8922F 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 grid lg:grid-cols-5 gap-14">
        <div className="lg:col-span-2">
          <SectionLabel index="09" label="Contact" dark />
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] mt-6">
            On en parle&nbsp;?
          </h2>
          <p className="mt-6 text-white-warm/70 leading-relaxed text-lg">
            Dites-nous juste le nom du restaurant et ce qui vous manque aujourd’hui. On
            revient vers vous sous 24h avec un devis précis — et on peut fixer un
            appel de 20 minutes pour une démo guidée si vous le souhaitez.
          </p>
          <div className="mt-10 space-y-4 text-sm text-white-warm/60">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                Réponse
              </div>
              <div className="mt-1 text-white-warm">Sous 24h ouvrées</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                Zone
              </div>
              <div className="mt-1 text-white-warm">France entière, visio possible</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                Aucun engagement
              </div>
              <div className="mt-1 text-white-warm">Premier échange gratuit</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="rounded-3xl p-10 lg:p-14 border border-[color:var(--color-gold)]/40 bg-white-warm/[0.03]"
              >
                <div className="text-5xl mb-4">🍳</div>
                <h3 className="font-[family-name:var(--font-display)] text-3xl lg:text-4xl">
                  Merci
                  {submittedName ? `, ${submittedName}` : ""}.
                </h3>
                <p className="mt-4 text-white-warm/70 leading-relaxed">
                  Message reçu. Je reviens vers vous sous 24h avec un devis et les
                  premières questions pour préparer le setup. En attendant, vous
                  pouvez continuer à explorer la{" "}
                  <a
                    className="text-[color:var(--color-gold-light)] underline underline-offset-4"
                    href={DEMO_URL}
                    target="_blank"
                    rel="noopener"
                  >
                    démo live
                  </a>
                  .
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                onSubmit={onSubmit}
                className="rounded-3xl p-8 lg:p-10 bg-white-warm/[0.03] border border-white-warm/10 backdrop-blur-sm space-y-5"
              >
                <Field
                  name="restaurantName"
                  label="Nom du restaurant"
                  required
                  placeholder="Ex : La Trattoria du coin"
                />
                <Field
                  name="contactName"
                  label="Votre nom"
                  required
                  placeholder="Prénom Nom"
                />
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    name="email"
                    type="email"
                    label="Email"
                    required
                    placeholder="vous@restaurant.fr"
                  />
                  <Field
                    name="phone"
                    type="tel"
                    label="Téléphone"
                    placeholder="Optionnel"
                  />
                </div>
                <Field
                  name="message"
                  label="Qu’est-ce qui vous intéresse le plus ?"
                  placeholder="Site, CRM, fidélité, tout… ou dites-nous votre contexte."
                  textarea
                />

                {error && (
                  <div className="rounded-lg p-3 bg-[color:var(--color-red)]/15 border border-[color:var(--color-red)]/40 text-[color:var(--color-gold-light)] text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] px-8 py-4 font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[color:var(--color-gold-light)] transition-colors"
                >
                  {status === "submitting" ? "Envoi en cours…" : "Envoyer la demande"}
                  {status !== "submitting" && (
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  )}
                </button>
                <p className="text-xs text-white-warm/40 mt-2">
                  Aucun spam. Vos infos servent uniquement à établir le devis.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  textarea = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
}) {
  const base =
    "w-full bg-transparent border-0 border-b border-white-warm/20 focus:border-[color:var(--color-gold)] outline-none text-white-warm placeholder:text-white-warm/30 py-3 transition-colors";
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.3em] uppercase text-white-warm/50">
        {label}
        {required && <span className="text-[color:var(--color-red)] ml-1">*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          rows={3}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className={base}
        />
      )}
    </label>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function FooterPro() {
  return (
    <footer className="relative bg-[color:var(--color-brown)] text-white-warm/70 border-t border-white-warm/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-[family-name:var(--font-display)] text-white-warm tracking-[0.2em] text-sm uppercase">
            Gourmet Pack
          </div>
          <div className="text-xs mt-1 text-white-warm/40">
            La stack des restaurateurs qui ne veulent plus louer leur business.
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-xs tracking-wider uppercase text-white-warm/50">
          <a href={DEMO_URL} target="_blank" rel="noopener" className="hover:text-white-warm">
            Démo live
          </a>
          <a href="#modules" className="hover:text-white-warm">
            Modules
          </a>
          <a href="#pricing" className="hover:text-white-warm">
            Tarif
          </a>
          <a href="#contact" className="hover:text-white-warm">
            Contact
          </a>
        </div>
        <div className="text-xs text-white-warm/40">
          Créé par{" "}
          <span className="text-[color:var(--color-gold-light)] font-[family-name:var(--font-script)] text-sm">
            Kevin Aubouin
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Shared section label ─────────────────────────────────── */
function SectionLabel({
  index,
  label,
  dark = false,
}: {
  index: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="flex items-center gap-4"
    >
      <span
        className={`font-[family-name:var(--font-display)] italic text-2xl ${
          dark ? "text-[color:var(--color-gold-light)]" : "text-[color:var(--color-gold)]"
        }`}
      >
        {index}
      </span>
      <span
        className={`text-[11px] tracking-[0.3em] uppercase ${
          dark ? "text-white-warm/60" : "text-brown-light"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex-1 h-px ${
          dark
            ? "bg-gradient-to-r from-[color:var(--color-gold)]/40 to-transparent"
            : "bg-gradient-to-r from-[color:var(--color-terracotta-deep)]/40 to-transparent"
        }`}
      />
    </motion.div>
  );
}
