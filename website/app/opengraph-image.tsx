import { ImageResponse } from "next/og";

export const alt = "Capto: an open-source screen recorder you build, own and host";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(80% 70% at 85% 0%, rgba(255,106,61,0.35), transparent 70%), #0a0b0f",
          color: "#eceef4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect x="2.5" y="5" width="24" height="18" rx="4.5" fill="none" stroke="#eceef4" strokeWidth="2.6" />
            <circle cx="23.5" cy="22.5" r="7" fill="#ff6a3d" stroke="#0a0b0f" strokeWidth="2.5" />
            <circle cx="23.5" cy="22.5" r="2.4" fill="#0a0b0f" />
          </svg>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em" }}>Capto</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", maxWidth: 980 }}>
            A screen recorder you build, own and host.
          </div>
          <div style={{ fontSize: 32, color: "#9aa3b5", maxWidth: 980 }}>
            Open source · TypeScript on Electron · macOS. Records locally, signs expiring links from your own S3, R2, Azure or GCS bucket.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
