import { Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph } from "./BaseLayout";

interface Props {
  restaurantName: string;
  city?: string | null;
  contactName?: string | null;
}

/**
 * LAST CHANCE — J+14.
 * Ton : "je prends ça de ma liste", sans agressivité.
 * Le break-up email marche parce qu'il sort du bruit.
 */
export default function ProspectLastChance({
  restaurantName,
  contactName,
}: Props) {
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";

  return (
    <BaseLayout
      preview={`Je vous retire de ma liste — sauf si…`}
      showFooter={false}
    >
      <Heading>Je vous retire de ma liste.</Heading>

      <Paragraph>{greeting},</Paragraph>

      <Paragraph>
        Je vous ai écrit trois fois sans réponse — c&apos;est le signe
        clair qu&apos;il n&apos;y a pas de moment pour parler de
        GOURMET PACK chez {restaurantName}. Pas de souci, ça arrive.
      </Paragraph>

      <Paragraph>
        Je vous retire de ma liste de suivi aujourd&apos;hui. Pas de
        spam automatisé, pas de relances à n&apos;en plus finir.
      </Paragraph>

      <Paragraph>
        <strong>Sauf si</strong> l&apos;une de ces trois phrases est vraie :
      </Paragraph>

      <Text
        style={{
          color: "#2C1810",
          fontSize: "15px",
          lineHeight: 1.8,
          margin: "0 0 16px 16px",
        }}
      >
        &bull; &laquo;&nbsp;Ce n&apos;est pas le bon moment, mais relance-moi dans 3 mois.&nbsp;&raquo;
        <br />
        &bull; &laquo;&nbsp;Je ne suis pas la bonne personne, écris plutôt à…&nbsp;&raquo;
        <br />
        &bull; &laquo;&nbsp;En vrai, 10 minutes cette semaine, ça se tente.&nbsp;&raquo;
      </Text>

      <Paragraph>
        Dans ce cas, une ligne de réponse suffit. Sinon : bon service,
        et longue vie au restaurant.
      </Paragraph>

      <Text
        style={{
          color: "#2C1810",
          fontSize: "16px",
          fontWeight: 700,
          margin: "24px 0 2px 0",
          fontFamily: "Georgia, 'Playfair Display', serif",
        }}
      >
        Kevin
      </Text>
      <Text
        style={{
          color: "#8B6914",
          fontSize: "13px",
          letterSpacing: "1px",
          textTransform: "uppercase" as const,
          fontWeight: 600,
          margin: 0,
        }}
      >
        Fondateur de GOURMET PACK
      </Text>
      <Text
        style={{
          color: "#5C3D2E",
          fontSize: "12px",
          margin: "4px 0 0 0",
          opacity: 0.7,
        }}
      >
        kaubouin@gmail.com
      </Text>
    </BaseLayout>
  );
}
