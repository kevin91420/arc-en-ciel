/**
 * Script de migration : pousse les données de restaurant.ts vers Sanity
 * Usage: node scripts/seed-sanity.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "0ouu300a",
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// ── Helper: upload image from URL ──
async function uploadImage(url, filename) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const asset = await client.assets.upload("image", Buffer.from(buffer), {
      filename,
    });
    return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
  } catch (err) {
    console.warn(`⚠️  Image upload failed for ${filename}:`, err.message);
    return undefined;
  }
}

// ── Data ──
const SETTINGS = {
  _type: "siteSettings",
  _id: "siteSettings",
  name: "L'Arc en Ciel",
  tagline: "Pizzas au Feu de Bois & Grillades · Morangis",
  description:
    "Une ambiance familiale et conviviale, des pizzas cuites au feu de bois, des grillades, une variété de viandes et poissons frais. Cuisine saine, colorée et généreuse.",
  phone: "01 64 54 00 30",
  email: "larcencielmorangis@gmail.com",
  address: "36 Rue de l'Église, 91420 Morangis",
  mapsLink: "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
  menuPdf: "https://cdn.website.dish.co/media/16/69/6003710/Menu.pdf",
  hours: [
    { _key: "h1", days: "Lundi – Samedi", time: "11h30 – 14h30 · 18h30 – 22h30" },
    { _key: "h2", days: "Dimanche", time: "Fermé" },
  ],
  payment: ["Espèces", "Visa", "MasterCard", "Sans contact", "Apple Pay", "Ticket Restaurant®", "Chèques Vacances"],
  facebookUrl: "https://facebook.com/larcencielmorangis",
  instagramUrl: "https://instagram.com/larcencielmorangis",
  googleUrl: "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
};

const PIZZAS = [
  { id: "margherita", name: "Margherita", ingredients: "Sauce tomate, mozzarella fior di latte, basilic frais, huile d'olive", price: "9,50 €", category: "classiques", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop", order: 1 },
  { id: "regina", name: "Regina", ingredients: "Sauce tomate, mozzarella, jambon, champignons, olives", price: "11,50 €", category: "classiques", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop", order: 2 },
  { id: "napolitaine", name: "Napolitaine", ingredients: "Sauce tomate, mozzarella, anchois, câpres, olives noires", price: "11,00 €", category: "classiques", image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&h=400&fit=crop", order: 3 },
  { id: "quatre-fromages", name: "Quatre Fromages", ingredients: "Mozzarella, gorgonzola, chèvre, parmesan, miel", price: "12,50 €", category: "classiques", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop", order: 4 },
  { id: "calzone", name: "Calzone", ingredients: "Sauce tomate, mozzarella, jambon, champignons, œuf", price: "12,00 €", category: "classiques", image: "https://images.unsplash.com/photo-1536964549204-cce9eab227bd?w=600&h=400&fit=crop", order: 5 },
  { id: "mediterraneenne", name: "Méditerranéenne", ingredients: "Sauce tomate, mozzarella, poivrons grillés, aubergines, feta, origan", price: "13,50 €", category: "speciales", image: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600&h=400&fit=crop", badge: "Chef", order: 6 },
  { id: "arc-en-ciel", name: "L'Arc en Ciel", ingredients: "Crème fraîche, mozzarella, saumon fumé, aneth, citron, roquette", price: "14,50 €", category: "speciales", image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&h=400&fit=crop", badge: "★ Signature", featured: true, order: 7 },
  { id: "truffe", name: "Truffe Noire", ingredients: "Crème de truffe, mozzarella di bufala, champignons, roquette, copeaux de parmesan", price: "15,50 €", category: "speciales", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop", badge: "Premium", order: 8 },
  { id: "bresaola", name: "Bresaola", ingredients: "Mozzarella, bresaola, roquette, copeaux de parmesan, huile de truffe", price: "14,00 €", category: "speciales", image: "https://images.unsplash.com/photo-1600028068383-ea11a7a101f3?w=600&h=400&fit=crop", order: 9 },
  { id: "veggie-garden", name: "Jardin d'Été", ingredients: "Sauce tomate, mozzarella, courgettes, tomates cerises, basilic, pignons", price: "12,00 €", category: "vegetariennes", image: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=600&h=400&fit=crop", badge: "Veggie", order: 10 },
  { id: "caprese", name: "Caprese", ingredients: "Mozzarella di bufala, tomates fraîches, basilic, huile d'olive vierge", price: "12,50 €", category: "vegetariennes", image: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&h=400&fit=crop", order: 11 },
  { id: "funghi", name: "Funghi", ingredients: "Crème fraîche, mozzarella, mélange de champignons, ail, persil, truffe", price: "13,00 €", category: "vegetariennes", image: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&h=400&fit=crop", order: 12 },
];

const REVIEWS = [
  { name: "Sophie M.", rating: 5, text: "Les meilleures pizzas de Morangis ! La pâte est fine, croustillante, et les ingrédients sont d'une fraîcheur incroyable. La Méditerranéenne est un pur délice. On y retourne chaque semaine.", date: "Il y a 2 semaines" },
  { name: "Thomas R.", rating: 5, text: "Service rapide, pizzas généreuses et un accueil toujours chaleureux. Les grillades sont excellentes aussi ! On commande ici chaque vendredi soir en famille.", date: "Il y a 1 mois" },
  { name: "Amina K.", rating: 5, text: "Enfin une vraie pizzeria artisanale avec du halal ! On sent le savoir-faire dans chaque bouchée. La livraison est toujours à l'heure et les pizzas arrivent chaudes.", date: "Il y a 3 semaines" },
  { name: "Pierre L.", rating: 4, text: "Très bonne découverte. L'Arc en Ciel (la pizza signature) est originale et délicieuse. Ambiance familiale, terrasse agréable aux beaux jours. Je recommande vivement.", date: "Il y a 1 mois" },
  { name: "Nadia B.", rating: 5, text: "Le traiteur pour notre mariage était parfait. Brochettes d'agneau, kefta, pizzas au feu de bois — tous les invités ont adoré. Merci l'équipe !", date: "Il y a 2 mois" },
];

const HERO_IMAGES = [
  { src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1920&h=1080&fit=crop&q=80", alt: "Pizza Margherita sortant du four à bois", order: 1 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1920&h=1080&fit=crop&q=80", alt: "Pizza garnie d'ingrédients frais sur planche en bois", order: 2 },
  { src: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1920&h=1080&fit=crop&q=80", alt: "Brochettes de viande grillées au barbecue", order: 3 },
];

const GALLERY_IMAGES = [
  { src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=800&fit=crop", alt: "Salle du restaurant L'Arc en Ciel", tall: true, order: 1 },
  { src: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&h=400&fit=crop", alt: "Pizza au feu de bois", tall: false, order: 2 },
  { src: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop", alt: "Grillades et brochettes", tall: false, order: 3 },
  { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=800&fit=crop", alt: "Assiette généreuse de viande grillée", tall: true, order: 4 },
  { src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop", alt: "Ambiance terrasse du restaurant", tall: false, order: 5 },
  { src: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&h=400&fit=crop", alt: "Pizza signature L'Arc en Ciel", tall: false, order: 6 },
  { src: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=400&fit=crop", alt: "Salade fraîche méditerranéenne", tall: false, order: 7 },
  { src: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=800&fit=crop", alt: "Tiramisu maison", tall: true, order: 8 },
];

const SERVICES = [
  { icon: "truck", label: "Livraison", desc: "À domicile dans Morangis et environs", order: 1 },
  { icon: "bag", label: "À emporter", desc: "Prêt en 20 min, appelez pour commander", order: 2 },
  { icon: "sun", label: "Terrasse", desc: "Profitez des beaux jours en extérieur", order: 3 },
  { icon: "users", label: "Événements privés", desc: "Mariages, anniversaires, réceptions", order: 4 },
  { icon: "chef", label: "Service traiteur", desc: "Pour vos événements sur mesure", order: 5 },
  { icon: "accessible", label: "Accès PMR", desc: "Accessible aux personnes à mobilité réduite", order: 6 },
];

// ── Main migration ──
async function main() {
  console.log("🚀 Migration vers Sanity...\n");

  // 1. Settings
  console.log("⚙️  Paramètres du restaurant...");
  await client.createOrReplace(SETTINGS);
  console.log("   ✅ Paramètres créés\n");

  // 2. Pizzas
  console.log("🍕 Pizzas...");
  for (const p of PIZZAS) {
    const image = await uploadImage(p.image, `pizza-${p.id}.jpg`);
    await client.createOrReplace({
      _type: "pizza",
      _id: `pizza-${p.id}`,
      name: p.name,
      slug: { _type: "slug", current: p.id },
      ingredients: p.ingredients,
      price: p.price,
      category: p.category,
      image,
      badge: p.badge || "",
      featured: p.featured || false,
      order: p.order,
    });
    console.log(`   ✅ ${p.name}`);
  }

  // 3. Reviews
  console.log("\n⭐ Avis clients...");
  for (let i = 0; i < REVIEWS.length; i++) {
    const r = REVIEWS[i];
    await client.createOrReplace({
      _type: "review",
      _id: `review-${i + 1}`,
      name: r.name,
      rating: r.rating,
      text: r.text,
      date: r.date,
    });
    console.log(`   ✅ ${r.name}`);
  }

  // 4. Hero Images
  console.log("\n🖼️  Images Hero...");
  for (let i = 0; i < HERO_IMAGES.length; i++) {
    const h = HERO_IMAGES[i];
    const image = await uploadImage(h.src, `hero-${i + 1}.jpg`);
    await client.createOrReplace({
      _type: "heroImage",
      _id: `hero-${i + 1}`,
      image,
      alt: h.alt,
      order: h.order,
    });
    console.log(`   ✅ ${h.alt}`);
  }

  // 5. Gallery
  console.log("\n📸 Galerie...");
  for (let i = 0; i < GALLERY_IMAGES.length; i++) {
    const g = GALLERY_IMAGES[i];
    const image = await uploadImage(g.src, `gallery-${i + 1}.jpg`);
    await client.createOrReplace({
      _type: "galleryImage",
      _id: `gallery-${i + 1}`,
      image,
      alt: g.alt,
      tall: g.tall,
      order: g.order,
    });
    console.log(`   ✅ ${g.alt}`);
  }

  // 6. Services
  console.log("\n🚚 Services...");
  for (const s of SERVICES) {
    await client.createOrReplace({
      _type: "service",
      _id: `service-${s.icon}`,
      icon: s.icon,
      label: s.label,
      desc: s.desc,
      order: s.order,
    });
    console.log(`   ✅ ${s.label}`);
  }

  console.log("\n🎉 Migration terminée ! Toutes les données sont dans Sanity.");
}

main().catch(console.error);
