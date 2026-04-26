import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #1a1040 0%, #0d0d1a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(168,85,247,0.3)",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            background: "linear-gradient(135deg, #60a5fa, #a855f7)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          BS
        </span>
      </div>
    ),
    { ...size }
  );
}
