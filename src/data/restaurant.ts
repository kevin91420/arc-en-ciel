export const RESTAURANT = {
  name: "L'Arc en Ciel",
  tagline: "Pizzas au Feu de Bois & Grillades · Morangis",
  description:
    "Une ambiance familiale et conviviale, des pizzas cuites au feu de bois, des grillades, une variété de viandes et poissons frais. Cuisine saine, colorée et généreuse.",
  phone: "01 64 54 00 30",
  phoneHref: "tel:+33164540030",
  email: "larcencielmorangis@gmail.com",
  address: "36 Rue de l'Église, 91420 Morangis",
  mapsUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2636.5!2d2.339222!3d48.7054041!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e671d1e2c4a2e7%3A0x1234567890abcdef!2s36+Rue+de+l'%C3%89glise%2C+91420+Morangis!5e0!3m2!1sfr!2sfr!4v1",
  mapsLink: "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
  menuPdf: "https://cdn.website.dish.co/media/16/69/6003710/Menu.pdf",
  orderUrl: "#commander",
  hours: [
    { days: "Lundi – Samedi", time: "11h30 – 14h30 · 18h30 – 22h30" },
    { days: "Dimanche", time: "Fermé" },
  ],
  socials: {
    facebook: "https://facebook.com/larcencielmorangis",
    instagram: "https://instagram.com/larcencielmorangis",
    google: "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
  },
  payment: [
    "Espèces",
    "Visa",
    "MasterCard",
    "Sans contact",
    "Apple Pay",
    "Ticket Restaurant®",
    "Chèques Vacances",
  ],
  services: [
    {
      icon: "truck",
      label: "Livraison",
      desc: "À domicile dans Morangis et environs",
    },
    {
      icon: "bag",
      label: "À emporter",
      desc: "Prêt en 20 min, appelez pour commander",
    },
    {
      icon: "sun",
      label: "Terrasse",
      desc: "Profitez des beaux jours en extérieur",
    },
    {
      icon: "users",
      label: "Événements privés",
      desc: "Mariages, anniversaires, réceptions",
    },
    {
      icon: "chef",
      label: "Service traiteur",
      desc: "Pour vos événements sur mesure",
    },
    {
      icon: "accessible",
      label: "Accès PMR",
      desc: "Accessible aux personnes à mobilité réduite",
    },
  ],
};

export type PizzaCategory = "classiques" | "speciales" | "vegetariennes";

export interface Pizza {
  id: string;
  name: string;
  ingredients: string;
  price: string;
  category: PizzaCategory;
  image: string;
  badge?: string;
  featured?: boolean;
}

export const PIZZAS: Pizza[] = [
  // Classiques
  {
    id: "margherita",
    name: "Margherita",
    ingredients:
      "Sauce tomate, mozzarella fior di latte, basilic frais, huile d'olive",
    price: "9,50 €",
    category: "classiques",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop",
  },
  {
    id: "regina",
    name: "Regina",
    ingredients: "Sauce tomate, mozzarella, jambon, champignons, olives",
    price: "11,50 €",
    category: "classiques",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
  },
  {
    id: "napolitaine",
    name: "Napolitaine",
    ingredients: "Sauce tomate, mozzarella, anchois, câpres, olives noires",
    price: "11,00 €",
    category: "classiques",
    image:
      "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&h=400&fit=crop",
  },
  {
    id: "quatre-fromages",
    name: "Quatre Fromages",
    ingredients: "Mozzarella, gorgonzola, chèvre, parmesan, miel",
    price: "12,50 €",
    category: "classiques",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop",
  },
  {
    id: "calzone",
    name: "Calzone",
    ingredients: "Sauce tomate, mozzarella, jambon, champignons, œuf",
    price: "12,00 €",
    category: "classiques",
    image:
      "https://images.unsplash.com/photo-1536964549204-cce9eab227bd?w=600&h=400&fit=crop",
  },
  // Spéciales
  {
    id: "mediterraneenne",
    name: "Méditerranéenne",
    ingredients:
      "Sauce tomate, mozzarella, poivrons grillés, aubergines, feta, origan",
    price: "13,50 €",
    category: "speciales",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600&h=400&fit=crop",
    badge: "Chef",
  },
  {
    id: "arc-en-ciel",
    name: "L'Arc en Ciel",
    ingredients:
      "Crème fraîche, mozzarella, saumon fumé, aneth, citron, roquette",
    price: "14,50 €",
    category: "speciales",
    image:
      "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&h=400&fit=crop",
    badge: "★ Signature",
    featured: true,
  },
  {
    id: "truffe",
    name: "Truffe Noire",
    ingredients:
      "Crème de truffe, mozzarella di bufala, champignons, roquette, copeaux de parmesan",
    price: "15,50 €",
    category: "speciales",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop",
    badge: "Premium",
  },
  {
    id: "bresaola",
    name: "Bresaola",
    ingredients:
      "Mozzarella, bresaola, roquette, copeaux de parmesan, huile de truffe",
    price: "14,00 €",
    category: "speciales",
    image:
      "https://images.unsplash.com/photo-1600028068383-ea11a7a101f3?w=600&h=400&fit=crop",
  },
  // Végétariennes
  {
    id: "veggie-garden",
    name: "Jardin d'Été",
    ingredients:
      "Sauce tomate, mozzarella, courgettes, tomates cerises, basilic, pignons",
    price: "12,00 €",
    category: "vegetariennes",
    image:
      "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=600&h=400&fit=crop",
    badge: "Veggie",
  },
  {
    id: "caprese",
    name: "Caprese",
    ingredients:
      "Mozzarella di bufala, tomates fraîches, basilic, huile d'olive vierge",
    price: "12,50 €",
    category: "vegetariennes",
    image:
      "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&h=400&fit=crop",
  },
  {
    id: "funghi",
    name: "Funghi",
    ingredients:
      "Crème fraîche, mozzarella, mélange de champignons, ail, persil, truffe",
    price: "13,00 €",
    category: "vegetariennes",
    image:
      "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&h=400&fit=crop",
  },
];

export const HERO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1920&h=1080&fit=crop&q=80",
    alt: "Pizza Margherita sortant du four à bois",
  },
  {
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1920&h=1080&fit=crop&q=80",
    alt: "Pizza garnie d'ingrédients frais sur planche en bois",
  },
  {
    src: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1920&h=1080&fit=crop&q=80",
    alt: "Brochettes de viande grillées au barbecue",
  },
];

export const GALLERY_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=800&fit=crop",
    alt: "Salle du restaurant L'Arc en Ciel",
    tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&h=400&fit=crop",
    alt: "Pizza au feu de bois",
  },
  {
    src: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    alt: "Grillades et brochettes",
  },
  {
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=800&fit=crop",
    alt: "Assiette généreuse de viande grillée",
    tall: true,
  },
  {
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
    alt: "Ambiance terrasse du restaurant",
  },
  {
    src: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&h=400&fit=crop",
    alt: "Pizza signature L'Arc en Ciel",
  },
  {
    src: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=400&fit=crop",
    alt: "Salade fraîche méditerranéenne",
  },
  {
    src: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=800&fit=crop",
    alt: "Tiramisu maison",
    tall: true,
  },
];

export const REVIEWS = [
  {
    name: "Sophie M.",
    rating: 5,
    text: "Les meilleures pizzas de Morangis ! La pâte est fine, croustillante, et les ingrédients sont d'une fraîcheur incroyable. La Méditerranéenne est un pur délice. On y retourne chaque semaine.",
    date: "Il y a 2 semaines",
  },
  {
    name: "Thomas R.",
    rating: 5,
    text: "Service rapide, pizzas généreuses et un accueil toujours chaleureux. Les grillades sont excellentes aussi ! On commande ici chaque vendredi soir en famille.",
    date: "Il y a 1 mois",
  },
  {
    name: "Amina K.",
    rating: 5,
    text: "Enfin une vraie pizzeria artisanale avec du halal ! On sent le savoir-faire dans chaque bouchée. La livraison est toujours à l'heure et les pizzas arrivent chaudes.",
    date: "Il y a 3 semaines",
  },
  {
    name: "Pierre L.",
    rating: 4,
    text: "Très bonne découverte. L'Arc en Ciel (la pizza signature) est originale et délicieuse. Ambiance familiale, terrasse agréable aux beaux jours. Je recommande vivement.",
    date: "Il y a 1 mois",
  },
  {
    name: "Nadia B.",
    rating: 5,
    text: "Le traiteur pour notre mariage était parfait. Brochettes d'agneau, kefta, pizzas au feu de bois — tous les invités ont adoré. Merci l'équipe !",
    date: "Il y a 2 mois",
  },
];

export const SIGNATURES = [
  {
    icon: "fire",
    title: "Cuisson au Feu de Bois",
    description:
      "Four traditionnel à 400°C pour une croûte parfaitement dorée et croustillante.",
  },
  {
    icon: "ingredients",
    title: "Produits Frais & Halal",
    description:
      "Viandes halal, poissons frais du marché, légumes de saison — qualité sans compromis.",
  },
  {
    icon: "dough",
    title: "Fait Maison",
    description:
      "Pâte pétrie chaque jour, sauces maison, desserts artisanaux. Rien d'industriel.",
  },
];
