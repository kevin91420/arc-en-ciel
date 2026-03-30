import type { Metadata } from "next";
import { Playfair_Display, Lato, Dancing_Script } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
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
  title: "L'Arc en Ciel | Pizzeria Mediterraneenne - Morangis",
  description:
    "Pizzas artisanales cuites au feu de bois a Morangis. Pate maison, ingredients frais, livraison rapide. Decouvrez notre menu et commandez en ligne.",
  keywords: "pizza, pizzeria, Morangis, livraison, feu de bois, mediterraneenne",
  openGraph: {
    title: "L'Arc en Ciel | Pizzeria Mediterraneenne",
    description: "Pizzas artisanales cuites au feu de bois a Morangis.",
    type: "website",
    locale: "fr_FR",
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
