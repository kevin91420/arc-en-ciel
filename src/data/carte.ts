/**
 * CARTE COMPLÈTE — L'Arc en Ciel
 * Single source of truth pour: site, /carte, menu QR, PDF imprimable.
 */

export type DietaryTag = "halal" | "vegetarien" | "sans-gluten" | "vegan" | "epice";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image?: string;
  tags?: DietaryTag[];
  signature?: boolean;
  popular?: boolean;
  chef?: boolean;
}

export interface MenuCategory {
  id: string;
  number: string; // "01", "02"…
  title: string;
  subtitle: string;
  intro: string;
  icon: string; // emoji pour les titres
  items: MenuItem[];
}

export const CARTE: MenuCategory[] = [
  /* ═══════════════════════════════════════════════════════════
     01 — ENTRÉES
     ═══════════════════════════════════════════════════════════ */
  {
    id: "entrees",
    number: "01",
    title: "Entrées",
    subtitle: "Antipasti & mezze",
    intro:
      "Le premier souffle du repas — entrées fraîches, méditerranéennes, à partager ou à savourer en solo.",
    icon: "🫒",
    items: [
      {
        id: "bruschetta",
        name: "Bruschetta al pomodoro",
        description:
          "Pain grillé au feu de bois, tomates fraîches, ail, basilic, huile d'olive extra vierge",
        price: "7,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "burrata",
        name: "Burrata des Pouilles",
        description:
          "Burrata crémeuse, tomates cerises, roquette, pesto maison, pignons torréfiés",
        price: "12,00 €",
        tags: ["vegetarien"],
        popular: true,
        image:
          "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "carpaccio",
        name: "Carpaccio de bœuf",
        description:
          "Fines tranches de bœuf, copeaux de parmesan, roquette, câpres, huile de truffe",
        price: "13,50 €",
        tags: ["halal"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1625944525903-ed9d7ddf8b2a?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "salade-chevre",
        name: "Salade de chèvre chaud",
        description:
          "Mesclun, toasts de chèvre au miel, noix, figues rôties, vinaigrette balsamique",
        price: "10,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "antipasti",
        name: "Planche Antipasti",
        description:
          "Sélection de charcuteries italiennes, mozzarella di bufala, olives, artichauts, focaccia",
        price: "16,00 €",
        tags: ["halal"],
        image:
          "https://images.unsplash.com/photo-1544510808-5e41c8f9f8bf?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     02 — PIZZAS AU FEU DE BOIS
     ═══════════════════════════════════════════════════════════ */
  {
    id: "pizzas",
    number: "02",
    title: "Pizzas au feu de bois",
    subtitle: "Cuites à 400°C",
    intro:
      "Notre signature. Pâte levée 48h, cuisson dans un four traditionnel au feu de bois à 400°C — croûte dorée, croustillante, parfumée.",
    icon: "🔥",
    items: [
      {
        id: "margherita",
        name: "Margherita",
        description:
          "Sauce tomate San Marzano, mozzarella fior di latte, basilic frais, huile d'olive",
        price: "9,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "regina",
        name: "Regina",
        description:
          "Sauce tomate, mozzarella, jambon de Paris, champignons de Paris, olives noires",
        price: "11,50 €",
        tags: ["halal"],
        popular: true,
        image:
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "quatre-fromages",
        name: "Quatre Fromages",
        description:
          "Mozzarella, gorgonzola DOP, chèvre, parmesan 24 mois, filet de miel",
        price: "12,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "mediterraneenne",
        name: "Méditerranéenne",
        description:
          "Sauce tomate, mozzarella, poivrons grillés, aubergines, feta, origan frais",
        price: "13,50 €",
        tags: ["vegetarien"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "arc-en-ciel",
        name: "L'Arc en Ciel",
        description:
          "Crème fraîche, mozzarella, saumon fumé, aneth, citron, roquette, sésame grillé",
        price: "14,50 €",
        signature: true,
        popular: true,
        image:
          "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "truffe",
        name: "Truffe Noire",
        description:
          "Crème de truffe, mozzarella di bufala, champignons, roquette, copeaux de parmesan",
        price: "17,00 €",
        tags: ["vegetarien"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "merguez",
        name: "Orientale",
        description:
          "Sauce tomate épicée, mozzarella, merguez halal, poivrons, oignons rouges, harissa",
        price: "13,00 €",
        tags: ["halal", "epice"],
        image:
          "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "calzone",
        name: "Calzone",
        description:
          "Pizza pliée, sauce tomate, mozzarella, jambon, champignons, œuf coulant",
        price: "12,00 €",
        tags: ["halal"],
        image:
          "https://images.unsplash.com/photo-1536964549204-cce9eab227bd?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "vegetarienne",
        name: "Végétarienne",
        description:
          "Sauce tomate, mozzarella, artichauts, champignons, poivrons, oignons, olives",
        price: "12,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     03 — GRILLADES
     ═══════════════════════════════════════════════════════════ */
  {
    id: "grillades",
    number: "03",
    title: "Grillades",
    subtitle: "Viandes & poissons au feu de bois",
    intro:
      "Viandes halal sélectionnées avec soin, poissons frais du marché. Tout est grillé au feu de bois, servi avec légumes de saison et sauce maison.",
    icon: "🥩",
    items: [
      {
        id: "entrecote",
        name: "Entrecôte grillée 300g",
        description:
          "Entrecôte halal, beurre maître d'hôtel, frites maison ou légumes grillés",
        price: "24,50 €",
        tags: ["halal"],
        popular: true,
        image:
          "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "cote-agneau",
        name: "Côtes d'agneau marinées",
        description:
          "Agneau halal, marinade herbes de Provence, ail, citron, accompagné de semoule parfumée",
        price: "22,00 €",
        tags: ["halal"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "brochette-poulet",
        name: "Brochette de poulet",
        description:
          "Poulet halal mariné, poivrons, oignons, sauce yaourt-menthe maison, riz basmati",
        price: "16,50 €",
        tags: ["halal"],
        image:
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "merguez-grillees",
        name: "Assiette Merguez",
        description:
          "Merguez halal grillées, semoule, légumes couscous, sauce harissa",
        price: "15,00 €",
        tags: ["halal", "epice"],
        image:
          "https://images.unsplash.com/photo-1529589510907-6f9f3a2ab0f4?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "dorade",
        name: "Dorade royale",
        description:
          "Dorade entière grillée, fenouil confit, citron, huile d'olive, herbes fraîches",
        price: "23,00 €",
        image:
          "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "saumon",
        name: "Pavé de saumon",
        description:
          "Saumon frais grillé, sauce vierge tomate-basilic, légumes de saison vapeur",
        price: "21,00 €",
        image:
          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     04 — PÂTES FRAÎCHES
     ═══════════════════════════════════════════════════════════ */
  {
    id: "pates",
    number: "04",
    title: "Pâtes fraîches",
    subtitle: "Faites maison chaque jour",
    intro:
      "Pâtes fraîches pétries et étirées chaque matin par notre chef. Semoule de blé dur, œufs frais, savoir-faire italien.",
    icon: "🍝",
    items: [
      {
        id: "bolognaise",
        name: "Tagliatelles à la Bolognaise",
        description:
          "Ragù de bœuf halal mijoté 4h, parmesan râpé, basilic frais",
        price: "13,50 €",
        tags: ["halal"],
        popular: true,
        image:
          "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "carbonara",
        name: "Spaghetti Carbonara",
        description:
          "Pâtes, jaune d'œuf, pecorino romano, poivre noir, pancetta croustillante",
        price: "14,00 €",
        image:
          "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "arrabiata",
        name: "Penne all'Arrabbiata",
        description:
          "Sauce tomate piquante, ail, piment d'Espelette, persil, huile d'olive, parmesan",
        price: "12,50 €",
        tags: ["vegetarien", "epice"],
        image:
          "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "pesto",
        name: "Trofie al Pesto",
        description:
          "Pesto genovese maison, pignons torréfiés, pommes de terre, haricots verts",
        price: "13,00 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "lasagnes",
        name: "Lasagnes maison",
        description:
          "Lasagnes traditionnelles au bœuf halal, béchamel crémeuse, parmesan gratiné",
        price: "14,50 €",
        tags: ["halal"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     05 — SALADES
     ═══════════════════════════════════════════════════════════ */
  {
    id: "salades",
    number: "05",
    title: "Salades généreuses",
    subtitle: "Fraîcheur & légèreté",
    intro:
      "Bols généreux composés de produits frais du marché, pour un repas léger et coloré.",
    icon: "🥗",
    items: [
      {
        id: "cesar",
        name: "César revisitée",
        description:
          "Sucrine, poulet halal grillé, parmesan, œuf mollet, croûtons, sauce césar maison",
        price: "14,50 €",
        tags: ["halal"],
        popular: true,
        image:
          "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "grecque",
        name: "Grecque authentique",
        description:
          "Tomates, concombre, oignons rouges, olives Kalamata, feta AOP, origan, huile d'olive",
        price: "12,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "italienne",
        name: "Italienne",
        description:
          "Mesclun, mozzarella di bufala, tomates cerises, jambon italien, olives, pesto",
        price: "13,00 €",
        tags: ["halal"],
        image:
          "https://images.unsplash.com/photo-1512852939750-1326db4fb4c0?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "quinoa",
        name: "Bowl Quinoa",
        description:
          "Quinoa, avocat, grenade, betterave rôtie, feta, graines, vinaigrette citronnée",
        price: "13,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     06 — DESSERTS
     ═══════════════════════════════════════════════════════════ */
  {
    id: "desserts",
    number: "06",
    title: "Desserts maison",
    subtitle: "Dolce finale",
    intro:
      "Tous nos desserts sont faits maison chaque jour. Recettes italiennes traditionnelles, ingrédients nobles, dressage soigné.",
    icon: "🍰",
    items: [
      {
        id: "tiramisu",
        name: "Tiramisu classique",
        description:
          "Mascarpone, café expresso, biscuits à la cuillère, cacao amer — recette originale",
        price: "7,50 €",
        tags: ["vegetarien"],
        signature: true,
        popular: true,
        image:
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "panna-cotta",
        name: "Panna Cotta",
        description:
          "Crème vanille bourbon onctueuse, coulis de fruits rouges frais",
        price: "6,50 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "fondant",
        name: "Fondant au chocolat",
        description:
          "Cœur coulant chocolat noir 70%, glace vanille, éclats de fleur de sel",
        price: "8,00 €",
        tags: ["vegetarien"],
        chef: true,
        image:
          "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "affogato",
        name: "Affogato al caffè",
        description:
          "Boule de glace vanille noyée dans un expresso italien chaud",
        price: "6,00 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1583515570069-9a8f8f6d4e7c?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "cheesecake",
        name: "Cheesecake aux fruits rouges",
        description:
          "Base biscuit sablé, crème fromage blanc, coulis framboise, fruits frais",
        price: "7,00 €",
        tags: ["vegetarien"],
        image:
          "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=900&h=600&fit=crop&q=85",
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     07 — BOISSONS
     ═══════════════════════════════════════════════════════════ */
  {
    id: "boissons",
    number: "07",
    title: "Boissons",
    subtitle: "Sélection de la maison",
    intro:
      "Une sélection soignée de vins italiens et français, bières artisanales, et classiques rafraîchissants.",
    icon: "🍷",
    items: [
      {
        id: "chianti",
        name: "Chianti Classico DOCG",
        description: "Toscane, Italie — 75cl / verre",
        price: "28 € / 6,50 €",
        image:
          "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "cotes-provence",
        name: "Côtes de Provence Rosé",
        description: "AOP Provence — 75cl / verre",
        price: "26 € / 6,00 €",
        image:
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "moretti",
        name: "Birra Moretti pression",
        description: "Bière italienne 25cl / 50cl",
        price: "4,50 € / 7,50 €",
        image:
          "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "limonade",
        name: "Limonade artisanale",
        description: "Citron frais, gingembre, menthe, sirop maison",
        price: "5,50 €",
        image:
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=900&h=600&fit=crop&q=85",
      },
      {
        id: "sodas",
        name: "Sodas",
        description: "Coca-Cola, Orangina, Schweppes, Perrier — 33cl",
        price: "3,50 €",
      },
      {
        id: "cafe",
        name: "Café espresso",
        description: "Torréfaction italienne, sélection du chef",
        price: "2,50 €",
      },
    ],
  },
];

export const TAG_LABELS: Record<DietaryTag, { label: string; color: string }> = {
  halal: { label: "Halal", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  vegetarien: { label: "Végétarien", color: "bg-lime-100 text-lime-800 border-lime-200" },
  "sans-gluten": { label: "Sans gluten", color: "bg-amber-100 text-amber-800 border-amber-200" },
  vegan: { label: "Vegan", color: "bg-green-100 text-green-800 border-green-200" },
  epice: { label: "Épicé", color: "bg-red-100 text-red-800 border-red-200" },
};
