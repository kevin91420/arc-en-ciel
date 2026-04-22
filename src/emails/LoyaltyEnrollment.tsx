import { Section, Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph, Button, Divider } from "./BaseLayout";

interface Props {
  customerName: string;
  cardNumber: string;
  stampsRequired: number;
  rewardLabel: string;
}

export default function LoyaltyEnrollment({
  customerName,
  cardNumber,
  stampsRequired,
  rewardLabel,
}: Props) {
  const cardUrl = `https://arc-en-ciel-theta.vercel.app/fidelite/carte/${cardNumber}`;

  return (
    <BaseLayout
      preview={`Votre carte fidélité ${cardNumber} est prête. ${stampsRequired} tampons = ${rewardLabel}`}
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
        ⭐ Carte fidélité activée
      </div>

      <Heading>Bienvenue dans le programme fidélité</Heading>

      <Paragraph>
        Bonjour <strong>{customerName}</strong>,
      </Paragraph>

      <Paragraph>
        Votre carte de fidélité numérique L&apos;Arc en Ciel est prête. Ajoutez-la
        à l&apos;écran d&apos;accueil de votre téléphone pour la présenter en un
        clic à chaque visite.
      </Paragraph>

      {/* Card preview */}
      <Section
        style={{
          background:
            "linear-gradient(135deg, #2C1810 0%, #3d1f14 50%, #2C1810 100%)",
          borderRadius: "16px",
          padding: "32px 24px",
          textAlign: "center" as const,
          margin: "28px 0",
          border: "2px solid #B8922F66",
        }}
      >
        <Text
          style={{
            color: "#B8922F",
            fontSize: "11px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 8px 0",
          }}
        >
          L&apos;Arc en Ciel
        </Text>
        <Text
          style={{
            color: "#FDF8F0",
            fontSize: "22px",
            margin: "0 0 4px 0",
            fontFamily: "Georgia, serif",
            fontWeight: 600,
          }}
        >
          Carte de Fidélité
        </Text>
        <Text
          style={{
            color: "#E8C97A",
            fontSize: "13px",
            margin: "0 0 20px 0",
            fontStyle: "italic",
          }}
        >
          {customerName}
        </Text>
        <Text
          style={{
            color: "#FDF8F0",
            fontSize: "18px",
            fontFamily: "monospace",
            letterSpacing: "3px",
            margin: "0 0 20px 0",
            padding: "10px 16px",
            backgroundColor: "rgba(255, 253, 249, 0.08)",
            borderRadius: "8px",
            display: "inline-block",
            fontWeight: 700,
          }}
        >
          {cardNumber}
        </Text>
        <Text
          style={{
            color: "#E8C97A",
            fontSize: "13px",
            margin: "12px 0 0 0",
          }}
        >
          🌰 0 / {stampsRequired} tampons
        </Text>
      </Section>

      <div style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={cardUrl}>Voir ma carte →</Button>
      </div>

      <Divider />

      <Heading>
        <span style={{ fontSize: "20px" }}>
          Comment gagner votre récompense ?
        </span>
      </Heading>

      <Section style={{ margin: "16px 0" }}>
        {[
          {
            emoji: "1️⃣",
            title: "Commandez",
            desc: "Chaque visite au restaurant (sur place, à emporter ou en livraison) compte.",
          },
          {
            emoji: "2️⃣",
            title: "Présentez la carte",
            desc: "Montrez votre QR code au serveur à la fin du repas.",
          },
          {
            emoji: "3️⃣",
            title: "Cumulez les tampons",
            desc: `À ${stampsRequired} tampons, votre récompense est activée automatiquement.`,
          },
        ].map((step, i) => (
          <Section
            key={i}
            style={{
              padding: "12px 16px",
              backgroundColor: i % 2 === 0 ? "#FDF8F0" : "transparent",
              borderRadius: "8px",
              marginBottom: "4px",
            }}
          >
            <Text
              style={{
                color: "#2C1810",
                fontSize: "14px",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontSize: "16px", marginRight: "8px" }}>
                {step.emoji}
              </span>
              <strong>{step.title}</strong> — {step.desc}
            </Text>
          </Section>
        ))}
      </Section>

      <Section
        style={{
          backgroundColor: "#B8922F1A",
          borderLeft: "3px solid #B8922F",
          padding: "16px",
          borderRadius: "4px",
          margin: "24px 0",
        }}
      >
        <Text
          style={{
            color: "#2C1810",
            fontSize: "14px",
            margin: 0,
            fontWeight: 500,
          }}
        >
          🎁 <strong>Votre récompense :</strong> {rewardLabel}
        </Text>
      </Section>

      <Paragraph>
        À très bientôt,
        <br />
        <strong>L&apos;équipe de L&apos;Arc en Ciel</strong>
      </Paragraph>
    </BaseLayout>
  );
}
