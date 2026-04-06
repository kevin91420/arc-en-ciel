import { ImageResponse } from "next/og";

export const alt = "L'Arc en Ciel — Pizzeria Morangis";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#2C1810",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative top line */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 2,
            background: "#E8C97A",
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
            letterSpacing: "-1px",
          }}
        >
          L&apos;Arc en Ciel
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: "#E8C97A",
            marginBottom: 24,
            fontWeight: 400,
          }}
        >
          Pizzas au Feu de Bois & Grillades
        </div>

        {/* Location */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 400,
          }}
        >
          Morangis
        </div>

        {/* Decorative bottom line */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 2,
            background: "#E8C97A",
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
