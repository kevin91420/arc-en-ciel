"use client";

/**
 * /admin/parcours-demo — Guide pas-à-pas pour montrer le produit à un
 * prospect en temps réel.
 *
 * 12 étapes ordonnées qui couvrent un service complet, du config initiale
 * à la clôture en fin de soirée. Chaque étape :
 *   - Pourquoi c'est important (1 phrase)
 *   - Le geste à faire (lien direct)
 *   - Le pitch à dire (script)
 *   - Une checkbox pour suivre où on en est
 *
 * Bonus : bouton "Charger un scénario démo" qui peuple la DB avec 8
 * commandes en cours, 3 réservations, du CA, des clients VIP. Le resto
 * paraît plein quand tu le montres au prospect.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  id: string;
  zone: "setup" | "service" | "encaissement" | "manager";
  number: number;
  title: string;
  why: string;
  action: { label: string; href: string; openInNewTab?: boolean };
  pitch: string;
  highlight?: string;
}

const STEPS: Step[] = [
  /* ── Setup (avant le service) ── */
  {
    id: "branding",
    zone: "setup",
    number: 1,
    title: "Personnalisation & identité",
    why: "Le restaurant est white-label : nom, logo, couleurs, infos légales sont les leurs en 30s.",
    action: { label: "Voir les paramètres", href: "/admin/parametres" },
    pitch:
      "Regarde — le nom, les couleurs, le SIRET, la TVA, les horaires : tout est éditable depuis ici. Aucun code, aucun ticket de support à faire. Et ça apparaît partout : tickets cuisine, addition, QR menu, page d'accueil.",
    highlight: "Modifie un détail en live — couleur ou tagline — et montre-leur que ça change instantanément.",
  },
  {
    id: "tables",
    zone: "setup",
    number: 2,
    title: "Plan de salle 2D",
    why: "Le restaurateur dessine SON plan exact — drag & drop, formes (ronde/carrée), zones (Salle/Terrasse/Bar).",
    action: { label: "Configurer le plan", href: "/admin/parametres/tables" },
    pitch:
      "Drag & drop des tables. Forme ronde, carrée, rectangulaire. Capacité 1-20. Zones libres. Toi tu reproduis ton vrai plan en 5 min — Tiller te facture 200€ pour ça.",
    highlight: "Glisse une table sur le canvas. Change la forme. Ils voient le wow factor.",
  },
  {
    id: "menu",
    zone: "setup",
    number: 3,
    title: "Carte (avec photos, variantes, suppléments)",
    why: "Édition complète du menu sans code : prix, photos, tags, signature, variantes (taille S/M/L), suppléments tarifés.",
    action: { label: "Ouvrir l'éditeur", href: "/admin/menu" },
    pitch:
      "Vous changez un prix le matin pour le service du soir ? 5 secondes, ici. Pas de support à appeler. Pareil pour les photos, les descriptions, les nouveautés saisonnières.",
    highlight: "Modifie le prix d'un plat en live, refresh /carte dans un autre onglet, le prix a changé.",
  },
  {
    id: "combos",
    zone: "setup",
    number: 4,
    title: "Formules (Menu Midi, etc.)",
    why: "Combos à prix fixe avec choix multiples — le must français.",
    action: { label: "Gérer les formules", href: "/admin/menu/combos" },
    pitch:
      "Menu Midi 18€ : 1 entrée parmi 3 + 1 plat parmi 5 + 1 dessert parmi 3. Au POS, le serveur tape \"Menu Midi\", choisit, et le ticket cuisine sort en 3 lignes mais l'addition affiche 18€ pile.",
  },
  {
    id: "fidelite",
    zone: "setup",
    number: 5,
    title: "Programme de fidélité",
    why: "Cartes à tampons digitales, accessibles depuis le QR menu — gain de récurrence sans installer une app.",
    action: { label: "Configurer la fidélité", href: "/admin/fidelite" },
    pitch:
      "5 tampons = 1 pizza offerte. Le client s'inscrit en 30s depuis son téléphone (QR menu), reçoit sa carte, vous le scannez à chaque passage. Aucune app à télécharger. Email auto à l'inscription, retour client +30%.",
  },

  /* ── Service ── */
  {
    id: "qr-menu",
    zone: "service",
    number: 6,
    title: "QR menu côté client",
    why: "Le client scanne, voit la carte avec photos, ajoute au panier, envoie au serveur.",
    action: { label: "Tester le QR menu", href: "/m/carte?table=7", openInNewTab: true },
    pitch:
      "Voilà ce que le client voit en flashant le QR de sa table. Il filtre Halal/Végé/Sans gluten en bas de page. Il ajoute au panier. Quand il envoie, ça atterrit DIRECTEMENT chez le serveur — pas direct en cuisine, c'est important : le serveur valide.",
    highlight: "Ajoute 2 plats au panier devant eux et envoie. Va sur /staff/table/7 pour montrer que c'est arrivé.",
  },
  {
    id: "pos",
    zone: "service",
    number: 7,
    title: "POS serveur",
    why: "Tablette serveur full-touch, photos des plats, variantes, modificateurs, courses (entrée/plat/dessert).",
    action: { label: "Login serveur", href: "/staff/login", openInNewTab: true },
    pitch:
      "PIN serveur — 1234. Le serveur voit ses tables avec leur état (libre, en cuisine, prête, repas). Sur une table, il tape les plats. S'il a une variante (Grande pizza +3€), un modal s'ouvre. Il peut envoyer entrées d'abord, plats après. Tout est gestion fine.",
    highlight: "Crée une commande sur la table 5 avec 1 pizza + 1 entrée + 1 dessert. Marque \"VIP\" via le bouton ⭐.",
  },
  {
    id: "kds",
    zone: "service",
    number: 8,
    title: "KDS cuisine par station",
    why: "Le pizzaiolo voit SES pizzas, le grilladin SES grillades. Verrouillage station = anti-erreurs.",
    action: { label: "Voir le KDS", href: "/kitchen", openInNewTab: true },
    pitch:
      "Chaque station a son écran. Le pizzaiolo ne peut PAS marquer un steak prêt par erreur — c'est verrouillé. Si une commande est rajoutée après envoi en cuisine, le ticket clignote rouge sur le KDS pour avertir.",
    highlight: "Marque la pizza comme \"prête\". Le bouton \"🔔 Notification serveur\" sur /staff/tables va se déclencher.",
  },
  {
    id: "stock",
    zone: "service",
    number: 9,
    title: "86 list (rupture en live)",
    why: "Plat épuisé ? 1 clic, propagé sur QR menu / carte / POS / cuisine en 5 secondes.",
    action: { label: "Gérer les ruptures", href: "/kitchen/stock", openInNewTab: true },
    pitch:
      "Plus de mozzarella ? Tu marques toutes les pizzas avec mozza en rupture, en 1 clic ça apparaît grisé sur le site, le QR menu, le POS. Plus jamais un client qui commande un truc qu'on n'a pas.",
    highlight: "Marque la Margherita en rupture. Va sur /carte dans un autre onglet — elle apparaît grisée.",
  },

  /* ── Encaissement ── */
  {
    id: "addition",
    zone: "encaissement",
    number: 10,
    title: "Addition + paiement par items",
    why: "Split par items (Paul prend les 2 pizzas, Marie le reste) — la fonctionnalité killer pour les groupes.",
    action: { label: "Voir une addition", href: "/staff/tables", openInNewTab: true },
    pitch:
      "Le truc qui fait basculer un groupe : Paul paie en CB ses 2 pizzas, Marie paie ses 3 plats en espèces. Tu coches les items de Paul, encaissement, modal méthode + pourboire, validé. Le restant dû s'affiche live, on encaisse Marie pareil.",
    highlight: "Sur une commande active, choisis le mode \"Par items\", coche 2 plats, encaisse en CB.",
  },
  {
    id: "caisse",
    zone: "encaissement",
    number: 11,
    title: "Caisse ouverture / fermeture",
    why: "Fond initial, encaissements live, écart à la fermeture — ce que tout patron veut savoir le soir.",
    action: { label: "Caisse", href: "/staff/caisse", openInNewTab: true },
    pitch:
      "Début de service : tu ouvres la caisse avec le fond. Pendant le service, tu vois les encaissements en cash en temps réel. Fin de service : tu comptes physiquement, tu rentres le montant, l'écart s'affiche en vert / orange / rouge.",
  },

  /* ── Manager ── */
  {
    id: "z-rapport",
    zone: "manager",
    number: 12,
    title: "Z de fin de service + dashboard manager",
    why: "Rapport quotidien complet : CA HT/TTC, paiements ventilés, top plats, stats par serveur, annulations.",
    action: { label: "Voir le Z", href: "/admin/z-rapport", openInNewTab: true },
    pitch:
      "Le soir, ce que vous avez dans la main : CA, top 10 plats, performance par serveur, méthodes de paiement, écart de caisse, annulations. Imprimable, signable, archivable. Voilà la fin de votre journée.",
    highlight: "Imprime le Z (Cmd+P) devant eux. Le côté \"papier officiel\" rassure énormément.",
  },
];

const ZONE_META: Record<
  Step["zone"],
  { label: string; color: string; emoji: string }
> = {
  setup: { label: "Avant le service", color: "bg-gold/15 text-brown", emoji: "⚙" },
  service: { label: "Pendant le service", color: "bg-red/15 text-red-dark", emoji: "🔥" },
  encaissement: { label: "Encaissement", color: "bg-green-100 text-green-700", emoji: "💳" },
  manager: { label: "Côté manager", color: "bg-sky-100 text-sky-700", emoji: "📊" },
};

const STORAGE_KEY = "arc-demo-checked";

export default function DemoGuidePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  /* Restore progress from localStorage. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify([...next])
        );
      } catch {}
      return next;
    });
  }

  function resetChecks() {
    setChecked(new Set());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async function seedDemo() {
    if (!confirm("Cette action injecte 8 commandes fictives + 3 réservations dans la base. Continuer ?")) return;
    setSeedBusy(true);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/admin/demo/seed", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSeedMessage(
        `✓ ${data.orders ?? 0} commandes + ${data.reservations ?? 0} résas injectées.`
      );
    } catch (e) {
      setSeedMessage(`⚠ ${(e as Error).message}`);
    } finally {
      setSeedBusy(false);
    }
  }

  async function resetDemo() {
    if (!confirm("Cette action SUPPRIME toutes les commandes fictives. Les commandes réelles ne sont pas touchées (filtre par notes='__demo__'). Continuer ?")) return;
    setSeedBusy(true);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/admin/demo/reset", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSeedMessage("✓ Données démo nettoyées.");
    } catch (e) {
      setSeedMessage(`⚠ ${(e as Error).message}`);
    } finally {
      setSeedBusy(false);
    }
  }

  const completed = checked.size;
  const total = STEPS.length;
  const progress = (completed / total) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Guide de démonstration
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Parcours pour pitcher
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          12 étapes ordonnées qui couvrent un service complet. Suis-les
          devant ton prospect, coche au fur et à mesure. Bonus : charge un
          scénario démo réaliste pour que ton resto paraisse en plein
          service.
        </p>
      </motion.div>

      {/* Progress + actions */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-white-warm border border-terracotta/20 p-5 mb-6"
      >
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
              {completed} <span className="text-brown-light/60 text-base">/ {total}</span>
            </p>
            <p className="text-xs text-brown-light/70 uppercase tracking-wider font-bold">
              étapes complétées
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={seedDemo}
              disabled={seedBusy}
              className="text-xs font-bold bg-gold hover:bg-gold/90 text-brown px-3 py-2 rounded-full transition disabled:opacity-50"
              title="Injecte 8 commandes + 3 résas dans la DB pour avoir un service plein à montrer"
            >
              ⚡ Charger un scénario démo
            </button>
            <button
              type="button"
              onClick={resetDemo}
              disabled={seedBusy}
              className="text-xs text-brown-light hover:text-red px-3 py-2 transition disabled:opacity-50"
            >
              🧹 Nettoyer
            </button>
            {completed > 0 && (
              <button
                type="button"
                onClick={resetChecks}
                className="text-xs text-brown-light hover:text-brown px-3 py-2 transition"
              >
                Recommencer
              </button>
            )}
          </div>
        </div>

        <div className="h-2 rounded-full bg-cream overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full bg-gold rounded-full"
          />
        </div>

        {seedMessage && (
          <p className="mt-3 text-xs text-brown-light bg-cream rounded-lg px-3 py-2">
            {seedMessage}
          </p>
        )}
      </motion.section>

      {/* Steps grouped by zone */}
      {(["setup", "service", "encaissement", "manager"] as const).map(
        (zone) => {
          const zoneSteps = STEPS.filter((s) => s.zone === zone);
          const meta = ZONE_META[zone];
          return (
            <section key={zone} className="mb-8">
              <h2
                className={[
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4",
                  meta.color,
                ].join(" ")}
              >
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </h2>

              <ul className="space-y-3">
                <AnimatePresence>
                  {zoneSteps.map((step, idx) => {
                    const isChecked = checked.has(step.id);
                    return (
                      <motion.li
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={[
                          "rounded-2xl border-2 transition-all",
                          isChecked
                            ? "bg-cream/60 border-green-400/60"
                            : "bg-white-warm border-terracotta/20 hover:border-terracotta/40",
                        ].join(" ")}
                      >
                        <div className="p-5 flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => toggle(step.id)}
                            className={[
                              "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition font-bold text-sm",
                              isChecked
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-terracotta/40 text-brown-light hover:border-brown",
                            ].join(" ")}
                            aria-label={
                              isChecked ? "Décocher" : "Cocher l'étape"
                            }
                          >
                            {isChecked ? "✓" : step.number}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={[
                                "font-[family-name:var(--font-display)] text-xl font-bold leading-tight",
                                isChecked
                                  ? "text-brown-light line-through"
                                  : "text-brown",
                              ].join(" ")}
                            >
                              {step.title}
                            </h3>
                            <p className="text-xs text-brown-light/80 mt-1.5">
                              {step.why}
                            </p>

                            <div className="mt-3 rounded-xl bg-cream/60 border border-terracotta/15 p-3">
                              <p className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold mb-1">
                                Ce que tu dis
                              </p>
                              <p className="text-sm text-brown italic leading-snug">
                                « {step.pitch} »
                              </p>
                              {step.highlight && (
                                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                                  💡 <strong>Action live :</strong> {step.highlight}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <Link
                                href={step.action.href}
                                target={step.action.openInNewTab ? "_blank" : undefined}
                                rel={step.action.openInNewTab ? "noopener noreferrer" : undefined}
                                className="inline-flex items-center gap-1.5 bg-brown hover:bg-brown-light text-cream text-xs font-bold px-4 py-2 rounded-full transition active:scale-95"
                              >
                                {step.action.label}
                                {step.action.openInNewTab && (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      d="M7 17L17 7M17 7H9M17 7v8"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          );
        }
      )}

      {/* Closing tips */}
      <section className="rounded-2xl bg-gradient-to-br from-gold/15 to-transparent border border-gold/30 p-6 mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown mb-2">
          📝 Quelques conseils pour bien pitcher
        </h2>
        <ul className="space-y-2 text-sm text-brown-light leading-relaxed">
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Commence par leurs galères, pas tes features.</strong>{" "}
              « Comment vous prenez les commandes aujourd'hui ? Combien de
              temps pour clôturer un service ? Vous avez déjà eu un client qui
              commande un plat épuisé ? »
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Charge le scénario démo</strong> AVANT que le prospect
              arrive. Un resto vide en démo donne une impression amateur. Un
              resto avec 8 commandes en cours donne l'impression d'un outil en
              vrai service.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Objection « Vous avez la NF525 ? »</strong> → « Pas
              certifiée — c'est volontaire. Notre outil est un système de
              prise de commande, vous gardez votre caisse certifiée pour la
              TVA. C'est exactement ce que fait Sunday. »
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Objection « Vous êtes combien de clients ? »</strong>{" "}
              → « En early access, on accompagne nos premiers clients en main
              dans la main. Vous bénéficiez de -50% les 12 premiers mois et
              d'un support direct. »
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Objection prix « Tiller c'est 89€ »</strong> → « Tiller
              c'est 89€ sans QR menu, sans fidélité moderne, sans split par
              items. Chez nous c'est 49€ avec tout. »
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gold flex-shrink-0">▸</span>
            <span>
              <strong>Toujours finir sur un essai gratuit.</strong> « Je
              viens chez vous, j'installe gratuitement, vous testez 30 jours.
              Si ça vous plaît, on continue. Sinon, je déinstalle, ça ne
              vous coûte rien. »
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
