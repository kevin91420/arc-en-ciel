import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = parseInt(searchParams.get("size") || "192", 10);

  const validSizes = [192, 512];
  const iconSize = validSizes.includes(size) ? size : 192;

  const fontSize = Math.round(iconSize * 0.38);
  const borderRadius = Math.round(iconSize * 0.18);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize,
          background: "#C0392B",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        AC
      </div>
    ),
    {
      width: iconSize,
      height: iconSize,
    },
  );
}
