import { Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph } from "./BaseLayout";

interface Props {
  restaurantName: string;
  city?: string | null;
  contactName?: string | null;
}

/**
 * PREMIER CONTACT — ton humain, court, direct.
 * Pas de pitch marketing. Une phrase d'accroche, une phrase de valeur,
 * une question ouverte. Signé Kevin, reply-to = kaubouin@gmail.com.
 */
export default function ProspectIntro({
  restaurantName,
  city,
  contactName,
}: Props) {
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";
  const cityMention = city ? ` à ${city}` : "";

  return (
    <BaseLayout
      preview={`Une idée pour ${restaurantName} — 2 minutes de lecture.`}
      showFooter={false}
    >
      <Heading>{restaurantName}</Heading>

      <Paragraph>{greeting},</Paragraph>

      <Paragraph>
        Je tenais à vous écrire directement. Je dirige <strong>GOURMET PACK</strong> —
        un petit pack tech clé-en-main pour les restaurants indépendants{cityMention}.
      </Paragraph>

      <Paragraph>
        En clair : site de réservation, programme fidélité, QR à table pour
        appeler le serveur, et une petite cuisine-KDS. Installé, utilisé,
        maintenu — sans que vous ayez à gérer un prestataire différent pour
        chaque brique.
      </Paragraph>

      <Paragraph>
        Je n&apos;envoie pas ce mail à 500 restos. J&apos;ai regardé le vôtre
        avant d&apos;écrire. Est-ce que ça vous dit qu&apos;on en parle
        10 minutes cette semaine ?
      </Paragraph>

      <Paragraph>
        Vous pouvez simplement répondre à ce mail — je lis tout, personnellement.
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
