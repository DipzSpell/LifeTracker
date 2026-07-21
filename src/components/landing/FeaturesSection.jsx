import { Link } from "react-router-dom";
import { FEATURE_INFO } from "../../lib/featureInfo";
import Reveal from "./Reveal";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <Reveal y={12}>
          <span style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Features
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mt-4" style={{ color: "var(--text-primary)" }}>
            Keep everything in one place
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-3 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
            Forget five different apps for five different habits.
          </p>
        </Reveal>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURE_INFO.map((f, i) => (
          <Reveal key={f.slug} delay={i * 0.05}>
            <Link
              to={`/about/${f.slug}`}
              className="glass-card p-5 flex flex-col items-start h-full transition-transform hover:-translate-y-1"
            >
              <span className="text-2xl mb-3">{f.icon}</span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{f.label}</p>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.tagline}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
