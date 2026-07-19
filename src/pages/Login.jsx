import { useState, useEffect, useCallback } from "react";
import { Mail, Loader2, AlertCircle, ArrowRight, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";

/* ── New design-language font stack ──────────── */
const FONT_STACK =
  "'Aeonik', 'General Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

/* ── Feature pills shown above the auth card ── */
const FEATURE_PILLS = [
  { icon: "📝", label: "Log" },
  { icon: "📔", label: "Journal" },
  { icon: "💪", label: "Fitness" },
  { icon: "📈", label: "Traders" },
  { icon: "📊", label: "Stats" },
  { icon: "✅", label: "Tasks" },
  { icon: "🏠", label: "Home" },
];

/* ── Feature pill row ─────────────────────────── */
function FeaturePills({ variants, reduced }) {
  return (
    <motion.div
      variants={variants}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0.5rem",
        marginBottom: "1.75rem",
        maxWidth: 340,
      }}
    >
      {FEATURE_PILLS.map((pill) => (
        <motion.span
          key={pill.label}
          whileHover={
            reduced
              ? {}
              : {
                  scale: 1.06,
                  borderColor: "rgba(20,184,166,0.55)",
                  boxShadow: "0 0 0 1px rgba(20,184,166,0.25), 0 0 16px rgba(20,184,166,0.3)",
                }
          }
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "0.4rem 0.85rem",
            borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            fontSize: "0.72rem",
            fontWeight: 500,
            color: "rgba(228,228,231,0.85)",
            letterSpacing: "-0.01em",
            cursor: "default",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "0.8rem", lineHeight: 1 }}>
            {pill.icon}
          </span>
          {pill.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   BLOB DATA  (position, size, color, duration)
───────────────────────────────────────────── */
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

/* ── Animated blob ───────────────────────────── */
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

/* ── Ripple hook ─────────────────────────────── */
function useRipple() {
  const [ripples, setRipples] = useState([]);

  const addRipple = useCallback((e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  }, []);

  const rippleEls = ripples.map((rp) => (
    <span
      key={rp.id}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: rp.x,
        top: rp.y,
        width: 8,
        height: 8,
        transform: "translate(-50%,-50%) scale(0)",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.3)",
        pointerEvents: "none",
        animation: "lifetracker-ripple 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
    />
  ));

  return { addRipple, rippleEls };
}

/* ── Google icon ─────────────────────────────── */
function GoogleIcon({ size = 18, animated = false, reduced = false, className = "mr-2 flex items-center" }) {
  return (
    <motion.span
      className={className}
      whileHover={animated && !reduced ? { rotate: [0, -12, 12, -6, 0], scale: 1.15 } : {}}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z" />
        <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5.1l-6-5c-1.9 1.3-4.3 2.1-6.9 2.1-5.3 0-9.7-2.6-11.4-7.1l-6.6 5.1C9.6 39.1 16.2 43.5 24 43.5z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6 5c3.5-3.3 5.9-8.1 5.9-14.4 0-1.2-.1-2.4-.4-3.5z" />
      </svg>
    </motion.span>
  );
}

/* ── GitHub icon ─────────────────────────────── */
function GithubIcon({ size = 18, color = "currentColor", animated = false, reduced = false }) {
  return (
    <motion.span
      className="mr-2 flex items-center"
      whileHover={animated && !reduced ? { y: [-2, 2, -2, 0], scale: 1.15 } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    </motion.span>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Login() {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  /* Parse OAuth redirect errors */
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let oauthError =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (!oauthError && window.location.hash) {
        const hq = window.location.hash.split("?")[1];
        if (hq) {
          const p = new URLSearchParams(hq);
          oauthError = p.get("error_description") || p.get("error");
        } else if (window.location.hash.startsWith("#error=")) {
          const p = new URLSearchParams(window.location.hash.substring(1));
          oauthError = p.get("error_description") || p.get("error");
        }
      }
      if (oauthError) {
        setError(decodeURIComponent(oauthError).replace(/\+/g, " "));
        window.history.replaceState(
          {},
          document.title,
          window.location.origin + window.location.pathname
        );
      }
    } catch { /* non-critical */ }
  }, []);

  const handleOAuth = async (provider) => {
    setError(null);
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || `Couldn't sign in with ${provider}.`);
      setLoadingProvider(null);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoadingProvider("email");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send the sign-in link.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;

  /* ── Ripple instances per button ── */
  const rippleGoogle = useRipple();
  const rippleGithub = useRipple();
  const rippleEmail  = useRipple();
  const rippleMagic  = useRipple();

  /* ── Easing constant ── */
  const ease = shouldReduceMotion ? "linear" : [0.16, 1, 0.3, 1];

  /* ── Container: stagger children ── */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.09,
        delayChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  /* ── Fade-up item ── */
  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease },
    },
  };

  /* ── Logo (scale-up + fade) ── */
  const logoVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease },
    },
  };

  /* ── Title (fade-up) ── */
  const titleVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease },
    },
  };

  /* ── Tagline (staggered after title) ── */
  const taglineVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease, delay: shouldReduceMotion ? 0 : 0.18 },
    },
  };

  /* ── Buttons stagger ── */
  const buttonContainerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1, delayChildren: shouldReduceMotion ? 0 : 0.1 },
    },
  };
  const buttonVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.52, ease },
    },
  };

  return (
    <>
      {/* ── Ripple keyframe injection ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes lifetracker-ripple {
          to { transform: translate(-50%,-50%) scale(28); opacity: 0; }
        }
        @keyframes lifetracker-glow-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.12); }
        }
        @keyframes lifetracker-glow-pulse2 {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 0.5;  transform: scale(1.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes lifetracker-glow-pulse  { 0%,100% { opacity:0.55; transform:scale(1); } }
          @keyframes lifetracker-glow-pulse2 { 0%,100% { opacity:0.25; transform:scale(1); } }
        }
      `}</style>

      <div
        style={{
          minHeight: "100svh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          position: "relative",
          overflow: "hidden",
          background: "#0B1121",
          color: "#f4f4f5",
          fontFamily: FONT_STACK,
        }}
      >
        {/* ── Blob background ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {BLOBS.map((b) => (
            <Blob key={b.id} blob={b} reduced={!!shouldReduceMotion} />
          ))}

          {/* Vignette overlay so blobs don't fight the card */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(11,17,33,0.72) 100%)",
            }}
          />
        </div>

        {/* ── Main card ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* ── Teal spotlight glow behind hero ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 460,
              height: 320,
              background:
                "radial-gradient(ellipse 50% 50% at 50% 30%, rgba(20,184,166,0.28) 0%, rgba(6,182,212,0.12) 45%, transparent 75%)",
              filter: "blur(10px)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* ── Logo ── */}
          <motion.div variants={logoVariants} style={{ marginBottom: "1.25rem", position: "relative" }}>
            {/* Outer glow ring */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -14,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(135,166,140,0.4) 0%, rgba(125,184,216,0.3) 50%, transparent 70%)",
                animation: shouldReduceMotion
                  ? "none"
                  : "lifetracker-glow-pulse2 3.2s ease-in-out infinite",
                willChange: "transform, opacity",
              }}
            />
            {/* Inner glow ring */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -7,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(135,166,140,0.55) 0%, transparent 70%)",
                animation: shouldReduceMotion
                  ? "none"
                  : "lifetracker-glow-pulse 2.6s ease-in-out infinite",
                willChange: "transform, opacity",
              }}
            />
            {/* Logo box */}
            <div
              style={{
                position: "relative",
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "rgba(20,28,48,0.9)",
                border: "1px solid rgba(135,166,140,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 0 0 1px rgba(135,166,140,0.15), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
              }}
            >
              <Logo size={34} />
            </div>
          </motion.div>

          {/* ── Titles ── */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem", position: "relative", zIndex: 1 }}>
            <motion.h1
              variants={titleVariants}
              style={{
                fontSize: "2.25rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                margin: 0,
                lineHeight: 1.15,
                fontFamily: FONT_STACK,
              }}
            >
              LifeTracker
            </motion.h1>
            <motion.p
              variants={taglineVariants}
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "rgba(244,244,245,0.75)",
                marginTop: "0.5rem",
                lineHeight: 1.6,
              }}
            >
              Your life, structured. Habits, gym, sleep, and tasks.
            </motion.p>
          </div>

          {/* ── Feature pills ── */}
          <FeaturePills variants={itemVariants} reduced={!!shouldReduceMotion} />

          {/* ── Card + ambient bloom wrapper ── */}
          <div style={{ position: "relative", width: "100%" }}>
            {/* Ambient colored bloom beneath the card */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "8% -6% -10%",
                background:
                  "radial-gradient(60% 70% at 50% 55%, rgba(20,184,166,0.22) 0%, rgba(6,182,212,0.1) 45%, transparent 75%)",
                filter: "blur(30px)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            {/* ── Glass card ── */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.25 }}
              style={{
                width: "100%",
                position: "relative",
                zIndex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 24,
                padding: "1.35rem",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 64px rgba(0,0,0,0.45)",
              }}
            >
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  style={{ overflow: "hidden", marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "rgba(153,27,27,0.3)",
                      border: "1px solid rgba(185,28,28,0.4)",
                      borderRadius: 12,
                      padding: "0.65rem 0.75rem",
                      color: "#fca5a5",
                    }}
                  >
                    <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: "0.72rem", lineHeight: 1.5, flex: 1, margin: 0 }}>{error}</p>
                    <button
                      onClick={() => setError(null)}
                      aria-label="Dismiss error"
                      style={{ color: "#fca5a5", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!emailOpen ? (
                /* ── Social buttons ── */
                <motion.div
                  key="social-flows"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    variants={buttonContainerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                  >
                    {/* Google */}
                    <motion.button
                      id="login-google"
                      variants={buttonVariants}
                      onClick={(e) => { rippleGoogle.addRipple(e); handleOAuth("google"); }}
                      disabled={isLoading}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        width: "100%",
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 22,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        fontFamily: FONT_STACK,
                        background:
                          "linear-gradient(135deg, #2DD4BF 0%, #14B8A6 45%, #0891B2 100%)",
                        color: "#ffffff",
                        border: "none",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                        letterSpacing: "-0.01em",
                        boxShadow:
                          "0 14px 36px rgba(20,184,166,0.4), 0 4px 14px rgba(6,182,212,0.32), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -10px 18px rgba(0,0,0,0.1)",
                      }}
                    >
                      {/* Glossy sheen: top-left glare + soft top fade */}
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 22,
                          background:
                            "radial-gradient(120% 140% at 12% -20%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 45%), linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%)",
                          pointerEvents: "none",
                        }}
                      />
                      {rippleGoogle.rippleEls}
                      <span
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: loadingProvider === "google" ? 0 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#ffffff",
                            marginRight: 9,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }}
                        >
                          <GoogleIcon size={14} animated reduced={!!shouldReduceMotion} className="flex items-center" />
                        </span>
                        Continue with Google
                      </span>
                      {loadingProvider === "google" && (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Loader2 size={16} className="animate-spin" style={{ color: "#ffffff" }} />
                        </span>
                      )}
                    </motion.button>

                    {/* GitHub */}
                    <motion.button
                      id="login-github"
                      variants={buttonVariants}
                      onClick={(e) => { rippleGithub.addRipple(e); handleOAuth("github"); }}
                      disabled={isLoading}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        width: "100%",
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 22,
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        fontFamily: FONT_STACK,
                        background: "rgba(255,255,255,0.04)",
                        color: "#e5e7eb",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                        letterSpacing: "-0.01em",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      }}
                    >
                      {rippleGithub.rippleEls}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: loadingProvider === "github" ? 0 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <GithubIcon size={17} color="currentColor" animated reduced={!!shouldReduceMotion} />
                        Continue with GitHub
                      </span>
                      {loadingProvider === "github" && (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Loader2 size={16} className="animate-spin" style={{ color: "#d1d5db" }} />
                        </span>
                      )}
                    </motion.button>

                    {/* Divider */}
                    <motion.div
                      variants={buttonVariants}
                      style={{ display: "flex", alignItems: "center", gap: "0.65rem", margin: "0.35rem 0 0.1rem" }}
                    >
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                      <span style={{ fontSize: "0.68rem", color: "rgba(161,161,170,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>or</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    </motion.div>

                    {/* Email — tertiary text-link */}
                    <motion.button
                      id="login-email-open"
                      variants={buttonVariants}
                      onClick={(e) => { rippleEmail.addRipple(e); setEmailOpen(true); }}
                      disabled={isLoading}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        width: "100%",
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 20,
                        fontWeight: 500,
                        fontSize: "0.82rem",
                        fontFamily: FONT_STACK,
                        background: "transparent",
                        color: "rgba(94,234,212,0.9)",
                        border: "none",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {rippleEmail.rippleEls}
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Mail size={15} style={{ marginRight: 7 }} />
                        Continue with Email
                      </span>
                    </motion.button>
                  </motion.div>
                </motion.div>
              ) : magicLinkSent ? (
                /* ── Magic link sent ── */
                <motion.div
                  key="magic-success"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease }}
                  style={{ textAlign: "center", padding: "1.75rem 0.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#34d399",
                      marginBottom: "1rem",
                    }}
                  >
                    <Mail size={22} />
                  </motion.div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", margin: "0 0 0.4rem" }}>Check your inbox</h3>
                  <p style={{ fontSize: "0.74rem", color: "rgba(161,161,170,0.85)", lineHeight: 1.65, maxWidth: 280, margin: 0 }}>
                    We sent a secure magic link to{" "}
                    <span style={{ color: "#e5e7eb", fontWeight: 500 }}>{email}</span>.
                    Click it to log in instantly.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setEmailOpen(false); setMagicLinkSent(false); }}
                    style={{
                      marginTop: "1.5rem",
                      fontSize: "0.72rem",
                      color: "rgba(161,161,170,0.6)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Back to sign in
                  </button>
                </motion.div>
              ) : (
                /* ── Email form ── */
                <motion.form
                  key="email-form"
                  onSubmit={handleEmailSubmit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 36 }}
                  style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "rgba(161,161,170,0.7)" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        padding: "0 14px",
                        fontSize: "0.8rem",
                        color: "#f4f4f5",
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(135,166,140,0.5)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      onClick={(e) => rippleMagic.addRipple(e)}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        width: "100%",
                        height: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        background: "rgba(135,166,140,0.9)",
                        color: "#0B1121",
                        border: "none",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {rippleMagic.rippleEls}
                      <span style={{ display: "flex", alignItems: "center", opacity: loadingProvider === "email" ? 0 : 1, transition: "opacity 0.15s" }}>
                        Send Magic Link
                        <ArrowRight size={14} style={{ marginLeft: 6 }} />
                      </span>
                      {loadingProvider === "email" && (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Loader2 size={15} className="animate-spin" style={{ color: "#0B1121" }} />
                        </span>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => setEmailOpen(false)}
                      style={{
                        fontSize: "0.72rem",
                        color: "rgba(161,161,170,0.55)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                        padding: "0.2rem 0",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "rgba(228,228,231,0.85)")}
                      onMouseLeave={(e) => (e.target.style.color = "rgba(161,161,170,0.55)")}
                    >
                      Back to other options
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Footer ── */}
          <motion.p
            variants={itemVariants}
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.68rem",
              fontWeight: 500,
              color: "rgba(244,244,245,0.6)",
              lineHeight: 1.6,
              maxWidth: 300,
            }}
          >
            Your data is end-to-end isolated per account. Protected by Supabase Row Level Security 🔒
          </motion.p>

          <motion.p
            variants={itemVariants}
            style={{
              marginTop: "0.6rem",
              textAlign: "center",
              fontSize: "0.65rem",
              color: "rgba(113,113,122,0.7)",
              lineHeight: 1.7,
            }}
          >
            By continuing, you agree to our{" "}
            <a
              href="#"
              style={{ textDecoration: "underline", textUnderlineOffset: 3, color: "inherit", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.target.style.color = "rgba(161,161,170,0.9)")}
              onMouseLeave={(e) => (e.target.style.color = "rgba(113,113,122,0.7)")}
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              style={{ textDecoration: "underline", textUnderlineOffset: 3, color: "inherit", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.target.style.color = "rgba(161,161,170,0.9)")}
              onMouseLeave={(e) => (e.target.style.color = "rgba(113,113,122,0.7)")}
            >
              Privacy Policy
            </a>.
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
