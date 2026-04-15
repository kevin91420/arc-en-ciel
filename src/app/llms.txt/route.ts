export function GET() {
  const content = `# L'Arc en Ciel — Pizzeria au Feu de Bois à Morangis

> Pizzeria méditerranéenne familiale proposant des pizzas cuites au feu de bois, grillades, pâtes et salades. Située au 36 Rue de l'Église, 91420 Morangis, France.

## Informations clés
- Nom: L'Arc en Ciel
- Type: Pizzeria au feu de bois, restaurant méditerranéen
- Adresse: 36 Rue de l'Église, 91420 Morangis, France
- Téléphone: 01 64 54 00 30
- Email: arcenciel91420@gmail.com
- Spécialités: Pizzas au feu de bois, grillades, pâtes fraîches, produits halal
- Services: Sur place, à emporter, livraison, terrasse, traiteur, événements privés
- Accès PMR: Oui
- Note Google: 4.4/5 (430 avis)
- Prix: €€ (8€ - 35€)
- Paiement: Espèces, Carte bancaire, Ticket restaurant

## Horaires
- Mardi au Samedi: 11h30 - 14h30 / 18h00 - 22h30
- Dimanche: 18h00 - 22h30
- Lundi: Fermé

## Menus (PDF)
- Menu sur place: https://cdn.website.dish.co/media/82/5b/9435796/MENU-SUR-PLACE.pdf
- Menu à emporter: https://cdn.website.dish.co/media/5f/40/9568511/MENU-A-EMPORTER.pdf
- Carte des desserts: https://cdn.website.dish.co/media/6f/d2/9435808/CARTE-DES-DESSERTS.pdf

## Liens
- Site web: https://arc-en-ciel-theta.vercel.app
- Version complète: https://arc-en-ciel-theta.vercel.app/llms-full.txt
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
