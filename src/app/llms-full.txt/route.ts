export function GET() {
  const content = `# L'Arc en Ciel — Pizzeria au Feu de Bois à Morangis (Guide Complet)

> Pizzeria méditerranéenne familiale proposant des pizzas artisanales cuites au feu de bois à 400°C, grillades, pâtes fraîches et salades. Située au 36 Rue de l'Église, 91420 Morangis, Essonne, France.

## Informations générales
- Nom: L'Arc en Ciel
- Type: Pizzeria au feu de bois, restaurant méditerranéen
- Adresse: 36 Rue de l'Église, 91420 Morangis, France
- Téléphone: 01 64 54 00 30
- Email: arcenciel91420@gmail.com
- Coordonnées GPS: 48.7056, 2.3387
- Note Google: 4.4/5 (430 avis)
- Prix moyen: 8€ - 35€
- Paiement accepté: Espèces, Carte bancaire, Ticket restaurant
- Certifications: Produits halal

## Horaires d'ouverture
- Mardi: 11h30 - 14h30 / 18h00 - 22h30
- Mercredi: 11h30 - 14h30 / 18h00 - 22h30
- Jeudi: 11h30 - 14h30 / 18h00 - 22h30
- Vendredi: 11h30 - 14h30 / 18h00 - 22h30
- Samedi: 11h30 - 14h30 / 18h00 - 22h30
- Dimanche: 18h00 - 22h30
- Lundi: Fermé

## Services
1. **Sur place**: Salle climatisée avec décoration méditerranéenne
2. **Terrasse**: Espace extérieur pour les beaux jours
3. **À emporter**: Prêt en 20 minutes, commande par téléphone
4. **Livraison**: À domicile dans Morangis et environs (rayon ~5km), délai ~30 minutes
5. **Service traiteur**: Pour vos événements sur mesure
6. **Événements privés**: Mariages, anniversaires, réceptions
7. **Accès PMR**: Accessible aux personnes à mobilité réduite

## Notre savoir-faire
- **Cuisson au feu de bois**: Four traditionnel chauffé à 400°C pour une croûte parfaitement dorée et croustillante
- **Produits frais et halal**: Viandes halal, poissons frais du marché, légumes de saison — qualité sans compromis
- **Pâte maison**: Pâte pétrie chaque jour, sauces maison, desserts artisanaux. Rien d'industriel.

## Menu — Pizzas au feu de bois

### Pizzas Classiques
- Margherita: 8,50€ — Sauce tomate, mozzarella, basilic frais, huile d'olive
- Reine: 10,50€ — Sauce tomate, mozzarella, jambon, champignons
- 4 Fromages: 11,50€ — Mozzarella, gorgonzola, chèvre, parmesan
- Calzone: 12,00€ — Chausson garni sauce tomate, mozzarella, jambon, champignons, oeuf

### Pizzas Spéciales
- L'Arc en Ciel: 13,50€ — Sauce tomate, mozzarella, merguez, poivrons, oignons, olives, oeuf (Pizza signature)
- Kebab: 13,00€ — Sauce blanche, mozzarella, viande kebab, oignons, salade, tomates
- Orientale: 13,50€ — Sauce tomate, mozzarella, merguez, poivrons, oignons, harissa
- Capresa: 12,54€ — Mozzarella di bufala, tomates fraîches, basilic, huile d'olive vierge

### Pizzas Végétariennes
- Végétarienne: 11,00€ — Sauce tomate, mozzarella, poivrons, champignons, oignons, olives, artichauts
- Chèvre Miel: 12,00€ — Crème fraîche, mozzarella, chèvre, miel, noix
- Tom: 33,00€ — Crème fraîche, mozzarella, mélange de champignons, ail, persil, truffe

### Autres plats disponibles
- Grillades (viandes et poissons)
- Pâtes fraîches
- Salades composées
- Entrées méditerranéennes
- Desserts maison (Tiramisu, Panna Cotta)

## Menus PDF complets
- Menu sur place: https://cdn.website.dish.co/media/82/5b/9435796/MENU-SUR-PLACE.pdf
- Menu à emporter: https://cdn.website.dish.co/media/5f/40/9568511/MENU-A-EMPORTER.pdf
- Carte des desserts: https://cdn.website.dish.co/media/6f/d2/9435808/CARTE-DES-DESSERTS.pdf

## Avis clients (sélection)
- Sophie M. (5/5): "Les meilleures pizzas de Morangis ! La pâte est parfaite, fine et croustillante. Le personnel est adorable."
- Thomas R. (5/5): "Excellent rapport qualité-prix. La pizza L'Arc en Ciel est un délice. Livraison toujours à l'heure."
- Amina K. (4/5): "Très bon restaurant familial. Les grillades sont savoureuses et les portions généreuses."

## FAQ

### Quels sont les horaires de L'Arc en Ciel ?
L'Arc en Ciel est ouvert du mardi au samedi de 11h30 à 14h30 et de 18h00 à 22h30, et le dimanche de 18h00 à 22h30. Le restaurant est fermé le lundi.

### L'Arc en Ciel propose-t-il la livraison ?
Oui, nous livrons à domicile dans Morangis et les communes environnantes. Délai de livraison estimé : 30 minutes. Commandez par téléphone au 01 64 54 00 30.

### Les pizzas sont-elles cuites au feu de bois ?
Oui, toutes nos pizzas sont cuites dans un four traditionnel au feu de bois chauffé à 400°C, garantissant une croûte parfaitement dorée et croustillante.

### Le restaurant propose-t-il des plats halal ?
Oui, nous proposons des viandes halal certifiées, des poissons frais du marché et des légumes de saison.

### Le restaurant est-il accessible aux personnes à mobilité réduite ?
Oui, L'Arc en Ciel est entièrement accessible aux personnes à mobilité réduite (PMR).

### Peut-on organiser un événement privé ?
Oui, nous accueillons mariages, anniversaires et réceptions sur mesure. Contactez-nous au 01 64 54 00 30 pour en discuter.

### Quels moyens de paiement sont acceptés ?
Nous acceptons les espèces, les cartes bancaires et les tickets restaurant.

## Liens
- Site web: https://arc-en-ciel-theta.vercel.app
- Google Maps: https://maps.app.goo.gl/abc123
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
