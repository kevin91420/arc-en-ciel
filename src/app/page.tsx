import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Signature from "@/components/Signature";
import { WaveDivider } from "@/components/Decorations";
import CustomCursor from "@/components/CustomCursor";
import {
  getSettings,
  getPizzas,
  getReviews,
  getHeroImages,
  getServices,
} from "@/sanity/queries";
import { isSanityImageRef, urlFor } from "@/sanity/image";

const Footer = dynamic(() => import("@/components/Footer"));
const Menu = dynamic(() => import("@/components/Menu"));
const Services = dynamic(() => import("@/components/Services"));
const OrderCTA = dynamic(() => import("@/components/OrderCTA"));

const Reviews = dynamic(() => import("@/components/Reviews"));
const InfosPratiques = dynamic(() => import("@/components/InfosPratiques"));

export const revalidate = 60; // Revalide les données toutes les 60s

export default async function Home() {
  const [settings, pizzas, reviews, heroImages, services] =
    await Promise.all([
      getSettings(),
      getPizzas(),
      getReviews(),
      getHeroImages(),
      getServices(),
    ]);

  // Fallback: si Sanity est vide, utiliser les données statiques
  const hasData = settings && pizzas?.length > 0;

  if (!hasData) {
    // Import statique fallback
    const { RESTAURANT, PIZZAS, REVIEWS, HERO_IMAGES } =
      await import("@/data/restaurant");
    return (
      <>
        <CustomCursor />
        <Header />
        <main id="main-content">
          <p className="sr-only">
            L&apos;Arc en Ciel est une pizzeria au feu de bois située au 36 rue de l&apos;Église à Morangis (91420), dans l&apos;Essonne. Notre restaurant méditerranéen propose des pizzas artisanales cuites au feu de bois, des grillades, des pâtes fraîches et des salades. Nous offrons la livraison à domicile, la vente à emporter et un service sur place avec terrasse. Ouvert du lundi au dimanche, L&apos;Arc en Ciel est votre pizzeria de quartier à Morangis pour des repas savoureux préparés avec des ingrédients frais et de qualité. Commandez par téléphone au 01 64 54 00 30. Note Google : 4,4/5 avec plus de 430 avis clients.
          </p>
          <Hero />
          <Signature />
          <div className="bg-cream bg-paper">
            <WaveDivider className="text-white-warm h-6 sm:h-8" flip />
          </div>
          <Menu />
          <Services />
          <OrderCTA />
          <Reviews />
          <div className="text-cream bg-brown -mb-px h-6 sm:h-8">
            <WaveDivider className="h-full" />
          </div>
          <InfosPratiques />
        </main>
        <Footer />
      </>
    );
  }

  // Transform settings to RESTAURANT format
  const restaurant = {
    name: settings.name,
    tagline: settings.tagline,
    description: settings.description,
    phone: settings.phone,
    phoneHref: `tel:+33${settings.phone?.replace(/\s/g, "").replace(/^0/, "")}`,
    email: settings.email,
    address: settings.address,
    mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1318.2!2d2.3387!3d48.7056!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e6761a75633f79%3A0xe6d4d01a0b30c2c9!2sL'ARC%20EN%20CIEL%20PIZZA%20AU%20FEU%20DE%20BOIS!5e0!3m2!1sfr!2sfr!4v1",
    mapsLink: settings.mapsLink,
    menuPdf: "https://cdn.website.dish.co/media/82/5b/9435796/MENU-SUR-PLACE.pdf",
    menuEmporterPdf: "https://cdn.website.dish.co/media/5f/40/9568511/MENU-A-EMPORTER.pdf",
    menuDessertsPdf: "https://cdn.website.dish.co/media/6f/d2/9435808/CARTE-DES-DESSERTS.pdf",
    orderUrl: "#commander",
    hours: settings.hours || [],
    socials: {
      facebook: settings.facebookUrl,
      instagram: settings.instagramUrl,
      google: settings.googleUrl,
    },
    payment: settings.payment || [],
    services: services || [],
  };

  const heroPosterUrl =
    heroImages?.[0] && isSanityImageRef(heroImages[0].image)
      ? urlFor(heroImages[0].image)
          .width(960)
          .height(540)
          .fit("crop")
          .auto("format")
          .quality(78)
          .url()
      : undefined;

  const heroImagesForClient =
    heroImages?.length &&
    heroImages.some((h: { image?: unknown }) => isSanityImageRef(h.image))
      ? heroImages.map((h: { alt?: string; image?: unknown }) => ({
          alt: h.alt ?? "",
          src: isSanityImageRef(h.image)
            ? urlFor(h.image)
                .width(960)
                .height(540)
                .fit("crop")
                .auto("format")
                .quality(80)
                .url()
            : "",
        }))
      : undefined;

  const pizzasForMenu = pizzas.map(
    (p: { image?: unknown; featured?: boolean }) => ({
      ...p,
      image: isSanityImageRef(p.image)
        ? urlFor(p.image)
            .width(p.featured ? 1200 : 640)
            .height(p.featured ? 800 : 427)
            .fit("crop")
            .auto("format")
            .quality(82)
            .url()
        : "",
    })
  );

  return (
    <>
      <CustomCursor />
      <Header restaurant={restaurant} />
      <main id="main-content">
        <p className="sr-only">
          L&apos;Arc en Ciel est une pizzeria au feu de bois située au 36 rue de l&apos;Église à Morangis (91420), dans l&apos;Essonne. Notre restaurant méditerranéen propose des pizzas artisanales cuites au feu de bois, des grillades, des pâtes fraîches et des salades. Nous offrons la livraison à domicile, la vente à emporter et un service sur place avec terrasse. Ouvert du lundi au dimanche, L&apos;Arc en Ciel est votre pizzeria de quartier à Morangis pour des repas savoureux préparés avec des ingrédients frais et de qualité. Commandez par téléphone au 01 64 54 00 30. Note Google : 4,4/5 avec plus de 430 avis clients.
        </p>
        <Hero
          heroPosterUrl={heroPosterUrl}
          heroImages={heroImagesForClient}
          restaurant={restaurant}
        />
        <Signature />
        <Menu pizzas={pizzasForMenu} restaurant={restaurant} />
        <Services services={services} />
        <OrderCTA restaurant={restaurant} />
        <Reviews reviews={reviews} />
        <div className="text-cream bg-brown -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <InfosPratiques restaurant={restaurant} />
      </main>
      <Footer restaurant={restaurant} />
    </>
  );
}
