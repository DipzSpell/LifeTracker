/**
 * DataFlowSection.jsx — "Any smartwatch. One place." Visualizes:
 *   smartwatch apps (two opposite-scrolling marquee rows)
 *     → converging animated rays → Google Fit hub
 *       → connector curve → LNBook
 *
 * Ray/connector lines draw in on scroll (framer-motion pathLength,
 * whileInView, once) per spec, then a second dashed overlay path fades in
 * and marches forever via a plain CSS keyframe (.flow-line in index.css) —
 * two paths sharing one `d` instead of fighting over one path's dash
 * properties. Marquee rows are pure CSS transforms (no JS animation loop).
 */
import { motion, useReducedMotion } from "framer-motion";
import Logo from "../Logo";

const ROW_1 = ["Fastrack Smart World.png", "boAt Crest.png", "NoiseFit Health and Fitness.png", "Samsung.png", "Strava.png"];
const ROW_2 = ["GOBOULT Fit.png", "InxFit.png", "My Health.png", "ZEB-FIT 20 Series.png", "realme wear.png"];

const iconSrc = (file) => `/icons/apps/${encodeURIComponent(file)}`;
const nameFromFile = (file) => file.replace(/\.png$/i, "");

function AppTile({ file }) {
  const name = nameFromFile(file);
  return (
    <div
      title={name}
      className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 mx-2 rounded-2xl flex items-center justify-center
                 bg-white/[0.04] border border-white/10 shadow-lg backdrop-blur-sm"
    >
      <img src={iconSrc(file)} alt={name} className="w-7 h-7 sm:w-9 sm:h-9 object-contain rounded-md" />
    </div>
  );
}

function MarqueeRow({ files, direction }) {
  // The animation loops by translating exactly -50% of the track, so the
  // track must be two identical halves. Each half must ALSO be at least as
  // wide as the container or a blank gap sweeps through — 5 tiles ≈ 400px
  // vs a 672px container, so each half holds the list twice (4 copies
  // total ≈ 1600px track, 800px half).
  const repeated = [...files, ...files, ...files, ...files];
  return (
    <div className="marquee-row w-full max-w-full overflow-hidden relative">
      <div className={`marquee-track ${direction === "left" ? "marquee-left" : "marquee-right"}`}>
        {repeated.map((file, i) => (
          <AppTile key={`${file}-${i}`} file={file} />
        ))}
      </div>
    </div>
  );
}

/** Two stacked paths sharing one `d`: a solid one that draws in on scroll,
 *  and a dashed one that fades in right after and marches forever. */
function FlowPath({ d, delay = 0 }) {
  return (
    <>
      <motion.path
        d={d}
        stroke="url(#dataflow-grad)"
        strokeWidth={0.6}
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0.25 }}
        whileInView={{ pathLength: 1, opacity: 0.5 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, delay, ease: "easeOut" }}
      />
      <motion.path
        d={d}
        stroke="url(#dataflow-grad)"
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeDasharray="1.5 5"
        fill="none"
        className="flow-line"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.95 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: delay + 1.05 }}
      />
    </>
  );
}

const RAYS = [
  "M10,0 Q10,62 50,100",
  "M30,0 Q30,72 50,100",
  "M50,0 L50,100",
  "M70,0 Q70,72 50,100",
  "M90,0 Q90,62 50,100",
];

export default function DataFlowSection() {
  const reduced = useReducedMotion();

  return (
    <section id="flow" className="py-20 sm:py-28 px-4">
      <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-display font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Any smartwatch. One place.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-sm sm:text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          Your watch syncs to Google Fit — LNBook pulls it all in automatically.
        </motion.p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* ── Smartwatch app marquee rows ── */}
        <div className="flex flex-col gap-3 mb-2">
          <MarqueeRow files={ROW_1} direction="left" />
          <MarqueeRow files={ROW_2} direction="right" />
        </div>
        <p className="text-center text-[11px] tracking-wide uppercase mt-3 mb-2" style={{ color: "var(--text-muted)" }}>
          Smartwatch apps
        </p>

        {/* ── Converging rays → Google Fit hub ── */}
        <div className="relative h-36 sm:h-48">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="dataflow-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {RAYS.map((d, i) => (
              <FlowPath key={i} d={d} delay={i * 0.08} />
            ))}
          </svg>
        </div>

        {/* ── Google Fit hub ── */}
        <div className="flex justify-center -mt-2">
          <div className="relative">
            <motion.div
              aria-hidden="true"
              className="absolute inset-[-14px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb)/0.35) 0%, transparent 70%)" }}
              animate={reduced ? {} : { opacity: [0.5, 0.9, 0.5], scale: [1, 1.12, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-glass)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              <img src={iconSrc("Google Fit.png")} alt="Google Fit" className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-lg" />
            </div>
          </div>
        </div>
        <p className="text-center text-xs font-semibold mt-2" style={{ color: "var(--text-secondary)" }}>
          Google Fit
        </p>

        {/* ── Connector curve → LNBook ── */}
        <div className="relative h-20 sm:h-24 max-w-[120px] mx-auto">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <FlowPath d="M50,0 C50,32 22,32 22,62 C22,85 50,88 50,100" delay={0.2} />
          </svg>
        </div>

        {/* ── LNBook card ── */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="glass-card flex items-center gap-3 px-5 py-3.5"
          >
            <Logo size={36} className="rounded-xl" />
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>LNBook</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Data syncs in seconds ⚡</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
