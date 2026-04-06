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
  getGalleryImages,
  getServices,
} from "@/sanity/queries";

const Footer = dynamic(() => import("@/components/Footer"));
const Menu = dynamic(() => import("@/components/Menu"));
const Services = dynamic(() => import("@/components/Services"));
const OrderCTA = dynamic(() => import("@/components/OrderCTA"));
const Gallery = dynamic(() => import("@/components/Gallery"));
const Reviews = dynamic(() => import("@/components/Reviews"));
const InfosPratiques = dynamic(() => import("@/components/InfosPratiques"));

export const revalidate = 60; // Revalide les données toutes les 60s

export default async function Home() {
  const [settings, pizzas, reviews, heroImages, galleryImages, services] =
    await Promise.all([
      getSettings(),
      getPizzas(),
      getReviews(),
      getHeroImages(),
      getGalleryImages(),
      getServices(),
    ]);

  // Fallback: si Sanity est vide, utiliser les données statiques
  const hasData = settings && pizzas?.length > 0;

  if (!hasData) {
    // Import statique fallback
    const { RESTAURANT, PIZZAS, REVIEWS, HERO_IMAGES, GALLERY_IMAGES } =
      await import("@/data/restaurant");
    return (
      <>
        <CustomCursor />
        <Header />
        <main id="main-content">
          <Hero />
          <Signature />
          <div className="text-cream bg-white-warm -mb-px h-6 sm:h-8">
            <WaveDivider className="h-full" />
          </div>
          <Menu />
          <Services />
          <OrderCTA />
          <Gallery />
          <div className="text-brown bg-cream-dark -mb-px h-6 sm:h-8">
            <WaveDivider className="h-full" />
          </div>
          <Reviews />
          <div className="text-white-warm bg-brown -mb-px h-6 sm:h-8">
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
    mapsUrl: "",
    mapsLink: settings.mapsLink,
    menuPdf: settings.menuPdf,
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
        <Gallery galleryImages={galleryImages} />
        <div className="text-brown bg-cream-dark -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <Reviews reviews={reviews} />
        <div className="text-white-warm bg-brown -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <InfosPratiques restaurant={restaurant} />
      </main>
      <Footer restaurant={restaurant} />
    </>
  );
}
