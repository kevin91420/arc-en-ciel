import { Section, Text } from "@react-email/components";
import {
  BaseLayout,
  Heading,
  Paragraph,
  Button,
  InfoRow,
} from "./BaseLayout";

interface Props {
  restaurantName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  interest?: string | null;
}

export default function LeadReceivedAdmin({
  restaurantName,
  contactName,
  email,
  phone,
  interest,
}: Props) {
  return (
    <BaseLayout
      preview={`Nouveau lead GOURMET PACK : ${restaurantName} (${contactName})`}
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
        🎯 Nouveau lead
      </div>

      <Heading>Nouveau lead intéressé par GOURMET PACK</Heading>

      <Text
        style={{
          color: "#2C1810",
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: "Georgia, 'Playfair Display', serif",
          margin: "16px 0 8px 0",
          lineHeight: 1.1,
        }}
      >
        {restaurantName}
      </Text>

      <Paragraph>
        <strong>{contactName}</strong> vient de remplir le formulaire sur le
        landing. Recontact sous 24h ouvrées.
      </Paragraph>

      <Section
        style={{
          backgroundColor: "#FDF8F0",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "2px solid #B8922F",
          margin: "24px 0",
        }}
      >
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <InfoRow label="Restaurant" value={restaurantName} />
            <InfoRow label="Contact" value={contactName} />
            <InfoRow label="Email" value={email} />
            {phone && <InfoRow label="Téléphone" value={phone} />}
          </tbody>
        </table>
      </Section>

      {interest && interest.trim().length > 0 && (
        <Section
          style={{
            backgroundColor: "#FFFDF9",
            padding: "18px 22px",
            borderRadius: "12px",
            border: "1px solid #C4956A55",
            margin: "16px 0 24px 0",
          }}
        >
          <Text
            style={{
              color: "#8B6914",
              fontSize: "11px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 700,
              margin: "0 0 10px 0",
            }}
          >
            Message / intérêt
          </Text>
          <Text
            style={{
              color: "#2C1810",
              fontSize: "15px",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {interest}
          </Text>
        </Section>
      )}

      <div style={{ textAlign: "center" as const, margin: "24px 0 8px 0" }}>
        <Button href="https://arc-en-ciel-theta.vercel.app/admin/leads">
          Ouvrir dans le CRM →
        </Button>
      </div>

      <Text
        style={{
          color: "#8B6914",
          fontSize: "12px",
          textAlign: "center" as const,
          margin: "24px 0 0 0",
        }}
      >
        Lead reçu depuis le landing GOURMET PACK.
      </Text>
    </BaseLayout>
  );
}
