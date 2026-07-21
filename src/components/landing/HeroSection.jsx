import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Box } from "lucide-react";
import SplineEmbed from "./SplineEmbed";

/** Mobile-only: don't auto-mount the (heavy) iframe on page load — show a
 *  lightweight glass placeholder and only load the scene once the visitor
 *  deliberately taps in. Also sidesteps drag-to-rotate fighting the page's
 *  own touch-scroll on small screens. */
function TapToLoadScene() {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <div className="w-full" style={{ height: 300 }}>
        <SplineEmbed />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="w-full glass-card flex flex-col items-center justify-center gap-2.5"
      style={{ height: 300 }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "rgb(var(--accent-rgb)/0.12)", border: "1px solid rgb(var(--accent-rgb)/0.3)" }}
      >
        <Box size={22} style={{ color: "var(--accent)" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tap to explore in 3D ✨</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Drag to rotate</p>
    </button>
  );
}

export default function HeroSection() {
  const reduced = useReducedMotion();

  // Transparent section — the continuous background (base color + fixed
  // blob layer) is painted once at the LandingPage root, so this section
  // must not paint its own or a seam appears at its bottom edge.
  return (
    <section>
      <div
        className="w-full max-w-6xl mx-auto px-4 pt-14 pb-20 sm:pt-20 sm:pb-28 relative
                   flex flex-col-reverse lg:grid lg:grid-cols-2 lg:items-center lg:gap-12"
      >
        {/* ── Left: text content ── */}
        <div className="text-center lg:text-left mt-10 lg:mt-0">
          <motion.span
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Free for everyone — for now ✨
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: reduced ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.12]"
            style={{
              // Logo palette: cyan glyph (#00FDFD) → azure badge (#0080FD),
              // same family as the Spline cubes beside it.
              background: "linear-gradient(90deg, #00FDFD, #0080FD)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              // background-clip:text only paints within the element's box —
              // without descender room the tail of "g" falls outside it and
              // renders transparent (looks "cut off").
              paddingBottom: "0.12em",
              marginBottom: "-0.12em",
            }}
          >
            Track everything.
            <br />
            Miss nothing.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-6 text-lg max-w-md mx-auto lg:mx-0"
            style={{ color: "var(--text-secondary)" }}
          >
            Habits, journal, trades, fitness, and tasks — all synced, all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-3"
          >
            <Link to="/login" className="glass-btn glass-btn-accent inline-flex items-center gap-2" style={{ padding: "0.85rem 1.5rem", fontSize: 14, fontWeight: 700 }}>
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <a href="#features" className="glass-btn inline-flex items-center gap-2" style={{ padding: "0.85rem 1.5rem", fontSize: 14, fontWeight: 600 }}>
              See how it works
            </a>
          </motion.div>
        </div>

        {/* ── Right: interactive Spline scene ── */}
        <motion.div
          initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          {/* Mobile (<768px): tap-to-load, avoids mounting a heavy iframe
              (and a drag-vs-scroll conflict) before the visitor opts in. */}
          <div className="md:hidden">
            <TapToLoadScene />
          </div>

          {/* Tablet/desktop: scene mounts immediately, full-bleed within
              the column — no card border/background, it just sits in the
              page. 420px tall on tablet, 600px on desktop. */}
          <div className="hidden md:block w-full h-[420px] lg:h-[600px]">
            <SplineEmbed />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
