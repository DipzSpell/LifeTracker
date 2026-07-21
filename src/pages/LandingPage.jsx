/**
 * LandingPage.jsx — public marketing page, shown at "/" for signed-out
 * visitors (App.jsx redirects signed-in users straight to /dashboard).
 *
 * Background architecture: ONE base color + ONE fixed BlobLayer painted
 * here at the root; every section below renders transparent on top of it.
 * Sections must never set their own solid background — that's what caused
 * the hard horizontal seam lines at section boundaries while scrolling.
 */
import { useReducedMotion } from "framer-motion";
import { BlobLayer, FONT_STACK } from "../components/PublicPageBackground";
import LandingNav from "../components/landing/LandingNav";
import HeroSection from "../components/landing/HeroSection";
import SolutionsSection from "../components/landing/SolutionsSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import DataFlowSection from "../components/landing/DataFlowSection";
import PricingSection from "../components/landing/PricingSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
  const reduced = useReducedMotion();

  // Pinned to the dark palette regardless of the visitor's OS/system theme
  // preference — a marketing page should render exactly as designed.
  return (
    <div
      data-theme="dark"
      className="relative overflow-x-hidden"
      style={{
        background: "#0B1121",
        color: "#f4f4f5",
        fontFamily: FONT_STACK,
        // Landing-only accent override: the brand logo + hero cubes are
        // azure blue (#0080FD) with cyan (#00FDFD) highlights — sampled
        // from logo.png — so every accent-colored element on this page
        // (buttons, rays, borders, rings) matches them instead of the
        // in-app theme's teal. Scoped here; the app behind login keeps
        // its own switchable themes.
        "--accent": "#00A9FD",
        "--accent-rgb": "0, 169, 253",
        "--accent-glow": "rgba(0, 169, 253, 0.25)",
      }}
    >
      <BlobLayer reduced={!!reduced} />
      <div className="relative z-10">
        <LandingNav />
        <HeroSection />
        <SolutionsSection />
        <FeaturesSection />
        <DataFlowSection />
        <PricingSection />
        <LandingFooter />
      </div>
    </div>
  );
}
