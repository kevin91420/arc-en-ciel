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
          <Hero />
          <Signature />
          <div className="relative">
            <div className="h-4 sm:h-5 bg-brown bg-paper" />
            <div className="h-3 bg-gradient-to-b from-brown/20 to-transparent" />
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

  return (
    <>
      <CustomCursor />
      <Header restaurant={restaurant} />
      <main id="main-content">
        <Hero heroImages={heroImages} restaurant={restaurant} />
        <Signature />
        <div className="text-cream bg-white-warm -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <Menu pizzas={pizzas} restaurant={restaurant} />
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
