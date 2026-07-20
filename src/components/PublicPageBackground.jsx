/**
 * PublicPageBackground.jsx — the animated blob backdrop + font stack shared
 * by every pre-login page (Login, feature About pages, Terms, Privacy) so
 * they read as one continuous experience instead of Login being a one-off.
 * Extracted from the original Login.jsx (which now imports this too).
 */
import { motion } from "framer-motion";

export const FONT_STACK =
  "'Aeonik', 'General Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const BLOBS = [
  {
    id: 0,
    color: "rgba(135,166,140,0.28)", // sage
    x: "12%",
    y: "8%",
    w: 520,
    h: 420,
    dur: 22,
    delay: 0,
    rx: "60% 40% 55% 45% / 50% 60% 40% 50%",
    rx2: "45% 55% 40% 60% / 60% 40% 55% 45%",
  },
  {
    id: 1,
    color: "rgba(125,184,216,0.22)", // sky
    x: "55%",
    y: "5%",
    w: 460,
    h: 380,
    dur: 28,
    delay: -7,
    rx: "50% 50% 40% 60% / 45% 55% 50% 50%",
    rx2: "60% 40% 50% 50% / 55% 45% 60% 40%",
  },
  {
    id: 2,
    color: "rgba(232,124,110,0.18)", // coral
    x: "70%",
    y: "55%",
    w: 400,
    h: 340,
    dur: 32,
    delay: -14,
    rx: "55% 45% 60% 40% / 40% 60% 50% 50%",
    rx2: "40% 60% 45% 55% / 50% 50% 45% 55%",
  },
  {
    id: 3,
    color: "rgba(212,168,71,0.16)", // amber
    x: "5%",
    y: "60%",
    w: 480,
    h: 360,
    dur: 26,
    delay: -20,
    rx: "45% 55% 50% 50% / 55% 45% 55% 45%",
    rx2: "55% 45% 60% 40% / 45% 55% 40% 60%",
  },
  {
    id: 4,
    color: "rgba(135,166,140,0.12)", // sage faint
    x: "35%",
    y: "70%",
    w: 350,
    h: 300,
    dur: 36,
    delay: -5,
    rx: "60% 40% 45% 55% / 50% 50% 60% 40%",
    rx2: "50% 50% 55% 45% / 60% 40% 50% 50%",
  },
];

function Blob({ blob, reduced }) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: blob.x,
        top: blob.y,
        width: blob.w,
        height: blob.h,
        background: blob.color,
        borderRadius: blob.rx,
        filter: "blur(60px)",
        willChange: "transform, border-radius",
        pointerEvents: "none",
      }}
      animate={
        reduced
          ? {}
          : {
              x: [0, 40, -30, 20, -10, 0],
              y: [0, -25, 35, -15, 20, 0],
              borderRadius: [blob.rx, blob.rx2, blob.rx, blob.rx2, blob.rx],
              scale: [1, 1.06, 0.97, 1.04, 1],
            }
      }
      transition={
        reduced
          ? {}
          : {
              duration: blob.dur,
              delay: blob.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    />
  );
}

/** Full-viewport blob background + vignette. Render page content as children. */
export default function PublicPageBackground({ children, reduced, align = "center" }) {
  return (
    <div
      style={{
        minHeight: "100svh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: align === "start" ? "flex-start" : "center",
        padding: "1rem",
        position: "relative",
        overflow: align === "start" ? "visible" : "hidden",
        background: "#0B1121",
        color: "#f4f4f5",
        fontFamily: FONT_STACK,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {BLOBS.map((b) => (
          <Blob key={b.id} blob={b} reduced={!!reduced} />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(11,17,33,0.72) 100%)",
          }}
        />
      </div>
      {children}
    </div>
  );
}
