import { Section, Text } from "@react-email/components";
import { BaseLayout, Heading, Paragraph, Button } from "./BaseLayout";

interface Props {
  customerName: string;
  cardNumber: string;
  rewardLabel: string;
  rewardDescription?: string;
  totalVisits: number;
}

export default function RewardUnlocked({
  customerName,
  cardNumber,
  rewardLabel,
  rewardDescription,
  totalVisits,
}: Props) {
  const cardUrl = `https://arc-en-ciel-theta.vercel.app/fidelite/carte/${cardNumber}`;

  return (
    <BaseLayout
      preview={`🎉 ${rewardLabel} — Votre récompense est disponible !`}
    >
      {/* Giant celebration */}
      <div style={{ textAlign: "center" as const, margin: "0 0 24px 0" }}>
        <Text style={{ fontSize: "64px", margin: 0, lineHeight: 1 }}>🎉</Text>
        <Text
          style={{
            color: "#C0392B",
            fontSize: "14px",
            letterSpacing: "4px",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "12px 0 4px 0",
          }}
        >
          Récompense débloquée
        </Text>
      </div>

      <Heading>
        <span style={{ textAlign: "center" as const, display: "block" }}>
          Bravo, {customerName.split(" ")[0]} !
        </span>
      </Heading>

      <Paragraph>
        <span style={{ textAlign: "center" as const, display: "block" }}>
          Votre {totalVisits}<sup>e</sup> visite vient de débloquer votre
          récompense. Profitez-en lors de votre prochain passage au restaurant —
          il suffit de présenter votre carte au serveur.
        </span>
      </Paragraph>

      {/* Reward card */}
      <Section
        style={{
          background:
            "linear-gradient(135deg, #C0392B 0%, #8B2A1F 50%, #C0392B 100%)",
          borderRadius: "16px",
          padding: "36px 28px",
          textAlign: "center" as const,
          margin: "32px 0",
          boxShadow: "0 8px 24px rgba(192, 57, 43, 0.2)",
        }}
      >
        <Text
          style={{
            color: "#FFFDF9",
            fontSize: "12px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 12px 0",
            opacity: 0.9,
          }}
        >
          Votre récompense
        </Text>
        <Text
          style={{
            color: "#FFFDF9",
            fontSize: "26px",
            margin: "0 0 12px 0",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          🎁 {rewardLabel}
        </Text>
        {rewardDescription && (
          <Text
            style={{
              color: "#FFFDF9",
              fontSize: "14px",
              margin: "0 0 20px 0",
              opacity: 0.9,
              fontStyle: "italic",
            }}
          >
            {rewardDescription}
          </Text>
        )}
        <Text
          style={{
            color: "#FFFDF9",
            fontSize: "13px",
            fontFamily: "monospace",
            letterSpacing: "2px",
            margin: "8px 0 0 0",
            padding: "8px 14px",
            backgroundColor: "rgba(255, 253, 249, 0.15)",
            borderRadius: "6px",
            display: "inline-block",
            fontWeight: 700,
          }}
        >
          {cardNumber}
        </Text>
      </Section>

      <div style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={cardUrl}>Ouvrir ma carte fidélité →</Button>
      </div>

      <Paragraph>
        Un nouveau cycle commence : continuez à cumuler des tampons à chaque
        visite pour débloquer votre prochaine récompense.
      </Paragraph>

      <Paragraph>
        Merci de votre fidélité,
        <br />
        <strong>L&apos;équipe de L&apos;Arc en Ciel</strong>
      </Paragraph>
    </BaseLayout>
  );
}
