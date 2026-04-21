import type { Metadata } from "next";
import CartePage from "./CartePage";

export const metadata: Metadata = {
  title: "La Carte — L'Arc en Ciel | Pizzeria au Feu de Bois à Morangis",
  description:
    "Découvrez la carte complète de L'Arc en Ciel : pizzas au feu de bois, grillades halal, pâtes fraîches, salades généreuses, desserts maison et sélection de vins.",
  alternates: { canonical: "https://arc-en-ciel-theta.vercel.app/carte" },
  openGraph: {
    title: "La Carte — L'Arc en Ciel",
    description:
      "Pizzas au feu de bois, grillades halal, pâtes fraîches, desserts maison — la carte complète.",
    type: "website",
    locale: "fr_FR",
    url: "https://arc-en-ciel-theta.vercel.app/carte",
  },
};

export default function Page() {
  return <CartePage />;
}
