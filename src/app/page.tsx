import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Signature from "@/components/Signature";
import { WaveDivider } from "@/components/Decorations";
import CustomCursor from "@/components/CustomCursor";

const Footer = dynamic(() => import("@/components/Footer"));
const Menu = dynamic(() => import("@/components/Menu"));
const Services = dynamic(() => import("@/components/Services"));
const OrderCTA = dynamic(() => import("@/components/OrderCTA"));
const Gallery = dynamic(() => import("@/components/Gallery"));
const Reviews = dynamic(() => import("@/components/Reviews"));
const InfosPratiques = dynamic(() => import("@/components/InfosPratiques"));

export default function Home() {
  return (
    <>
      <CustomCursor />
      <Header />
      <main id="main-content">
        <Hero />
        <Signature />
        {/* Wave: white-warm (Signature) → cream (Menu) */}
        <div className="text-cream bg-white-warm -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <Menu />
        <Services />
        <OrderCTA />
        <Gallery />
        {/* Wave: cream-dark (Gallery) → brown (Reviews) */}
        <div className="text-brown bg-cream-dark -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <Reviews />
        {/* Wave: brown (Reviews) → white-warm (InfosPratiques) */}
        <div className="text-white-warm bg-brown -mb-px h-6 sm:h-8">
          <WaveDivider className="h-full" />
        </div>
        <InfosPratiques />
      </main>
      <Footer />
    </>
  );
}
