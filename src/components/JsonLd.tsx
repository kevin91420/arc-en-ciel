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
    acceptsReservations: true,
    paymentAccepted: "Cash, Credit Card, Ticket Restaurant",
    currenciesAccepted: "EUR",
    smokingAllowed: false,
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Accès PMR", value: true },
      { "@type": "LocationFeatureSpecification", name: "Terrasse", value: true },
      { "@type": "LocationFeatureSpecification", name: "Climatisation", value: true },
    ],
    potentialAction: {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "tel:+33164540030",
        actionPlatform: "http://schema.org/OfflinePlatform",
      },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Sophie M." },
        datePublished: "2025-03-15",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody: "Les meilleures pizzas de Morangis ! La pâte est parfaite.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Thomas R." },
        datePublished: "2025-02-20",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody: "Excellent rapport qualité-prix. Livraison toujours à l'heure.",
      },
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

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Quels sont les horaires de L'Arc en Ciel ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'Arc en Ciel est ouvert du mardi au samedi de 11h30 à 14h30 et de 18h00 à 22h30, et le dimanche de 18h00 à 22h30. Le restaurant est fermé le lundi.",
        },
      },
      {
        "@type": "Question",
        name: "L'Arc en Ciel propose-t-il la livraison ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, nous livrons à domicile dans Morangis et les communes environnantes en environ 30 minutes. Commandez par téléphone au 01 64 54 00 30.",
        },
      },
      {
        "@type": "Question",
        name: "Les pizzas sont-elles cuites au feu de bois ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, toutes nos pizzas sont cuites dans un four traditionnel au feu de bois chauffé à 400°C, garantissant une croûte parfaitement dorée et croustillante.",
        },
      },
      {
        "@type": "Question",
        name: "Le restaurant propose-t-il des plats halal ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, nous proposons des viandes halal certifiées, des poissons frais du marché et des légumes de saison.",
        },
      },
      {
        "@type": "Question",
        name: "Le restaurant est-il accessible aux personnes à mobilité réduite ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, L'Arc en Ciel est entièrement accessible aux personnes à mobilité réduite (PMR).",
        },
      },
      {
        "@type": "Question",
        name: "Peut-on organiser un événement privé ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, nous accueillons mariages, anniversaires et réceptions sur mesure. Contactez-nous au 01 64 54 00 30.",
        },
      },
      {
        "@type": "Question",
        name: "Quels moyens de paiement sont acceptés ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nous acceptons les espèces, les cartes bancaires et les tickets restaurant.",
        },
      },
    ],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "L'Arc en Ciel",
    url: "https://arc-en-ciel-theta.vercel.app",
    logo: "https://arc-en-ciel-theta.vercel.app/opengraph-image",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+33164540030",
      contactType: "reservations",
      availableLanguage: ["French"],
    },
    sameAs: [
      "https://facebook.com/larcencielmorangis",
      "https://instagram.com/larcencielmorangis",
    ],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "L'Arc en Ciel",
    url: "https://arc-en-ciel-theta.vercel.app",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}
