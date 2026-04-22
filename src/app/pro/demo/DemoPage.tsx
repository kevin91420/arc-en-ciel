"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Design tokens (matching /pro):
   cream #FDF8F0 · white-warm #FFFDF9 · brown #2C1810
   gold #B8922F · gold-light #E8C97A · red #C0392B
   terracotta #C4956A
   ───────────────────────────────────────────────────────────── */

const DEMO_URL = "https://arc-en-ciel-theta.vercel.app";

/* ─────────────────────────────────────────────────────────────
   The 12 scenes — the cinematic narrative.
   Each scene carries its script AND a deterministic id used to
   swap the mockup rendered inside the sticky device stage.
   ───────────────────────────────────────────────────────────── */

type Device = "phone" | "laptop" | "tablet";

interface Scene {
  id: string;
  device: Device;
  chapter: string;
  timecode: string;
  title: string;
  body: string;
  module: string;
}

const SCENES: Scene[] = [
  {
    id: "search",
    device: "phone",
    chapter: "Chapitre 1",
    timecode: "00:00",
    title: "Marie cherche « pizzeria Morangis ».",
    body:
      "19h02, vendredi soir. Elle sort du métro. Elle ouvre Google. Votre fiche remonte en première position, avec 4,8 étoiles et une photo qui donne faim.",
    module: "SEO local · Site vitrine",
  },
  {
    id: "site",
    device: "phone",
    chapter: "Chapitre 1",
    timecode: "00:08",
    title: "Elle tape sur votre site.",
    body:
      "Lighthouse 98 mobile. Le hero charge instantanément, la photo du feu de bois crépite. Le bouton « Réserver » flotte en bas d'écran, bien visible.",
    module: "Module 01 · Site Vitrine",
  },
  {
    id: "form",
    device: "phone",
    chapter: "Chapitre 2",
    timecode: "00:15",
    title: "Elle remplit le formulaire.",
    body:
      "Trois champs, zéro friction. Nom, téléphone, date. Elle choisit « ce soir, 20h30, 2 personnes ». Validation live, pas de popup, pas d'inscription forcée.",
    module: "Module 04 · CRM Réservations",
  },
  {
    id: "email",
    device: "phone",
    chapter: "Chapitre 2",
    timecode: "00:23",
    title: "L'email de confirmation atterrit.",
    body:
      "En 2,4 secondes. Un template Resend/React Email soigné à la virgule près — pas un mur de texte Comic Sans. DKIM, SPF, adresse d'envoi à votre domaine.",
    module: "Module 06 · Emails automatiques",
  },
  {
    id: "admin",
    device: "laptop",
    chapter: "Chapitre 3",
    timecode: "00:32",
    title: "Côté restaurant, la résa apparaît.",
    body:
      "Dans votre dashboard unifié. Pas besoin d'ouvrir TheFork, ni Google, ni vos emails. La fiche Marie se crée automatiquement, source « site direct ».",
    module: "Module 04 · CRM unifié",
  },
  {
    id: "arrive",
    device: "phone",
    chapter: "Chapitre 3",
    timecode: "00:40",
    title: "20h28 — Marie arrive. Table 7.",
    body:
      "Sophie la salue par son prénom. Sur la table, un petit chevalet en laiton et un QR code discret. « Scannez pour voir la carte si vous voulez. »",
    module: "Expérience en salle",
  },
  {
    id: "menu",
    device: "phone",
    chapter: "Chapitre 4",
    timecode: "00:48",
    title: "Elle scanne. La carte apparaît.",
    body:
      "Recherche instantanée, filtres allergènes, favoris mémorisés, bouton « Appeler le serveur » en un tap. Pas de PDF, pas de app store, pas d'inscription.",
    module: "Module 03 · Menu QR",
  },
  {
    id: "pos",
    device: "tablet",
    chapter: "Chapitre 5",
    timecode: "00:56",
    title: "Sophie prend la commande.",
    body:
      "Sur sa tablette serveur. Pizza Margherita, burrata en entrée, pichet de rouge. Trois taps. Envoi cuisine. Aucune feuille de papier, aucune erreur de transcription.",
    module: "Module 07 · POS Serveur",
  },
  {
    id: "kds",
    device: "laptop",
    chapter: "Chapitre 5",
    timecode: "01:03",
    title: "Ping cuisine. Un ticket s'affiche.",
    body:
      "Chef Luca lève la tête. Écran KDS 27 pouces, ticket table 7 en haut à gauche. Les ingrédients s'éclairent par priorité de préparation.",
    module: "Module 08 · KDS Cuisine",
  },
  {
    id: "ready",
    device: "laptop",
    chapter: "Chapitre 6",
    timecode: "01:12",
    title: "Luca marque « prêt ».",
    body:
      "Tap. Le ticket passe en vert, Sophie reçoit la notification sur sa tablette, elle file en salle. Temps de service : 11 minutes 40. La salle ne sent plus la tension.",
    module: "Module 08 · KDS Cuisine",
  },
  {
    id: "pay",
    device: "tablet",
    chapter: "Chapitre 7",
    timecode: "01:21",
    title: "Addition, CB, pourboire.",
    body:
      "Marie laisse 3 €. L'addition part automatiquement par SMS. Son profil fidélité encaisse +1 tampon (3 sur 10). Reçu imprimé en 2 lignes de papier.",
    module: "Modules 05 + 07",
  },
  {
    id: "stats",
    device: "laptop",
    chapter: "Chapitre 8",
    timecode: "01:30",
    title: "23h58 — Le manager voit le service.",
    body:
      "Tableau de bord live. CA du jour, temps de service moyen, couverts, tickets ouverts, staff en poste. Demain matin au café, il sait déjà comment arbitrer la semaine.",
    module: "Module 09 · Stats service live",
  },
];

const TOTAL_SCENES = SCENES.length;

/* ─────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const prefersReduced = useReducedMotion();

  return (
    <main className="bg-[color:var(--color-cream)] text-[color:var(--color-brown)] overflow-x-clip">
      <MiniNav />
      {prefersReduced ? (
        <StackedScenes />
      ) : (
        <>
          {/* Desktop — sticky scrollytelling */}
          <div className="hidden lg:block">
            <ScrollNarrative />
          </div>
          {/* Mobile/tablet — stacked scenes */}
          <div className="lg:hidden">
            <StackedScenes />
          </div>
        </>
      )}
      <FooterCta />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sticky mini-nav
   ───────────────────────────────────────────────────────────── */

function MiniNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[color:var(--color-brown)]/90 backdrop-blur-xl border-b border-[color:var(--color-gold)]/15"
          : "bg-[color:var(--color-brown)]/60 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-14 flex items-center justify-between text-[color:var(--color-white-warm)]">
        <a
          href="/pro"
          className="group flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[color:var(--color-white-warm)]/80 hover:text-[color:var(--color-white-warm)] transition-colors"
        >
          <span
            aria-hidden
            className="inline-block transition-transform group-hover:-translate-x-0.5"
          >
            ←
          </span>
          Retour au pitch
        </a>

        <div className="hidden sm:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-gold)]" />
          <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-white-warm)] text-sm tracking-wide">
            Voir en action
          </span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-gold)]" />
        </div>

        <div className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-[color:var(--color-gold-light)]">
          <span className="hidden md:inline-flex h-[6px] w-[6px] rounded-full bg-[color:var(--color-red)] animate-pulse" />
          <span>90 secondes</span>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Scroll narrative — the heart of the page
   Layout:
     [ vertical progress | narrative column | sticky device stage ]
   Each scene = ~100vh inside a long parent whose scrollYProgress
   maps into a [0..TOTAL_SCENES] fractional index.
   ───────────────────────────────────────────────────────────── */

function ScrollNarrative() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Smooth scrubbed progress for the left rail and timecode
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.6,
  });

  // Fractional scene index (0 .. TOTAL_SCENES)
  const sceneIndex = useTransform(
    smoothProgress,
    [0, 1],
    [0, TOTAL_SCENES - 0.001],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    return sceneIndex.on("change", (v) => {
      const i = Math.max(0, Math.min(TOTAL_SCENES - 1, Math.floor(v)));
      setActiveIdx(i);
    });
  }, [sceneIndex]);

  return (
    <section
      ref={container}
      id="scroll-narrative"
      className="relative bg-[color:var(--color-cream)]"
      style={{ height: `${TOTAL_SCENES * 100}vh` }}
      aria-label="Scénario interactif en 12 scènes"
    >
      {/* Ambient gold particle bed (subtle, fixed behind content) */}
      <GoldParticleBed />

      {/* Opening title overlay — on top of scene 1 */}
      <OpeningTitleCard progress={smoothProgress} />

      {/* Sticky stage: fills the viewport while the tall parent scrolls */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="relative h-full w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-14 pt-20 pb-8">
          <div className="grid h-full grid-cols-1 lg:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:gap-8">
            {/* Left rail — progress + timecode */}
            <div className="hidden lg:flex flex-col items-center justify-between h-full py-6">
              <ProgressRail
                progress={smoothProgress}
                sceneIndex={activeIdx}
                total={TOTAL_SCENES}
              />
            </div>

            {/* Narrative column */}
            <div className="relative flex items-center h-full">
              <NarrativeColumn activeIdx={activeIdx} />
            </div>

            {/* Device stage */}
            <div className="relative hidden lg:flex items-center justify-center h-full">
              <DeviceStage activeIdx={activeIdx} />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Vertical progress rail (left)
   ───────────────────────────────────────────────────────────── */

function ProgressRail({
  progress,
  sceneIndex,
  total,
}: {
  progress: MotionValue<number>;
  sceneIndex: number;
  total: number;
}) {
  const height = useTransform(progress, [0, 1], ["0%", "100%"]);
  const current = SCENES[sceneIndex];

  return (
    <div className="flex flex-col items-center gap-6 h-full">
      {/* Timecode counter */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] tracking-[0.3em] uppercase text-[color:var(--color-brown)]/40">
          Temps
        </span>
        <motion.span
          key={current.timecode}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[family-name:var(--font-display)] text-lg text-[color:var(--color-brown)] tabular-nums"
        >
          {current.timecode}
        </motion.span>
      </div>

      {/* The rail itself */}
      <div className="relative flex-1 w-[2px] bg-[color:var(--color-terracotta-deep)]/20 rounded-full overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute left-0 top-0 w-full"
          style={{
            height,
            background:
              "linear-gradient(to bottom, var(--color-gold-light), var(--color-gold) 40%, var(--color-red))",
          }}
        />
      </div>

      {/* Scene ticks (clickable dots) */}
      <div className="flex flex-col items-center gap-[6px]">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`block h-[6px] w-[6px] rounded-full transition-all duration-500 ${
              i === sceneIndex
                ? "bg-[color:var(--color-red)] scale-150"
                : i < sceneIndex
                  ? "bg-[color:var(--color-gold)]"
                  : "bg-[color:var(--color-brown)]/15"
            }`}
          />
        ))}
      </div>

      {/* Scene counter */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-[family-name:var(--font-display)] text-[color:var(--color-brown)] text-sm tabular-nums">
          {String(sceneIndex + 1).padStart(2, "0")}
        </span>
        <span className="h-2 w-px bg-[color:var(--color-brown)]/25" />
        <span className="text-[color:var(--color-brown)]/40 text-xs tabular-nums">
          {total}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Narrative column — cross-fades scene texts
   ───────────────────────────────────────────────────────────── */

function NarrativeColumn({ activeIdx }: { activeIdx: number }) {
  const scene = SCENES[activeIdx];
  return (
    <div className="relative w-full max-w-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          {/* Chapter + module */}
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-brown)]/45">
              {scene.chapter}
            </span>
            <span className="flex-1 h-px bg-[color:var(--color-terracotta-deep)]/25" />
            <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold)] text-lg leading-none">
              {scene.timecode}
            </span>
          </div>

          {/* Big title */}
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,4.2vw,58px)] leading-[1.05] tracking-tight text-[color:var(--color-brown)]">
            {scene.title}
          </h2>

          {/* Body */}
          <p className="text-[color:var(--color-brown)]/75 text-[17px] lg:text-lg leading-[1.65] max-w-lg">
            {scene.body}
          </p>

          {/* Module tag */}
          <div className="inline-flex items-center gap-3 pt-2">
            <span className="inline-block w-8 h-px bg-[color:var(--color-gold)]" />
            <span className="text-[11px] tracking-[0.2em] uppercase text-[color:var(--color-gold)] font-medium">
              {scene.module}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Device stage — sticky right column
   Morphs between phone / laptop / tablet frames based on scene.
   ───────────────────────────────────────────────────────────── */

function DeviceStage({ activeIdx }: { activeIdx: number }) {
  const scene = SCENES[activeIdx];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Soft gold halo behind the device */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 60% 50%, rgba(184,146,47,0.18), transparent 55%)",
        }}
      />

      {/* Device frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.device + "-" + scene.id}
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {scene.device === "phone" && <PhoneFrame sceneId={scene.id} />}
          {scene.device === "laptop" && <LaptopFrame sceneId={scene.id} />}
          {scene.device === "tablet" && <TabletFrame sceneId={scene.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHONE FRAME — 320 × 600, notch, black bezel
   ───────────────────────────────────────────────────────────── */

function PhoneFrame({ sceneId }: { sceneId: string }) {
  return (
    <div
      className="relative"
      style={{
        width: 320,
        height: 600,
        filter: "drop-shadow(0 40px 60px rgba(44,24,16,0.25))",
      }}
    >
      {/* Body */}
      <div
        className="absolute inset-0 rounded-[46px] bg-[#0C0603] p-[12px]"
        style={{
          boxShadow:
            "inset 0 0 0 1.5px #2a1c12, 0 2px 0 #000, 0 0 0 2px rgba(184,146,47,0.12)",
        }}
      >
        {/* Screen */}
        <div className="relative w-full h-full rounded-[36px] bg-[color:var(--color-white-warm)] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-[16px] z-30" />
          {/* Status bar */}
          <div className="absolute top-2 left-0 right-0 px-6 flex items-center justify-between text-[10px] text-[color:var(--color-brown)] font-semibold z-20">
            <span className="tabular-nums">20:28</span>
            <span className="flex items-center gap-1">
              <span>●●●●●</span>
              <span>􀛨</span>
            </span>
          </div>

          {/* Content */}
          <div className="absolute inset-0 pt-9">
            <PhoneSceneContent sceneId={sceneId} />
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[110px] h-[4px] bg-black rounded-full z-30" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LAPTOP FRAME — 720 × 450, macbook-style bezel
   ───────────────────────────────────────────────────────────── */

function LaptopFrame({ sceneId }: { sceneId: string }) {
  return (
    <div
      className="relative"
      style={{
        filter: "drop-shadow(0 50px 70px rgba(44,24,16,0.25))",
      }}
    >
      {/* Screen housing */}
      <div
        className="relative rounded-[16px] bg-[#0C0603] p-[10px]"
        style={{
          width: 720,
          height: 450,
          boxShadow:
            "inset 0 0 0 1.5px #2a1c12, 0 0 0 1px rgba(184,146,47,0.1)",
        }}
      >
        {/* Screen */}
        <div className="relative w-full h-full rounded-[6px] bg-[color:var(--color-white-warm)] overflow-hidden flex flex-col">
          {/* Browser chrome */}
          <div className="flex-shrink-0 h-8 bg-[#F3ECE0] flex items-center gap-2 px-3 border-b border-[color:var(--color-brown)]/8">
            <span className="flex gap-1.5">
              <span className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
            </span>
            <div className="flex-1 mx-4 h-5 rounded-[4px] bg-[color:var(--color-white-warm)] flex items-center px-2.5 border border-[color:var(--color-brown)]/10">
              <span className="text-[9px] text-[color:var(--color-brown)]/60 tabular-nums">
                {urlForScene(sceneId, "laptop")}
              </span>
            </div>
            <span className="w-3 h-3 rounded-full border border-[color:var(--color-brown)]/20" />
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-hidden">
            <LaptopSceneContent sceneId={sceneId} />
          </div>
        </div>
      </div>

      {/* Bottom edge (macbook base) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] h-[8px] rounded-b-[10px] bg-[#1a120B]"
        style={{ width: 740 }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] h-[2px] rounded-b-[3px] bg-[#0C0603]"
        style={{ width: 140 }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TABLET FRAME — for serveur POS (scene 8 + 11)
   ───────────────────────────────────────────────────────────── */

function TabletFrame({ sceneId }: { sceneId: string }) {
  return (
    <div
      className="relative"
      style={{
        width: 480,
        height: 360,
        filter: "drop-shadow(0 40px 55px rgba(44,24,16,0.22))",
      }}
    >
      <div
        className="absolute inset-0 rounded-[22px] bg-[#0C0603] p-[12px]"
        style={{
          boxShadow:
            "inset 0 0 0 1.5px #2a1c12, 0 0 0 1.5px rgba(184,146,47,0.12)",
        }}
      >
        <div className="relative w-full h-full rounded-[12px] bg-[color:var(--color-white-warm)] overflow-hidden">
          {/* Tablet top bar */}
          <div className="absolute top-1.5 left-0 right-0 px-5 flex items-center justify-between text-[9px] text-[color:var(--color-brown)]/60 z-20">
            <span>STAFF · Sophie</span>
            <span className="tabular-nums">20:31</span>
          </div>
          <div className="absolute inset-0 pt-6">
            <TabletSceneContent sceneId={sceneId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Per-scene content renderers
   Each returns a drawn mockup — NO external images.
   ───────────────────────────────────────────────────────────── */

function urlForScene(id: string, device: "laptop" | "phone"): string {
  const map: Record<string, string> = {
    search: "google.com/search?q=pizzeria+morangis",
    site: "larcenciel.fr",
    form: "larcenciel.fr/#reserver",
    email: "mail.google.com",
    admin: "larcenciel.fr/admin/reservations",
    menu: "larcenciel.fr/m/carte?table=7",
    pos: "larcenciel.fr/staff/table/7",
    kds: "larcenciel.fr/kitchen",
    ready: "larcenciel.fr/kitchen",
    pay: "larcenciel.fr/staff/table/7",
    stats: "larcenciel.fr/admin/service/ce-soir",
    arrive: "larcenciel.fr/m/carte?table=7",
  };
  return map[id] ?? `larcenciel.fr/${device === "laptop" ? "admin" : "m"}`;
}

function PhoneSceneContent({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case "search":
      return <MockSearch />;
    case "site":
      return <MockSite />;
    case "form":
      return <MockForm />;
    case "email":
      return <MockEmail />;
    case "arrive":
      return <MockTableQR />;
    case "menu":
      return <MockMenu />;
    default:
      return <MockMenu />;
  }
}

function LaptopSceneContent({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case "admin":
      return <MockAdmin />;
    case "kds":
      return <MockKdsIncoming />;
    case "ready":
      return <MockKdsReady />;
    case "stats":
      return <MockStats />;
    default:
      return <MockAdmin />;
  }
}

function TabletSceneContent({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case "pos":
      return <MockPos />;
    case "pay":
      return <MockPay />;
    default:
      return <MockPos />;
  }
}

/* ═════════════════════════════════════════════════════════════
   MOCKUPS — drawn entirely with tailwind divs
   ═════════════════════════════════════════════════════════════ */

/* 1 · Google search result */
function MockSearch() {
  return (
    <div className="w-full h-full bg-white px-4 pt-2">
      {/* Google bar */}
      <div className="flex items-center gap-2 pb-3">
        <span className="font-[family-name:var(--font-display)] text-[18px] tracking-tight">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#DB4437]">o</span>
          <span className="text-[#F4B400]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#0F9D58]">l</span>
          <span className="text-[#DB4437]">e</span>
        </span>
        <div className="flex-1 h-7 rounded-full border border-black/15 flex items-center px-3 text-[10px] text-[color:var(--color-brown)]/70 gap-2">
          <span>🔍</span>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            pizzeria morangis
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-[1px] h-[10px] bg-[color:var(--color-brown)]"
          />
        </div>
      </div>
      {/* Filters row */}
      <div className="flex gap-2 mb-3 text-[9px] text-[color:var(--color-brown)]/60 border-b border-black/10 pb-2">
        <span className="font-semibold text-[#4285F4] border-b-2 border-[#4285F4] pb-2 -mb-2">Tous</span>
        <span>Maps</span>
        <span>Images</span>
        <span>Actus</span>
      </div>
      {/* Local pack — sponsored result */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="rounded-[10px] border border-black/10 overflow-hidden mb-2"
      >
        <div
          className="h-[72px] relative"
          style={{
            background:
              "linear-gradient(135deg, #C0392B 0%, #8B2519 55%, #2C1810 100%)",
          }}
        >
          {/* fake flames pattern */}
          <div className="absolute inset-0 opacity-25 bg-noise" />
          <div className="absolute bottom-2 left-2 right-2 text-white-warm">
            <div className="text-[11px] font-[family-name:var(--font-display)] leading-tight">
              L&apos;Arc en Ciel
            </div>
            <div className="text-[8px] opacity-80">Pizzeria · Feu de bois</div>
          </div>
          <div className="absolute top-2 right-2 text-[8px] bg-white/90 text-[color:var(--color-brown)] px-1.5 py-0.5 rounded">
            OUVERT
          </div>
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-[#F4B400]">★★★★★</span>
            <span className="font-semibold text-[color:var(--color-brown)]">4,8</span>
            <span className="text-[color:var(--color-brown)]/60">(247)</span>
            <span className="text-[color:var(--color-brown)]/40">·</span>
            <span className="text-[color:var(--color-brown)]/60">€€</span>
          </div>
          <div className="text-[9px] text-[color:var(--color-brown)]/70 mt-1">
            12 Rue du Four · 400m
          </div>
          <div className="mt-1.5 flex gap-1">
            <span className="text-[8.5px] rounded-full bg-[#1A73E8] text-white px-2 py-0.5 font-semibold">
              Itinéraire
            </span>
            <span className="text-[8.5px] rounded-full border border-[#1A73E8] text-[#1A73E8] px-2 py-0.5 font-semibold">
              Appeler
            </span>
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-[8.5px] rounded-full bg-[color:var(--color-gold)] text-white px-2 py-0.5 font-semibold"
            >
              Site
            </motion.span>
          </div>
        </div>
      </motion.div>
      {/* Organic result 2 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.4 }}
        className="mt-3"
      >
        <div className="text-[8.5px] text-[color:var(--color-brown)]/60">larcenciel.fr</div>
        <div className="text-[11px] text-[#1A0DAB] underline leading-tight">
          L&apos;Arc en Ciel — Pizzeria méditerranéenne à Morangis
        </div>
        <div className="text-[8.5px] text-[color:var(--color-brown)]/70 leading-tight mt-0.5">
          Pizzas artisanales au feu de bois, réservation en ligne...
        </div>
      </motion.div>
    </div>
  );
}

/* 2 · Site vitrine hero */
function MockSite() {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Hero gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #1B0F08 0%, #2C1810 50%, #3A1E12 100%)",
        }}
      />
      {/* Ken burns flame pattern */}
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 30% 70%, rgba(192,57,43,0.55), transparent 55%), radial-gradient(ellipse at 80% 40%, rgba(184,146,47,0.35), transparent 50%)",
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Nav */}
      <div className="relative z-10 px-4 pt-4 flex items-center justify-between text-white-warm">
        <span className="text-[9px] tracking-[0.2em] uppercase opacity-80">
          ☾ Arc en Ciel
        </span>
        <span className="flex gap-1">
          <span className="w-4 h-[1px] bg-white-warm/80" />
          <span className="w-4 h-[1px] bg-white-warm/80" />
        </span>
      </div>
      {/* Hero text */}
      <div className="absolute left-4 right-4 bottom-[72px] text-white-warm">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="font-[family-name:var(--font-script)] text-[color:var(--color-gold-light)] text-base"
        >
          une pizza, un rituel
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="font-[family-name:var(--font-display)] text-[26px] leading-[1] tracking-tight mt-1"
        >
          Le feu de bois
          <br />
          <span className="italic text-[color:var(--color-gold-light)]">
            depuis 1982.
          </span>
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-[9.5px] mt-2 opacity-80 leading-relaxed"
        >
          Pâte fermentée 48h · Mozzarella di bufala Campana · Morangis
        </motion.p>
      </div>
      {/* Floating reservation CTA */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute bottom-3 left-3 right-3 z-20"
      >
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] text-center py-2.5 font-semibold text-[11px] tracking-wide shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        >
          Réserver une table →
        </motion.div>
      </motion.div>
    </div>
  );
}

/* 3 · Reservation form filling */
function MockForm() {
  const fields = useMemo(
    () => [
      { label: "Prénom", value: "Marie Alvarez" },
      { label: "Téléphone", value: "06 12 34 56 78" },
      { label: "Date", value: "Ce soir · 20h30" },
      { label: "Convives", value: "2 personnes" },
    ],
    [],
  );
  return (
    <div className="w-full h-full bg-[color:var(--color-cream)] px-4 pt-4 pb-3 relative">
      <div className="text-[9px] tracking-[0.25em] uppercase text-[color:var(--color-gold)]">
        Réservation
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-[20px] leading-tight text-[color:var(--color-brown)] mt-1">
        Votre table
        <br />
        <span className="italic">en trois champs.</span>
      </h3>

      <div className="flex flex-col gap-2 mt-3">
        {fields.map((f, i) => (
          <motion.label
            key={f.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }}
            className="rounded-[10px] bg-white-warm border border-[color:var(--color-brown)]/10 px-3 py-2"
          >
            <span className="block text-[8px] tracking-[0.22em] uppercase text-[color:var(--color-brown)]/50">
              {f.label}
            </span>
            <TypingField text={f.value} delay={0.3 + i * 0.25} />
          </motion.label>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-3"
      >
        <div className="w-full rounded-full bg-[color:var(--color-red)] text-white-warm text-center py-2.5 font-semibold text-[11px] tracking-wide">
          Confirmer ma table
        </div>
      </motion.div>
    </div>
  );
}

function TypingField({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="block mt-0.5 text-[11px] text-[color:var(--color-brown)]"
    >
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: "auto" }}
        transition={{ delay, duration: 0.8 }}
        className="inline-block overflow-hidden whitespace-nowrap align-bottom"
      >
        {text}
      </motion.span>
    </motion.span>
  );
}

/* 4 · Confirmation email */
function MockEmail() {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Gmail-ish top bar */}
      <div className="flex-shrink-0 h-8 bg-[#F6F8FC] flex items-center gap-2 px-3 border-b border-black/5">
        <span className="text-[10px] text-[#5F6368]">← Retour</span>
        <span className="text-[10px] text-[#5F6368] ml-auto">20:23</span>
      </div>

      <div className="flex-1 overflow-hidden px-3 pt-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-[10px] text-[color:var(--color-brown)]/70">
            <span className="font-semibold text-[color:var(--color-brown)]">
              L&apos;Arc en Ciel
            </span>{" "}
            &lt;contact@larcenciel.fr&gt;
          </div>
          <div className="text-[9px] text-[color:var(--color-brown)]/50 mt-0.5">
            À : marie.alvarez@…
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-3 rounded-lg border border-[color:var(--color-brown)]/10 overflow-hidden"
        >
          {/* email header */}
          <div
            className="h-16 relative flex items-end px-3 pb-2"
            style={{
              background:
                "linear-gradient(135deg, #2C1810, #5C3D2E 80%, #B8922F)",
            }}
          >
            <div className="font-[family-name:var(--font-display)] text-white-warm text-[14px] leading-tight">
              <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold-light)] text-[11px] block leading-none">
                Bonsoir Marie,
              </span>
              <span>Votre table vous attend.</span>
            </div>
          </div>
          {/* Reservation card */}
          <div className="bg-[color:var(--color-cream)] p-3">
            <div className="grid grid-cols-3 gap-1 text-[color:var(--color-brown)]">
              <div>
                <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">
                  Quand
                </div>
                <div className="font-[family-name:var(--font-display)] text-[11px] mt-0.5 leading-tight">
                  Vendredi
                  <br />
                  20h30
                </div>
              </div>
              <div>
                <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">
                  Où
                </div>
                <div className="font-[family-name:var(--font-display)] text-[11px] mt-0.5 leading-tight">
                  Salle
                  <br />
                  Table 7
                </div>
              </div>
              <div>
                <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">
                  Nbre
                </div>
                <div className="font-[family-name:var(--font-display)] text-[11px] mt-0.5 leading-tight">
                  2<br />
                  couverts
                </div>
              </div>
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="origin-left my-3 h-px bg-[color:var(--color-terracotta-deep)]/40"
            />

            <div className="text-[8.5px] text-[color:var(--color-brown)]/70 leading-relaxed">
              En cas d&apos;imprévu, répondez simplement à cet email. Notre feu
              de bois chauffera pour vous dès 19h.
            </div>

            <div className="mt-2 rounded-full bg-[color:var(--color-red)] text-white-warm text-center py-1.5 text-[9px] font-semibold tracking-wide">
              Ajouter à mon agenda
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* 5 · Admin dashboard with highlighted reservation */
function MockAdmin() {
  const rows = [
    { name: "Laurent D.", time: "19:30", cov: 4, source: "TheFork", st: "Arrivé" },
    { name: "Famille Biret", time: "20:00", cov: 3, source: "Site", st: "Arrivé" },
    {
      name: "Marie Alvarez",
      time: "20:30",
      cov: 2,
      source: "Site",
      st: "Nouveau",
      highlight: true,
    },
    { name: "Pierre L.", time: "21:00", cov: 6, source: "Google", st: "Confirmé" },
    { name: "Anaïs M.", time: "21:15", cov: 2, source: "TheFork", st: "Confirmé" },
  ];
  return (
    <div className="w-full h-full flex bg-[color:var(--color-cream)] text-[color:var(--color-brown)]">
      {/* Sidebar */}
      <aside className="w-[140px] bg-[color:var(--color-brown)] text-white-warm flex-shrink-0 py-3 px-3 flex flex-col gap-3">
        <div className="font-[family-name:var(--font-display)] text-[12px] tracking-wide">
          Arc en Ciel
        </div>
        <div className="flex flex-col gap-1 text-[9.5px]">
          <span className="rounded bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-light)] px-2 py-1.5 font-semibold">
            Réservations
          </span>
          <span className="px-2 py-1.5 opacity-60">Carte</span>
          <span className="px-2 py-1.5 opacity-60">Clients</span>
          <span className="px-2 py-1.5 opacity-60">Fidélité</span>
          <span className="px-2 py-1.5 opacity-60">Stats</span>
          <span className="px-2 py-1.5 opacity-60">Cuisine</span>
        </div>
        <div className="mt-auto text-[8px] opacity-50 tracking-[0.2em] uppercase">
          v1.4 · Supabase
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[8px] tracking-[0.25em] uppercase opacity-50">
              Vendredi 6 Décembre
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-[18px] leading-tight">
              Service du soir
            </h4>
          </div>
          <div className="flex gap-1.5 text-[8px]">
            <span className="rounded-full px-2 py-1 bg-white-warm border border-[color:var(--color-brown)]/10 font-semibold">
              42 couverts
            </span>
            <span className="rounded-full px-2 py-1 bg-[color:var(--color-gold)]/20 text-[color:var(--color-brown)] font-semibold">
              +3 à confirmer
            </span>
          </div>
        </div>

        {/* Table header */}
        <div className="mt-3 rounded-[6px] overflow-hidden border border-[color:var(--color-brown)]/8">
          <div className="grid grid-cols-[1fr_60px_50px_80px_80px] gap-2 px-3 py-1.5 bg-[color:var(--color-brown)]/5 text-[8px] tracking-[0.15em] uppercase opacity-60 font-semibold">
            <span>Client</span>
            <span>Heure</span>
            <span>Cvts</span>
            <span>Source</span>
            <span>Statut</span>
          </div>
          <div className="bg-white-warm">
            {rows.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                className={`grid grid-cols-[1fr_60px_50px_80px_80px] gap-2 px-3 py-2 text-[10px] border-b border-[color:var(--color-brown)]/5 last:border-b-0 items-center ${
                  r.highlight ? "bg-[color:var(--color-gold)]/14" : ""
                }`}
                style={
                  r.highlight
                    ? {
                        boxShadow:
                          "inset 3px 0 0 0 var(--color-red)",
                      }
                    : undefined
                }
              >
                <span className="font-medium flex items-center gap-1.5">
                  {r.highlight && (
                    <motion.span
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-red)]"
                    />
                  )}
                  {r.name}
                </span>
                <span className="tabular-nums opacity-75">{r.time}</span>
                <span className="tabular-nums opacity-75">{r.cov}</span>
                <span className="text-[8px] opacity-70">{r.source}</span>
                <span
                  className={`text-[8px] font-semibold ${
                    r.st === "Nouveau"
                      ? "text-[color:var(--color-red)]"
                      : r.st === "Arrivé"
                        ? "text-[color:var(--color-gold)]"
                        : "text-[color:var(--color-brown)]/60"
                  }`}
                >
                  {r.st === "Nouveau" && "● "}
                  {r.st}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tooltip card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="mt-3 rounded-[8px] border border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/8 p-2.5 flex items-center gap-2.5"
        >
          <span className="text-[16px]">🔔</span>
          <div className="flex-1 text-[9px]">
            <div className="font-semibold text-[color:var(--color-brown)]">
              Nouvelle résa — Marie Alvarez
            </div>
            <div className="opacity-70">
              Arrivée dans 2 min · Source : site vitrine · Première visite
            </div>
          </div>
          <span className="text-[8px] font-semibold opacity-60">il y a 0s</span>
        </motion.div>
      </div>
    </div>
  );
}

/* 6 · Table with QR code (phone held by Marie at the table) */
function MockTableQR() {
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #5C3D2E 0%, #2C1810 70%)",
      }}
    >
      {/* Wood grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)",
        }}
      />
      {/* Plate circle */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute left-1/2 -translate-x-1/2 top-[54%] -translate-y-1/2 w-[220px] h-[220px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, #FDF8F0 0%, #E8D5C0 60%, #C4956A 100%)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      />

      {/* QR stand on the left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute left-4 top-[38%] w-[88px]"
      >
        <div className="rounded-[4px] bg-white-warm p-2 shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <div className="text-[7px] tracking-[0.2em] uppercase text-[color:var(--color-brown)]/50 text-center">
            Table 7
          </div>
          <div className="font-[family-name:var(--font-display)] text-[10px] text-center text-[color:var(--color-brown)] leading-tight mt-0.5">
            Scannez
            <br />
            <span className="italic">la carte</span>
          </div>
          <div className="mt-1.5 aspect-square w-full bg-[color:var(--color-brown)] p-1 rounded">
            <QrPattern />
          </div>
        </div>
      </motion.div>

      {/* Glass */}
      <div className="absolute right-5 top-[32%] w-[40px] h-[60px] rounded-b-[4px] bg-gradient-to-b from-white/40 to-white/10 border-t border-white/50" />

      {/* Caption */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white-warm">
        <div className="font-[family-name:var(--font-script)] text-[color:var(--color-gold-light)] text-lg leading-none">
          Bienvenue,
        </div>
        <div className="text-[9px] tracking-[0.22em] uppercase opacity-70 mt-1">
          Table 7 · 20:30
        </div>
      </div>
    </div>
  );
}

function QrPattern() {
  // A deterministic 9x9 QR-ish pattern drawn with a grid
  const cells = useMemo(() => {
    const a: boolean[] = [];
    for (let i = 0; i < 81; i++) {
      // corner finders
      const x = i % 9;
      const y = Math.floor(i / 9);
      const corner =
        (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      if (corner) {
        const cx = x < 3 ? x : x - 6;
        const cy = y < 3 ? y : y - 6;
        const isRing =
          cx === 0 || cx === 2 || cy === 0 || cy === 2 || (cx === 1 && cy === 1);
        a.push(isRing);
      } else {
        // deterministic noise
        a.push(((i * 37 + 13) % 7) % 3 !== 0);
      }
    }
    return a;
  }, []);
  return (
    <div className="grid grid-cols-9 gap-[1px] w-full h-full">
      {cells.map((on, i) => (
        <span
          key={i}
          className={`w-full aspect-square ${on ? "bg-white-warm" : "bg-[color:var(--color-brown)]"}`}
        />
      ))}
    </div>
  );
}

/* 7 · Menu /m/carte (QR menu) */
function MockMenu() {
  return (
    <div className="w-full h-full bg-[color:var(--color-cream)] overflow-hidden flex flex-col">
      {/* Menu top bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-[color:var(--color-brown)] text-white-warm flex items-center justify-between">
        <div>
          <div className="font-[family-name:var(--font-script)] text-[color:var(--color-gold-light)] text-[13px] leading-none">
            la carte
          </div>
          <div className="text-[7.5px] tracking-[0.25em] uppercase opacity-70 mt-1">
            Table 7
          </div>
        </div>
        <span className="rounded-full bg-white-warm/10 px-2 py-1 text-[8px]">
          🔍 Rechercher
        </span>
      </div>
      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-3 px-4 py-2 bg-[color:var(--color-cream-dark)] text-[9px] border-b border-[color:var(--color-brown)]/8 overflow-hidden">
        <span className="font-semibold text-[color:var(--color-red)] border-b-2 border-[color:var(--color-red)] pb-1 -mb-[9px]">
          Pizzas
        </span>
        <span className="opacity-60">Antipasti</span>
        <span className="opacity-60">Grillades</span>
        <span className="opacity-60">Desserts</span>
      </div>

      {/* Scrollable menu items */}
      <motion.div
        className="flex-1 overflow-hidden"
        animate={{ y: [0, -30, -60, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex flex-col">
          {[
            {
              name: "Margherita",
              desc: "San Marzano · Bufala Campana · Basilic",
              p: "12",
              fav: true,
            },
            {
              name: "Regina dei Boschi",
              desc: "Cèpes · Truffe d'été · Roquette",
              p: "18",
            },
            {
              name: "Napoletana",
              desc: "Anchois · Câpres · Olives Taggiasche",
              p: "14",
            },
            {
              name: "Diavola",
              desc: "Salami piquant Calabrese · Piment",
              p: "15",
            },
            {
              name: "Quatre Fromages",
              desc: "Gorgonzola · Parmesan · Chèvre · Mozza",
              p: "16",
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-start justify-between gap-3 px-4 py-2.5 border-b border-[color:var(--color-brown)]/8 bg-[color:var(--color-cream)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-[family-name:var(--font-display)] text-[12px] text-[color:var(--color-brown)] leading-tight">
                    {item.name}
                  </span>
                  {item.fav && (
                    <span className="text-[color:var(--color-red)] text-[10px]">
                      ♥
                    </span>
                  )}
                </div>
                <div className="text-[8.5px] text-[color:var(--color-brown)]/60 leading-snug mt-0.5">
                  {item.desc}
                </div>
              </div>
              <div className="font-[family-name:var(--font-display)] text-[11px] text-[color:var(--color-gold)]">
                {item.p}€
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating server call */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <div className="rounded-full bg-[color:var(--color-brown)] text-white-warm text-center py-1.5 text-[9.5px] font-semibold tracking-wide">
          🔔 Appeler le serveur
        </div>
      </div>
    </div>
  );
}

/* 8 · POS /staff/table/7 — adding items (tablet) */
function MockPos() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 900);
    return () => clearInterval(id);
  }, []);
  const items = [
    { name: "Margherita", p: 12 },
    { name: "Burrata entrée", p: 10 },
    { name: "Pichet rouge 50cl", p: 14 },
  ];
  const total = items
    .slice(0, Math.max(1, step))
    .reduce((s, i) => s + i.p, 0);

  return (
    <div className="w-full h-full bg-[color:var(--color-cream)] flex">
      {/* Menu grid */}
      <div className="flex-1 p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[8px] tracking-[0.25em] uppercase opacity-50">
              Sophie · Sortie 3
            </div>
            <div className="font-[family-name:var(--font-display)] text-[14px] leading-tight">
              Table 7 · Marie A.
            </div>
          </div>
          <div className="text-[9px] opacity-60 tabular-nums">20:31</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { name: "Margherita", p: 12, type: "pizza", hot: step >= 1 },
            { name: "Regina", p: 18, type: "pizza" },
            { name: "Diavola", p: 15, type: "pizza" },
            { name: "Burrata", p: 10, type: "antipasti", hot: step >= 2 },
            { name: "Bruschetta", p: 9, type: "antipasti" },
            { name: "Pichet 50cl", p: 14, type: "vin", hot: step >= 3 },
            { name: "Pichet 25cl", p: 8, type: "vin" },
            { name: "Eau pét.", p: 4, type: "vin" },
            { name: "Tiramisu", p: 7, type: "dessert" },
          ].map((it, i) => (
            <motion.div
              key={i}
              animate={
                it.hot
                  ? {
                      scale: [1, 1.08, 1],
                      backgroundColor: [
                        "#FFFDF9",
                        "rgba(184,146,47,0.25)",
                        "#FFFDF9",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 0.6 }}
              className="rounded-[6px] bg-white-warm border border-[color:var(--color-brown)]/10 p-1.5 text-[9px] flex flex-col justify-between min-h-[50px]"
            >
              <span className="font-semibold leading-tight">{it.name}</span>
              <span className="text-[color:var(--color-gold)] font-[family-name:var(--font-display)]">
                {it.p}€
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ticket sidebar */}
      <div className="w-[160px] flex-shrink-0 bg-[color:var(--color-brown)] text-white-warm p-3 flex flex-col">
        <div className="text-[8px] tracking-[0.2em] uppercase opacity-60 mb-2">
          Ticket table 7
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          {items.slice(0, Math.max(1, step)).map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between text-[9px] border-b border-white-warm/10 pb-1"
            >
              <span className="truncate flex-1">{it.name}</span>
              <span className="tabular-nums text-[color:var(--color-gold-light)]">
                {it.p}€
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-[color:var(--color-gold)]/30 flex items-center justify-between">
          <span className="text-[9px] opacity-60">Total</span>
          <span className="font-[family-name:var(--font-display)] text-[14px] text-[color:var(--color-gold-light)] tabular-nums">
            {total}€
          </span>
        </div>
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="mt-2 rounded bg-[color:var(--color-red)] text-center py-1.5 text-[9px] font-semibold"
        >
          Envoyer cuisine →
        </motion.div>
      </div>
    </div>
  );
}

/* 9 · KDS — new ticket appearing */
function MockKdsIncoming() {
  return <KdsGrid highlightNew ticketGreen={false} />;
}

/* 10 · KDS — ticket going green */
function MockKdsReady() {
  return <KdsGrid highlightNew={false} ticketGreen />;
}

function KdsGrid({
  highlightNew,
  ticketGreen,
}: {
  highlightNew: boolean;
  ticketGreen: boolean;
}) {
  const tickets = [
    {
      t: "T.4",
      age: "08:24",
      items: ["2× Margherita", "1× Bruschetta", "1× Tiramisu"],
      state: "cooking" as const,
    },
    {
      t: "T.2",
      age: "03:12",
      items: ["1× Regina", "1× Salade"],
      state: "cooking" as const,
    },
    {
      t: "T.7",
      age: "00:04",
      items: ["1× Margherita", "1× Burrata", "Pichet 50cl"],
      state: ticketGreen ? ("ready" as const) : ("new" as const),
      highlight: true,
    },
    {
      t: "T.6",
      age: "05:48",
      items: ["2× Diavola", "1× Tiramisu"],
      state: "cooking" as const,
    },
  ];
  return (
    <div className="w-full h-full bg-[color:var(--color-brown)] text-white-warm p-3">
      {/* Header strip */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.25em] uppercase opacity-60">
            Cuisine · Chef Luca
          </div>
          <div className="font-[family-name:var(--font-display)] text-[16px] leading-none mt-0.5">
            {ticketGreen ? "Service en rythme" : "Nouveau ticket"}
          </div>
        </div>
        <div className="flex gap-2 text-[8px] opacity-70">
          <span className="rounded-full bg-white-warm/10 px-2 py-1">
            4 en cours
          </span>
          <span className="rounded-full bg-[color:var(--color-gold)]/20 text-[color:var(--color-gold-light)] px-2 py-1 font-semibold tabular-nums">
            Moy. 11:40
          </span>
        </div>
      </div>
      {/* Ticket grid */}
      <div className="grid grid-cols-4 gap-2 h-[calc(100%-44px)]">
        {tickets.map((tk, i) => {
          const color =
            tk.state === "ready"
              ? "#28C840"
              : tk.state === "new"
                ? "var(--color-red)"
                : "var(--color-gold-light)";
          return (
            <motion.div
              key={tk.t}
              initial={
                tk.highlight && highlightNew
                  ? { y: -30, opacity: 0, scale: 0.96 }
                  : false
              }
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: tk.highlight ? 0.2 : i * 0.05, duration: 0.5 }}
              className="relative rounded-[6px] bg-[#1a120B] border p-2 flex flex-col"
              style={{
                borderColor:
                  tk.highlight && highlightNew
                    ? "var(--color-red)"
                    : "rgba(255,253,249,0.08)",
              }}
            >
              {tk.highlight && highlightNew && (
                <motion.div
                  aria-hidden
                  className="absolute inset-0 rounded-[6px] border-2 border-[color:var(--color-red)] pointer-events-none"
                  animate={{ opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <div className="flex items-center justify-between">
                <span
                  className="font-[family-name:var(--font-display)] text-[18px] leading-none"
                  style={{ color }}
                >
                  {tk.t}
                </span>
                <span className="text-[8px] opacity-60 tabular-nums">
                  {tk.age}
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-2 flex-1">
                {tk.items.map((it) => (
                  <div
                    key={it}
                    className="flex items-center gap-1.5 text-[9px]"
                  >
                    <motion.span
                      className="w-[7px] h-[7px] rounded-full border"
                      style={{
                        borderColor: color,
                        backgroundColor:
                          tk.state === "ready" ? color : "transparent",
                      }}
                      animate={
                        tk.highlight && ticketGreen
                          ? { scale: [1, 1.4, 1] }
                          : undefined
                      }
                      transition={{ duration: 0.5 }}
                    />
                    <span
                      className={
                        tk.state === "ready" ? "line-through opacity-60" : ""
                      }
                    >
                      {it}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-2 rounded text-center py-1 text-[8.5px] font-semibold"
                style={{
                  backgroundColor:
                    tk.state === "ready"
                      ? "#28C84025"
                      : tk.highlight && highlightNew
                        ? "var(--color-red)"
                        : "rgba(255,253,249,0.08)",
                  color:
                    tk.state === "ready"
                      ? "#28C840"
                      : tk.highlight && highlightNew
                        ? "white"
                        : "rgba(255,253,249,0.7)",
                }}
              >
                {tk.state === "ready"
                  ? "✓ Prêt"
                  : tk.state === "new"
                    ? "Nouveau — Démarrer"
                    : "En cuisson"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* 11 · Payment — CB + tip */
function MockPay() {
  return (
    <div className="w-full h-full bg-[color:var(--color-cream)] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-[family-name:var(--font-display)] text-[14px]">
          Table 7 · Addition
        </div>
        <div className="text-[8px] tracking-[0.2em] uppercase opacity-60">
          Paiement
        </div>
      </div>

      <div className="flex-1 flex gap-3">
        {/* Bill summary */}
        <div className="flex-1 bg-white-warm rounded-[8px] border border-[color:var(--color-brown)]/10 p-3 text-[10px] flex flex-col">
          <div className="flex justify-between">
            <span>Margherita</span>
            <span className="tabular-nums">12,00</span>
          </div>
          <div className="flex justify-between">
            <span>Burrata</span>
            <span className="tabular-nums">10,00</span>
          </div>
          <div className="flex justify-between">
            <span>Pichet 50cl</span>
            <span className="tabular-nums">14,00</span>
          </div>
          <div className="flex justify-between mt-1 opacity-60">
            <span>Service (compris)</span>
            <span className="tabular-nums">—</span>
          </div>
          <div className="mt-auto pt-2 border-t border-dashed border-[color:var(--color-brown)]/20 flex justify-between text-[11px] font-semibold">
            <span>Sous-total</span>
            <span className="tabular-nums">36,00 €</span>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-between text-[10px] mt-1 text-[color:var(--color-gold)]"
          >
            <span>+ Pourboire</span>
            <span className="tabular-nums font-semibold">3,00 €</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-1 flex justify-between text-[13px] font-[family-name:var(--font-display)] text-[color:var(--color-red)]"
          >
            <span>Total</span>
            <span className="tabular-nums">39,00 €</span>
          </motion.div>
        </div>

        {/* CB + reward panel */}
        <div className="w-[190px] flex-shrink-0 flex flex-col gap-2">
          <motion.div
            initial={{ rotateY: 20, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="rounded-[8px] p-3 text-white-warm"
            style={{
              background:
                "linear-gradient(135deg, #2C1810, #5C3D2E 60%, #B8922F)",
            }}
          >
            <div className="text-[7px] tracking-[0.2em] uppercase opacity-70">
              Carte encaissée
            </div>
            <div className="font-[family-name:var(--font-display)] text-[13px] mt-1 tabular-nums">
              •••• 4290
            </div>
            <div className="flex items-center justify-between mt-2 text-[7.5px] opacity-70">
              <span>VISA</span>
              <span>12/28</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-[8px] bg-[color:var(--color-gold)]/15 border border-[color:var(--color-gold)] p-2.5"
          >
            <div className="text-[7px] tracking-[0.2em] uppercase text-[color:var(--color-gold)] font-semibold">
              Fidélité · +1 tampon
            </div>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-[11px] h-[11px] rounded-full ${
                    i < 3
                      ? "bg-[color:var(--color-gold)]"
                      : "bg-[color:var(--color-brown)]/15"
                  } ${i === 2 ? "ring-2 ring-[color:var(--color-red)] ring-offset-1" : ""}`}
                />
              ))}
            </div>
            <div className="text-[8px] opacity-70 mt-1.5">
              3 / 10 · dans 7 visites, pizza offerte
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 rounded-full bg-[color:var(--color-red)] text-white-warm text-center py-2 text-[10.5px] font-semibold tracking-wide"
      >
        ✓ Paiement validé · Reçu SMS envoyé
      </motion.div>
    </div>
  );
}

/* 12 · Service live stats */
function MockStats() {
  return (
    <div className="w-full h-full bg-[color:var(--color-brown)] text-white-warm p-4 overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.25em] uppercase opacity-60">
            Service · Vendredi
          </div>
          <div className="font-[family-name:var(--font-display)] text-[16px]">
            Ce soir
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-[color:var(--color-gold-light)]">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-gold)]"
          />
          <span>Live · 23:58</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { k: "2 140 €", l: "Chiffre du soir", d: "+18% vs moy." },
          { k: "58", l: "Couverts", d: "100% taux rempl." },
          { k: "11:40", l: "Temps moy.", d: "-2min vs cible" },
          { k: "72 €", l: "Ticket moyen", d: "+6 € vs jeudi" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.l}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.45 }}
            className="rounded-[6px] bg-white-warm/5 border border-[color:var(--color-gold)]/15 p-2"
          >
            <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">
              {kpi.l}
            </div>
            <div className="font-[family-name:var(--font-display)] text-[18px] text-[color:var(--color-gold-light)] mt-1 tabular-nums">
              {kpi.k}
            </div>
            <div className="text-[7.5px] text-[color:var(--color-gold-light)]/70 mt-0.5">
              {kpi.d}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-3 rounded-[6px] bg-white-warm/5 border border-[color:var(--color-gold)]/15 p-3">
        <div className="flex items-center justify-between text-[8px] opacity-60 mb-2 tracking-[0.2em] uppercase">
          <span>Timeline service</span>
          <span>19h → 00h</span>
        </div>
        {/* Bars */}
        <div className="flex items-end gap-[3px] h-[76px]">
          {[
            22, 34, 48, 62, 78, 96, 90, 82, 70, 58, 44, 30, 18, 12,
          ].map((h, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.5 }}
              className="origin-bottom flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background:
                  i === 7
                    ? "linear-gradient(to top, var(--color-red), var(--color-gold-light))"
                    : "linear-gradient(to top, var(--color-gold), var(--color-gold-light))",
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[7.5px] opacity-50 mt-1 tabular-nums">
          <span>19h</span>
          <span>20h30</span>
          <span>22h</span>
          <span>00h</span>
        </div>
      </div>

      {/* Running orders strip */}
      <div className="mt-3 flex items-center gap-2 text-[8.5px]">
        <span className="rounded-full bg-[color:var(--color-gold)]/20 text-[color:var(--color-gold-light)] px-2 py-0.5 font-semibold">
          4 tables en cours
        </span>
        <span className="rounded-full bg-white-warm/10 px-2 py-0.5 opacity-80">
          2 départs imminents
        </span>
        <span className="rounded-full bg-white-warm/10 px-2 py-0.5 opacity-80">
          Service en rythme ✓
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Opening overlay title card — fades out during scene 1
   ───────────────────────────────────────────────────────────── */

function OpeningTitleCard({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.02, 0.055], [1, 1, 0]);
  const y = useTransform(progress, [0, 0.055], [0, -30]);
  return (
    <motion.div
      aria-hidden
      style={{ opacity, y }}
      className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center"
    >
      <div className="flex flex-col items-center gap-2 text-center px-6 pt-6">
        <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold)] text-xl leading-none">
          pilote
        </span>
        <span className="text-[10px] tracking-[0.35em] uppercase text-[color:var(--color-brown)]/60">
          Un service complet en 90 secondes — scrollez
        </span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Ambient particle bed (fixed, cream bg, subtle)
   ───────────────────────────────────────────────────────────── */

function GoldParticleBed() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Warm radial */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 15%, rgba(184,146,47,0.06), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(192,57,43,0.05), transparent 55%)",
        }}
      />
      {/* Gold particles */}
      <div className="sticky top-0 h-screen">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute block w-[3px] h-[3px] rounded-full bg-[color:var(--color-gold)]"
            style={{
              left: `${(i * 53 + 7) % 100}%`,
              top: `${(i * 37 + 11) % 100}%`,
              opacity: 0.15 + ((i * 17) % 50) / 100,
            }}
            animate={{
              y: [0, -24, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 6 + (i % 5),
              repeat: Infinity,
              delay: (i % 7) * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mobile: stacked scenes — no sticky, no scrubbing.
   Each scene fades-in on entry via whileInView.
   ───────────────────────────────────────────────────────────── */

function StackedScenes() {
  return (
    <section className="relative pt-24 pb-20 px-5 sm:px-8 bg-[color:var(--color-cream)]">
      <div className="text-center mb-14">
        <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold)] text-2xl block leading-none">
          pilote
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] sm:text-5xl leading-tight tracking-tight mt-2">
          Un service
          <br />
          <span className="italic">en 12 scènes.</span>
        </h1>
        <p className="text-[color:var(--color-brown)]/60 text-sm mt-4 max-w-md mx-auto">
          Scrollez — chaque scène révèle un module du pack en action.
        </p>
      </div>

      <ol className="flex flex-col gap-16 max-w-xl mx-auto">
        {SCENES.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-[family-name:var(--font-display)] text-[color:var(--color-gold)] text-3xl tabular-nums leading-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 h-px bg-[color:var(--color-terracotta-deep)]/25" />
              <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold)] text-lg leading-none">
                {s.timecode}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl leading-[1.1]">
              {s.title}
            </h2>
            <p className="text-[color:var(--color-brown)]/75 leading-relaxed">
              {s.body}
            </p>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--color-gold)] font-medium">
              {s.module}
            </div>
            <div className="mt-2 rounded-2xl overflow-hidden bg-[color:var(--color-cream-dark)] border border-[color:var(--color-brown)]/10 flex items-center justify-center p-4 sm:p-6">
              <div className="scale-[0.7] sm:scale-90 origin-center">
                {s.device === "phone" && <PhoneFrame sceneId={s.id} />}
                {s.device === "laptop" && <LaptopFrame sceneId={s.id} />}
                {s.device === "tablet" && <TabletFrame sceneId={s.id} />}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Footer CTA
   ───────────────────────────────────────────────────────────── */

function FooterCta() {
  return (
    <section
      id="cta"
      className="relative bg-[color:var(--color-brown)] text-[color:var(--color-white-warm)] overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 15% 30%, rgba(184,146,47,0.22), transparent 60%), radial-gradient(ellipse at 85% 70%, rgba(192,57,43,0.12), transparent 55%)",
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-noise opacity-40" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-10 py-24 lg:py-32 flex flex-col items-center text-center gap-8">
        <span className="font-[family-name:var(--font-script)] text-[color:var(--color-gold-light)] text-3xl leading-none">
          générique de fin
        </span>

        <h2 className="font-[family-name:var(--font-display)] text-[44px] sm:text-6xl lg:text-[80px] leading-[1.02] tracking-tight">
          Prêt à transformer
          <br />
          <span className="italic text-[color:var(--color-gold-light)]">
            votre restaurant ?
          </span>
        </h2>

        <p className="max-w-2xl text-[color:var(--color-white-warm)]/70 text-lg leading-relaxed">
          Vous venez de voir le film. Maintenant, touchez le produit — ou
          parlez-nous directement : on répond en moins de 4 heures.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener"
            className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-brown)] px-8 py-4 font-semibold overflow-hidden"
          >
            <span className="relative z-10">Essayer la démo live</span>
            <span
              aria-hidden
              className="relative z-10 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
            <span className="absolute inset-0 bg-[color:var(--color-gold-light)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </a>
          <a
            href="/pro#contact"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-[color:var(--color-white-warm)]/25 px-8 py-4 font-semibold hover:bg-[color:var(--color-white-warm)]/5 transition-colors"
          >
            Parler à un humain
          </a>
        </div>

        <div className="pt-8 flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[color:var(--color-white-warm)]/50">
          <span className="h-[5px] w-[5px] rounded-full bg-[color:var(--color-gold)]" />
          <span>Retour au pitch</span>
          <span className="h-[5px] w-[5px] rounded-full bg-[color:var(--color-gold)]" />
        </div>
        <a
          href="/pro"
          className="text-[color:var(--color-white-warm)]/80 hover:text-[color:var(--color-white-warm)] text-sm underline underline-offset-4 decoration-[color:var(--color-gold)]/50 hover:decoration-[color:var(--color-gold)]"
        >
          ← /pro
        </a>
      </div>
    </section>
  );
}
