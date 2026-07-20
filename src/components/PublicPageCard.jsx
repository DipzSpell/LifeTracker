/**
 * PublicPageCard.jsx — shared chrome for pre-login informational pages
 * (feature About pages, Terms, Privacy): same blob backdrop as Login, a
 * "Back to Sign In" link, logo, title, and a content card underneath.
 */
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import PublicPageBackground, { FONT_STACK } from "./PublicPageBackground";

export default function PublicPageCard({ icon, title, subtitle, children }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <PublicPageBackground reduced={!!shouldReduceMotion} align="start">
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 640,
          padding: "2.5rem 0 3rem",
          margin: "0 auto",
        }}
      >
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "rgba(228,228,231,0.7)",
            textDecoration: "none",
            marginBottom: "1.5rem",
          }}
        >
          <ArrowLeft size={15} />
          Back to Sign In
        </Link>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 24,
            padding: "2rem",
            boxSizing: "border-box",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: title ? "0.5rem" : 0 }}>
            {icon ? (
              <span
                aria-hidden="true"
                style={{
                  fontSize: "1.6rem",
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
            ) : (
              <Logo size={40} className="rounded-2xl" />
            )}
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  margin: 0,
                  lineHeight: 1.2,
                  fontFamily: FONT_STACK,
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    color: "rgba(20,184,166,0.9)",
                    margin: "0.15rem 0 0",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>{children}</div>
        </motion.div>
      </div>
    </PublicPageBackground>
  );
}
