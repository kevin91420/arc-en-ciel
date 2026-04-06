import type { Metadata } from "next";
import { Playfair_Display, Lato, Dancing_Script } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import JsonLd from "@/components/JsonLd";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair-display",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-dancing-script",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arc-en-ciel-theta.vercel.app"),
  title: "L'Arc en Ciel | Pizzeria Méditerranéenne - Morangis",
  description:
    "Pizzas artisanales cuites au feu de bois à Morangis. Pâte maison, ingrédients frais, livraison rapide. Découvrez notre menu et commandez en ligne.",
  keywords:
    "pizza, pizzeria, Morangis, livraison, feu de bois, méditerranéenne, grillades, restaurant",
  openGraph: {
    title: "L'Arc en Ciel | Pizzeria Méditerranéenne",
    description:
      "Pizzas artisanales cuites au feu de bois & grillades à Morangis. Pâte maison, ingrédients frais.",
    type: "website",
    locale: "fr_FR",
    siteName: "L'Arc en Ciel",
    url: "https://arc-en-ciel-theta.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Arc en Ciel | Pizzeria Méditerranéenne - Morangis",
    description:
      "Pizzas au feu de bois & grillades à Morangis. Découvrez notre carte !",
  },
  alternates: {
    canonical: "https://arc-en-ciel-theta.vercel.app",
  },
  verification: {
    google: "GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`h-full antialiased ${playfair.variable} ${lato.variable} ${dancingScript.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://cdn.website.dish.co" />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <MotionProvider>
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
