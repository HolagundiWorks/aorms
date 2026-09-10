import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AORMS — The Command Center for Architecture Practice";

/**
 * Generic branded OG/social-share image (2026-09-10) — previously the
 * meta tags in app/layout.tsx just reused the wordmark PNG (816×216, not
 * even the right aspect ratio for a share card). This is a real
 * 1200×630 image generated via Next's `next/og` (Satori under the hood,
 * a CSS subset — not a real browser, so kept to flexbox + text, no
 * external image asset that would need a fetchable URL at generation
 * time). Deliberately text/brand-only, not a product screenshot: a
 * generic placeholder card is honest; a mocked-up "screenshot" that
 * isn't a real capture of the app would not be.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#161616",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>AORMS</div>
        <div style={{ fontSize: 36, color: "#c6c6c6", marginTop: 24, display: "flex" }}>
          The Command Center for Architecture Practice.
        </div>
        <div style={{ fontSize: 24, color: "#8d8d8d", marginTop: 40, display: "flex", letterSpacing: "0.05em" }}>
          DEVELOPED FOR ARCHITECTURE PRACTICES IN INDIA
        </div>
      </div>
    ),
    { ...size },
  );
}
