import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #1a1040 0%, #0d0d1a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(168,85,247,0.3)",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(135deg, #60a5fa, #a855f7)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-2px",
          }}
        >
          BS
        </span>
      </div>
    ),
    { ...size }
  );
}
