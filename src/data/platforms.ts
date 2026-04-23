/**
 * PLATFORMS CATALOG — Toutes les plateformes que GOURMET PACK peut
 * remplacer ou connecter. Source de vérité pour les intégrations,
 * le calculateur ROI et le dashboard économies.
 */

export type PlatformCategory =
  | "reservation" /* prise de réservation */
  | "delivery" /* livraison */
  | "pos" /* caisse / POS */
  | "site" /* site web */
  | "menu" /* menu digital QR */
  | "marketing" /* emails, CRM, newsletters */
  | "loyalty" /* programme de fidélité */
  | "reviews" /* avis clients */
  | "printing" /* impression cuisine / tickets */
  | "analytics"; /* stats, reporting */

export type PlatformRelation =
  | "replaced" /* le pack REMPLACE totalement la plateforme */
  | "connected" /* le pack RÉCUPÈRE les données via webhook / API */
  | "both"; /* au choix du client */

export interface Platform {
  id: string;
  name: string;
  category: PlatformCategory;
  relation: PlatformRelation;
  /** Coût mensuel typique (€/mois) — estimation moyenne marché FR 2026 */
  monthly_cost_eur: number;
  /** Part variable (commission) en % si applicable */
  commission_percent?: number;
  /** Module du pack qui remplace/connecte cette plateforme */
  replaced_by?: string;
  /** Lien officiel pour vérifier */
  website?: string;
  /** Couleur officielle de la marque (pour badges) */
  brand_color?: string;
  /** Logo emoji en fallback (svg optionnel plus tard) */
  icon: string;
  /** Description courte du service */
  description: string;
  /** Instruction de setup Zapier/Make pour les plateformes "connected" */
  setup_hint?: string;
}

/* ═══════════════════════════════════════════════════════════
   RÉSERVATION
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_RESERVATION: Platform[] = [
  {
    id: "thefork",
    name: "TheFork Manager",
    category: "reservation",
    relation: "connected",
    monthly_cost_eur: 150,
    commission_percent: 2,
    website: "https://www.thefork.com/manager",
    brand_color: "#5BB4A1",
    icon: "🍴",
    description: "Plateforme n°1 en France. Reçoit vos résas TheFork dans votre CRM.",
    setup_hint: "Zapier → Gmail (from:noreply@thefork.com) → POST webhook",
  },
  {
    id: "google_reserve",
    name: "Google Reserve",
    category: "reservation",
    relation: "connected",
    monthly_cost_eur: 0,
    website: "https://reserve.google.com",
    brand_color: "#4285F4",
    icon: "🔎",
    description: "Résas depuis la fiche Google Business (gratuit pour le resto).",
    setup_hint: "Via partenaire certifié (TheFork/OpenTable) ou Zapier email parsing",
  },
  {
    id: "zenchef",
    name: "Zenchef",
    category: "reservation",
    relation: "replaced",
    monthly_cost_eur: 69,
    replaced_by: "CRM Réservations + webhook",
    website: "https://www.zenchef.com",
    brand_color: "#FF6B35",
    icon: "👨‍🍳",
    description: "Logiciel de résa français. Remplacé par le CRM du pack.",
  },
  {
    id: "resdiary",
    name: "ResDiary",
    category: "reservation",
    relation: "replaced",
    monthly_cost_eur: 99,
    replaced_by: "CRM Réservations + plan de salle",
    website: "https://www.resdiary.com",
    brand_color: "#00AEEF",
    icon: "📖",
    description: "Logiciel de résa UK. Remplacé par le CRM + plan de salle.",
  },
  {
    id: "sevenrooms",
    name: "SevenRooms",
    category: "reservation",
    relation: "replaced",
    monthly_cost_eur: 250,
    replaced_by: "CRM + fidélité + emails",
    website: "https://sevenrooms.com",
    brand_color: "#0A2540",
    icon: "7️⃣",
    description: "Solution haut de gamme. Remplacée par CRM+fidélité+emails du pack.",
  },
  {
    id: "opentable",
    name: "OpenTable",
    category: "reservation",
    relation: "connected",
    monthly_cost_eur: 199,
    commission_percent: 2.5,
    website: "https://restaurant.opentable.fr",
    brand_color: "#DA3743",
    icon: "🍽",
    description: "Plateforme internationale de résa. Résas reçues via webhook.",
    setup_hint: "OpenTable API ou parsing email via Zapier",
  },
];

/* ═══════════════════════════════════════════════════════════
   LIVRAISON
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_DELIVERY: Platform[] = [
  {
    id: "uber_eats",
    name: "Uber Eats",
    category: "delivery",
    relation: "connected",
    monthly_cost_eur: 0,
    commission_percent: 30,
    website: "https://www.ubereats.com/fr/restaurant",
    brand_color: "#06C167",
    icon: "🛵",
    description: "Commandes Uber Eats transformées en clients dans votre CRM.",
    setup_hint: "Uber Eats → Zapier → webhook. Chaque commande crée un client + visite fidélité.",
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    category: "delivery",
    relation: "connected",
    monthly_cost_eur: 0,
    commission_percent: 32,
    website: "https://restaurants.deliveroo.fr",
    brand_color: "#00CCBC",
    icon: "🛵",
    description: "Commandes Deliveroo transformées en clients dans votre CRM.",
    setup_hint: "Zapier → Deliveroo Partners → webhook.",
  },
  {
    id: "just_eat",
    name: "Just Eat",
    category: "delivery",
    relation: "connected",
    monthly_cost_eur: 0,
    commission_percent: 14,
    website: "https://www.just-eat.fr/restaurants",
    brand_color: "#FF8000",
    icon: "🍔",
    description: "Commandes Just Eat centralisées dans votre CRM.",
    setup_hint: "Just Eat Manager → Zapier → webhook.",
  },
  {
    id: "stuart",
    name: "Stuart",
    category: "delivery",
    relation: "connected",
    monthly_cost_eur: 0,
    commission_percent: 25,
    website: "https://stuart.com/fr",
    brand_color: "#22008F",
    icon: "🛵",
    description: "Plateforme de livraison FR (ex. Frichti, sur-mesure).",
    setup_hint: "Stuart API → webhook.",
  },
  {
    id: "frichti",
    name: "Frichti",
    category: "delivery",
    relation: "connected",
    monthly_cost_eur: 0,
    commission_percent: 30,
    website: "https://www.frichti.co",
    brand_color: "#E94E1B",
    icon: "🥗",
    description: "Livraison de repas FR.",
    setup_hint: "Email parsing via Zapier.",
  },
];

/* ═══════════════════════════════════════════════════════════
   POS / CAISSE
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_POS: Platform[] = [
  {
    id: "zelty",
    name: "Zelty",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 199,
    replaced_by: "POS serveur + KDS cuisine + paiement",
    website: "https://www.zelty.fr",
    brand_color: "#2E86DE",
    icon: "💳",
    description: "Caisse FR n°1. Remplacée par POS+KDS+paiement du pack.",
  },
  {
    id: "tiller",
    name: "Tiller Systems",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 229,
    replaced_by: "POS serveur + KDS cuisine",
    website: "https://www.tillersystems.com",
    brand_color: "#F36F21",
    icon: "💳",
    description: "Caisse tablette premium. Remplacée par POS+KDS du pack.",
  },
  {
    id: "lightspeed",
    name: "Lightspeed Restaurant",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 179,
    replaced_by: "POS serveur + KDS cuisine + stats",
    website: "https://www.lightspeedhq.fr/pos/restaurant",
    brand_color: "#F90000",
    icon: "⚡",
    description: "Caisse internationale. Remplacée par POS+KDS+stats.",
  },
  {
    id: "innovorder",
    name: "Innovorder",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 289,
    replaced_by: "POS + KDS + commandes digitales",
    website: "https://www.innovorder.fr",
    brand_color: "#FF6B00",
    icon: "🖥",
    description: "Solution tout-en-un industrielle. Remplacée par le pack.",
  },
  {
    id: "cashpad",
    name: "Cashpad",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 85,
    replaced_by: "POS serveur + paiement",
    website: "https://www.cashpad.com",
    brand_color: "#1DB954",
    icon: "💶",
    description: "Caisse iPad. Remplacée par le POS serveur du pack.",
  },
  {
    id: "square",
    name: "Square Restaurant",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 0,
    commission_percent: 1.75,
    replaced_by: "POS + paiement manuel / Stripe Terminal",
    website: "https://squareup.com/fr/fr/restaurants",
    brand_color: "#000000",
    icon: "⬛",
    description: "Caisse gratuite mais prélève sur les paiements. Remplaçable.",
  },
];

/* ═══════════════════════════════════════════════════════════
   SITE WEB / MENU
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_SITE: Platform[] = [
  {
    id: "wix",
    name: "Wix Restaurant",
    category: "site",
    relation: "replaced",
    monthly_cost_eur: 29,
    replaced_by: "Site vitrine Next.js premium",
    website: "https://www.wix.com/restaurant-website",
    brand_color: "#FFD200",
    icon: "🌐",
    description: "Site drag & drop. Remplacé par le site Next.js du pack.",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    category: "site",
    relation: "replaced",
    monthly_cost_eur: 23,
    replaced_by: "Site vitrine Next.js",
    website: "https://www.squarespace.com",
    brand_color: "#000000",
    icon: "🌐",
    description: "Site esthétique mais rigide. Remplacé par le site du pack.",
  },
  {
    id: "dish_website",
    name: "DISH Website",
    category: "site",
    relation: "replaced",
    monthly_cost_eur: 39,
    replaced_by: "Site vitrine Next.js",
    website: "https://www.dish.co",
    brand_color: "#FF0000",
    icon: "🍽",
    description: "Solution Metro pour restos. Remplaçable par le site du pack.",
  },
  {
    id: "menuu",
    name: "Menuu",
    category: "menu",
    relation: "replaced",
    monthly_cost_eur: 39,
    replaced_by: "Menu digital /carte + QR menu /m/carte",
    website: "https://menuu.com",
    brand_color: "#FF5A5F",
    icon: "📱",
    description: "Menu QR externe. Remplacé par le menu digital du pack.",
  },
  {
    id: "qrmenu_pro",
    name: "QR Menu Pro",
    category: "menu",
    relation: "replaced",
    monthly_cost_eur: 29,
    replaced_by: "QR menu /m/carte",
    icon: "📱",
    description: "Solution de menu QR basique. Remplacée par notre QR.",
  },
];

/* ═══════════════════════════════════════════════════════════
   MARKETING / CRM / EMAILS
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_MARKETING: Platform[] = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "marketing",
    relation: "replaced",
    monthly_cost_eur: 50,
    replaced_by: "Emails Resend + CRM clients",
    website: "https://mailchimp.com",
    brand_color: "#FFE01B",
    icon: "📧",
    description: "Emailing automatique. Remplacé par Resend + CRM.",
  },
  {
    id: "sendinblue",
    name: "Brevo (ex-Sendinblue)",
    category: "marketing",
    relation: "replaced",
    monthly_cost_eur: 35,
    replaced_by: "Emails Resend + templates automatiques",
    website: "https://www.brevo.com",
    brand_color: "#0092FF",
    icon: "📧",
    description: "Emailing FR. Remplacé par Resend inclus dans le pack.",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "marketing",
    relation: "replaced",
    monthly_cost_eur: 45,
    replaced_by: "CRM clients + fidélité",
    website: "https://www.hubspot.com",
    brand_color: "#FF7A59",
    icon: "🎯",
    description: "CRM généraliste. Remplacé par le CRM clients du pack.",
  },
  {
    id: "canva_pro",
    name: "Canva Pro",
    category: "marketing",
    relation: "replaced",
    monthly_cost_eur: 12,
    replaced_by: "Templates design fournis",
    website: "https://www.canva.com",
    brand_color: "#00C4CC",
    icon: "🎨",
    description: "Outil de création visuelle. Templates fournis dans le pack.",
  },
];

/* ═══════════════════════════════════════════════════════════
   FIDÉLITÉ
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_LOYALTY: Platform[] = [
  {
    id: "belly",
    name: "Belly",
    category: "loyalty",
    relation: "replaced",
    monthly_cost_eur: 95,
    replaced_by: "Programme fidélité digital du pack",
    website: "https://www.bellycard.com",
    brand_color: "#E74C3C",
    icon: "⭐",
    description: "App de fidélité US. Remplacée par la carte wallet du pack.",
  },
  {
    id: "loyalty_gator",
    name: "Loyalty Gator",
    category: "loyalty",
    relation: "replaced",
    monthly_cost_eur: 59,
    replaced_by: "Programme fidélité digital",
    icon: "⭐",
    description: "Fidélité QR. Remplacée par notre programme intégré.",
  },
  {
    id: "punchh",
    name: "Punchh",
    category: "loyalty",
    relation: "replaced",
    monthly_cost_eur: 150,
    replaced_by: "Programme fidélité + emails récompense",
    website: "https://punchh.com",
    brand_color: "#FF6B35",
    icon: "⭐",
    description: "Plateforme fidélité enterprise. Remplaçable.",
  },
];

/* ═══════════════════════════════════════════════════════════
   AVIS CLIENTS
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_REVIEWS: Platform[] = [
  {
    id: "yelp_pro",
    name: "Yelp for Business (Pro)",
    category: "reviews",
    relation: "connected",
    monthly_cost_eur: 99,
    website: "https://biz.yelp.com",
    brand_color: "#D32323",
    icon: "⭐",
    description: "Gestion avis Yelp. Affichés sur votre site via API.",
  },
  {
    id: "tripadvisor_pro",
    name: "TripAdvisor Plus",
    category: "reviews",
    relation: "connected",
    monthly_cost_eur: 49,
    website: "https://www.tripadvisor.com/business",
    brand_color: "#00AF87",
    icon: "🦉",
    description: "Outil TripAdvisor pour pros. Avis affichés sur votre site.",
  },
  {
    id: "google_reviews",
    name: "Google Reviews (Profil pro)",
    category: "reviews",
    relation: "connected",
    monthly_cost_eur: 0,
    website: "https://business.google.com",
    brand_color: "#4285F4",
    icon: "⭐",
    description: "Gratuit mais non-automatisé. Affiché sur votre site.",
  },
];

/* ═══════════════════════════════════════════════════════════
   PROGRAMME DE CAISSE (obligation légale FR)
   ═══════════════════════════════════════════════════════════ */
export const PLATFORMS_OTHER: Platform[] = [
  {
    id: "xero",
    name: "Xero / Comptabilité",
    category: "analytics",
    relation: "connected",
    monthly_cost_eur: 29,
    icon: "📊",
    description: "Export du Z de caisse journalier vers la compta.",
  },
  {
    id: "loyverse",
    name: "Loyverse",
    category: "pos",
    relation: "replaced",
    monthly_cost_eur: 25,
    replaced_by: "POS serveur + stats",
    website: "https://loyverse.com",
    icon: "📱",
    description: "POS gratuit mais options payantes. Remplaçable.",
  },
];

/* ═══════════════════════════════════════════════════════════
   CATALOGUE COMPLET
   ═══════════════════════════════════════════════════════════ */
export const ALL_PLATFORMS: Platform[] = [
  ...PLATFORMS_RESERVATION,
  ...PLATFORMS_DELIVERY,
  ...PLATFORMS_POS,
  ...PLATFORMS_SITE,
  ...PLATFORMS_MARKETING,
  ...PLATFORMS_LOYALTY,
  ...PLATFORMS_REVIEWS,
  ...PLATFORMS_OTHER,
];

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  reservation: "Réservation",
  delivery: "Livraison",
  pos: "Caisse / POS",
  site: "Site web",
  menu: "Menu digital",
  marketing: "Marketing / Emails",
  loyalty: "Fidélité",
  reviews: "Avis clients",
  printing: "Impression",
  analytics: "Analytics / Compta",
};

export const CATEGORY_ICONS: Record<PlatformCategory, string> = {
  reservation: "📅",
  delivery: "🛵",
  pos: "💳",
  site: "🌐",
  menu: "📱",
  marketing: "📧",
  loyalty: "⭐",
  reviews: "💬",
  printing: "🖨",
  analytics: "📊",
};

/* Quick helpers */
export function getPlatformsByCategory(cat: PlatformCategory): Platform[] {
  return ALL_PLATFORMS.filter((p) => p.category === cat);
}

export function getReplacedPlatforms(): Platform[] {
  return ALL_PLATFORMS.filter((p) => p.relation === "replaced" || p.relation === "both");
}

export function getConnectedPlatforms(): Platform[] {
  return ALL_PLATFORMS.filter((p) => p.relation === "connected" || p.relation === "both");
}
