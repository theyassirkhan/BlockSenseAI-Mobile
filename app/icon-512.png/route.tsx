import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 115,
          background: "linear-gradient(135deg, #1e1040 0%, #0d0d1a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "6px solid rgba(168,85,247,0.35)",
        }}
      >
        <span
          style={{
            fontSize: 228,
            fontWeight: 900,
            color: "#a855f7",
            letterSpacing: "-8px",
            fontFamily: "sans-serif",
          }}
        >
          BS
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
