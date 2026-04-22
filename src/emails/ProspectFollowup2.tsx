import { Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph, Button } from "./BaseLayout";

interface Props {
  restaurantName: string;
  city?: string | null;
  contactName?: string | null;
}

/**
 * FOLLOW-UP #2 — J+7, toujours pas de réponse.
 * On zoome sur UN bénéfice précis + CTA ultra-court.
 * Ici : le QR "appel serveur" — démonstrable en 30 secondes.
 */
export default function ProspectFollowup2({
  restaurantName,
  contactName,
}: Props) {
  const greeting = contactName ? `Bonjour ${contactName}` : "Bonjour";

  return (
    <BaseLayout
      preview={`Le QR à table — 30 secondes de démo pour ${restaurantName}.`}
      showFooter={false}
    >
      <Heading>Le serveur, appelé d&apos;un pouce.</Heading>

      <Paragraph>{greeting},</Paragraph>

      <Paragraph>
        Si je dois ne garder qu&apos;une seule brique de GOURMET PACK à vous
        montrer, c&apos;est celle-ci :
      </Paragraph>

      <Paragraph>
        Un <strong>QR code sur chaque table</strong>. Le client le scanne,
        appuie sur &laquo;&nbsp;Appeler le serveur&nbsp;&raquo; ou
        &laquo;&nbsp;Addition&nbsp;&raquo;. Votre équipe reçoit une alerte
        sur tablette. Plus de clients qui font de grands signes, plus de
        serveurs qui passent 40 fois à la table.
      </Paragraph>

      <Paragraph>
        C&apos;est installé en 2 heures, sans changer votre logiciel de
        caisse. Et la démo tient en 30 secondes.
      </Paragraph>

      <div style={{ textAlign: "center" as const, margin: "28px 0" }}>
        <Button href="https://arc-en-ciel-theta.vercel.app/m/qr">
          Voir la démo live →
        </Button>
      </div>

      <Paragraph>
        Si ça vous parle, je cale 10 minutes quand vous voulez — il suffit
        de répondre &laquo;&nbsp;ok&nbsp;&raquo;.
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
