import { Section, Text } from "@react-email/components";
import {
  BaseLayout,
  Heading,
  Paragraph,
  Button,
  Divider,
} from "./BaseLayout";

interface Props {
  contactName: string;
  restaurantName: string;
}

export default function LeadAcknowledgment({
  contactName,
  restaurantName,
}: Props) {
  return (
    <BaseLayout
      preview={`Merci pour votre intérêt — Kevin vous recontacte sous 24h.`}
      showFooter={false}
    >
      <div
        style={{
          display: "inline-block",
          backgroundColor: "#B8922F",
          color: "#2C1810",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        GOURMET PACK
      </div>

      <Heading>Votre demande est bien reçue</Heading>

      <Paragraph>
        Bonjour <strong>{contactName}</strong>,
      </Paragraph>

      <Paragraph>
        Merci pour votre intérêt concernant <strong>GOURMET PACK</strong> pour{" "}
        <strong>{restaurantName}</strong>. Je vous recontacte personnellement
        sous 24h ouvrées pour en discuter en détail — vos besoins, votre
        calendrier, et comment le pack peut s&apos;adapter à votre restaurant.
      </Paragraph>

      <Paragraph>
        En attendant, vous pouvez jeter un œil :
      </Paragraph>

      <Section
        style={{
          textAlign: "center" as const,
          margin: "24px 0",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <Button href="https://arc-en-ciel-theta.vercel.app">
            Voir la démo live →
          </Button>
        </div>
        <div>
          <Button
            href="https://arc-en-ciel-theta.vercel.app/pro#pricing"
            variant="secondary"
          >
            Voir le pricing →
          </Button>
        </div>
      </Section>

      <Divider />

      <Paragraph>
        Si c&apos;est urgent, vous pouvez me répondre directement à ce mail —
        je lis tout.
      </Paragraph>

      <Paragraph>
        À très vite,
      </Paragraph>

      <Text
        style={{
          color: "#2C1810",
          fontSize: "16px",
          fontWeight: 700,
          margin: "4px 0 2px 0",
          fontFamily: "Georgia, 'Playfair Display', serif",
        }}
      >
        Kevin Aubouin
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
        Créateur de GOURMET PACK
      </Text>
    </BaseLayout>
  );
}
