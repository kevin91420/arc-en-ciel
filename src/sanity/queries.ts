import { client } from "./client";

// ── Site Settings ──
export async function getSettings() {
  return client.fetch(
    `*[_type == "siteSettings"][0]{
      name, tagline, description, phone, email, address,
      mapsLink, menuPdf, hours, payment,
      facebookUrl, instagramUrl, googleUrl
    }`
  );
}

// ── Pizzas ──
export async function getPizzas() {
  return client.fetch(
    `*[_type == "pizza"] | order(order asc){
      _id,
      "id": slug.current,
      name, ingredients, price, category,
      image,
      badge, featured
    }`
  );
}

// ── Reviews ──
export async function getReviews() {
  return client.fetch(
    `*[_type == "review"]{
      _id, name, rating, text, date
    }`
  );
}

// ── Hero Images ──
export async function getHeroImages() {
  return client.fetch(
    `*[_type == "heroImage"] | order(order asc){
      _id,
      alt,
      image
    }`
  );
}

// ── Gallery Images ──
export async function getGalleryImages() {
  return client.fetch(
    `*[_type == "galleryImage"] | order(order asc){
      _id,
      "src": image.asset->url,
      alt, tall
    }`
  );
}

// ── Services ──
export async function getServices() {
  return client.fetch(
    `*[_type == "service"] | order(order asc){
      _id, icon, label, desc
    }`
  );
}
