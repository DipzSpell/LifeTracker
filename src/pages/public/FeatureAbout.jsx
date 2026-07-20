/**
 * FeatureAbout.jsx — public /about/:slug page. One page, driven by
 * src/lib/featureInfo.js, describing what a given login-page pill (Log,
 * Journal, Fitness, ...) actually does and how to use it.
 */
import { useParams, Navigate, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import PublicPageCard from "../../components/PublicPageCard";
import { getFeatureInfo } from "../../lib/featureInfo";

export default function FeatureAbout() {
  const { slug } = useParams();
  const feature = getFeatureInfo(slug);

  if (!feature) return <Navigate to="/login" replace />;

  return (
    <PublicPageCard icon={feature.icon} title={feature.label} subtitle={feature.tagline}>
      <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(228,228,231,0.85)", margin: "0 0 1.5rem" }}>
        {feature.description}
      </p>

      <h2
        style={{
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
          color: "rgba(161,161,170,0.7)",
          margin: "0 0 0.85rem",
        }}
      >
        How to use it
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {feature.howTo.map((step, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <CheckCircle2 size={16} style={{ color: "#2dd4bf", marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "rgba(228,228,231,0.85)" }}>{step}</span>
          </li>
        ))}
      </ul>

      <p style={{ fontSize: "0.78rem", color: "rgba(161,161,170,0.6)", marginTop: "1.75rem", marginBottom: 0 }}>
        Sign in to start using {feature.label} — <Link to="/login" style={{ color: "#2dd4bf", textDecoration: "underline", textUnderlineOffset: 3 }}>go to Sign In</Link>.
      </p>
    </PublicPageCard>
  );
}
