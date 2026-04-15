export default function JsonLd() {
  const restaurant = {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": "https://arc-en-ciel-theta.vercel.app/#restaurant",
    name: "L'Arc en Ciel",
    image: "https://arc-en-ciel-theta.vercel.app/opengraph-image",
    url: "https://arc-en-ciel-theta.vercel.app",
    telephone: "+33164540030",
    email: "larcencielmorangis@gmail.com",
    description:
      "Pizzas artisanales cuites au feu de bois, grillades, pâtes et spécialités méditerranéennes à Morangis. Cuisine maison, ingrédients frais, ambiance familiale.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "36 Rue de l'Eglise",
      addressLocality: "Morangis",
      postalCode: "91420",
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 48.7056,
      longitude: 2.3387,
    },
    areaServed: {
      "@type": "City",
      name: "Morangis",
    },
    servesCuisine: ["Pizza", "Grillades", "Pâtes", "Méditerranéenne"],
    priceRange: "€€",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "11:30",
        closes: "14:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "18:30",
        closes: "22:30",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.4",
      bestRating: "5",
      reviewCount: "430",
    },
    hasMenu: [
      {
        "@type": "Menu",
        name: "Menu sur place",
        url: "https://cdn.website.dish.co/media/82/5b/9435796/MENU-SUR-PLACE.pdf",
      },
      {
        "@type": "Menu",
        name: "Menu à emporter",
        url: "https://cdn.website.dish.co/media/5f/40/9568511/MENU-A-EMPORTER.pdf",
      },
      {
        "@type": "Menu",
        name: "Carte des desserts",
        url: "https://cdn.website.dish.co/media/6f/d2/9435808/CARTE-DES-DESSERTS.pdf",
      },
    ],
    sameAs: [
      "https://facebook.com/larcencielmorangis",
      "https://instagram.com/larcencielmorangis",
      "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
    ],
  };

  const menu = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Carte L'Arc en Ciel",
    hasMenuSection: [
      {
        "@type": "MenuSection",
        name: "Nos Pizzas",
        hasMenuItem: [
          {
            "@type": "MenuItem",
            name: "Margherita",
            description: "Sauce tomate, mozzarella, basilic frais",
            offers: {
              "@type": "Offer",
              price: "9.50",
              priceCurrency: "EUR",
            },
          },
          {
            "@type": "MenuItem",
            name: "Reine",
            description: "Sauce tomate, mozzarella, jambon, champignons",
            offers: {
              "@type": "Offer",
              price: "11.50",
              priceCurrency: "EUR",
            },
          },
          {
            "@type": "MenuItem",
            name: "4 Fromages",
            description:
              "Sauce tomate, mozzarella, chèvre, roquefort, emmental",
            offers: {
              "@type": "Offer",
              price: "12.50",
              priceCurrency: "EUR",
            },
          },
          {
            "@type": "MenuItem",
            name: "Calzone",
            description: "Pizza pliée, sauce tomate, mozzarella, jambon, œuf",
            offers: {
              "@type": "Offer",
              price: "13.50",
              priceCurrency: "EUR",
            },
          },
        ],
      },
    ],
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://arc-en-ciel-theta.vercel.app",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurant) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menu) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
