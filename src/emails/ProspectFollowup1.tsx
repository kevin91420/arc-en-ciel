import { Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph } from "./BaseLayout";

interface Props {
  restaurantName: string;
  city?: string | null;
  contactName?: string | null;
}

/**
 * FOLLOW-UP #1 — J+3, pas de réponse.
 * Apporte de la valeur : un chiffre, un résultat concret.
 * Pas de relance de type "je relance". On ouvre avec un fait utile.
 */
export default function ProspectFollowup1({
  restaurantName,
  contactName,
}: Props) {
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";

  return (
    <BaseLayout
      preview={`Un chiffre qui change tout pour ${restaurantName}.`}
      showFooter={false}
    >
      <Heading>Un chiffre, juste un.</Heading>

      <Paragraph>{greeting},</Paragraph>

      <Paragraph>
        Je reviens vers vous avec un seul chiffre, parce que c&apos;est celui
        qui m&apos;a décidé à lancer GOURMET PACK :
      </Paragraph>

      <Text
        style={{
          color: "#B8922F",
          fontSize: "34px",
          fontWeight: 700,
          fontFamily: "Georgia, 'Playfair Display', serif",
          margin: "16px 0 4px 0",
          textAlign: "center" as const,
        }}
      >
        38 %
      </Text>
      <Text
        style={{
          color: "#5C3D2E",
          fontSize: "13px",
          textAlign: "center" as const,
          margin: "0 0 20px 0",
          letterSpacing: "0.5px",
        }}
      >
        des clients qui gagnent un tampon fidélité reviennent sous 21 jours.
      </Text>

      <Paragraph>
        C&apos;est ce qu&apos;on observe sur les restos équipés de la carte
        fidélité GOURMET PACK. Pas de magie : un QR, un tampon, un reward
        à 5 visites.
      </Paragraph>

      <Paragraph>
        Je ne cherche pas à vendre quoi que ce soit par mail. Juste savoir
        si l&apos;idée mérite 10 minutes d&apos;échange. Un oui ou un non
        me suffit — les deux sont des réponses utiles.
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
