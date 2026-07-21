/**
 * PricingSection.jsx — "Pricing" with a locked/coming-soon treatment.
 * LifeNotebook is fully free right now; these 3 cards preview future paid
 * tiers, blurred and crossed with chain bars + a lock icon so the intent
 * ("not available yet, but here's what's coming") is unmistakable at a
 * glance rather than looking like a broken/unfinished section.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    blurb: "Perfect for individuals.",
    price: "₹99",
    features: ["Daily Log & Habits", "Basic Stats", "Tasks", "1 device sync"],
  },
  {
    name: "Pro",
    blurb: "Ideal for power users.",
    price: "₹199",
    highlight: true,
    features: ["Everything in Starter", "Journal & Fitness tracking", "Trading Journal", "Unlimited history", "Priority sync"],
  },
  {
    name: "Elite",
    blurb: "For the fully optimized life.",
    price: "₹349",
    features: ["Everything in Pro", "Advanced analytics", "Priority support", "Early access to new features"],
  },
];

/** Thick diagonal chain-like bar — repeating metallic bands read as links. */
function ChainBar({ rotate }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 h-3 sm:h-3.5 w-[140%] rounded-full shadow-lg"
      style={{
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        background:
          "repeating-linear-gradient(90deg, #cbd2db 0px, #f4f6f8 5px, #8b93a1 10px, #cbd2db 15px)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.5)",
      }}
    />
  );
}

function PricingCard({ plan, reduced }) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden glass-card ${plan.highlight ? "sm:-translate-y-3 sm:scale-105" : ""}`}
      style={plan.highlight ? { border: "1px solid rgb(var(--accent-rgb)/0.5)", boxShadow: "0 0 0 1px rgb(var(--accent-rgb)/0.2), 0 20px 40px rgba(0,0,0,0.35)" } : {}}
    >
      {/* ── Blurred plan content ── */}
      <div className="p-6 sm:p-7 pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.75 }}>
        {plan.highlight && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
            style={{ background: "rgb(var(--accent-rgb)/0.15)", color: "var(--accent)" }}>
            Best choice
          </span>
        )}
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{plan.blurb}</p>
        <p className="text-3xl font-display font-extrabold mb-5" style={{ color: "var(--text-primary)" }}>
          {plan.price}<span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>/mo</span>
        </p>
        <ul className="space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Check size={13} style={{ color: "var(--success)" }} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Lock + chain overlay ── */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        whileHover={reduced ? {} : { rotate: [0, -1, 1, -1, 0] }}
        transition={{ duration: 0.4 }}
      >
        <ChainBar rotate={40} />
        <ChainBar rotate={-40} />
        <div
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(11,14,20,0.85)", border: "1px solid var(--border-glass)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
        >
          <Lock size={20} style={{ color: "var(--text-primary)" }} />
        </div>
      </motion.div>
    </div>
  );
}

export default function PricingSection() {
  const reduced = useReducedMotion();

  return (
    <section id="pricing" className="py-20 sm:py-28 px-4">
      <div className="max-w-2xl mx-auto text-center mb-4">
        <motion.span
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.4 }}
          className="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
          style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
        >
          Pricing
        </motion.span>
        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-2xl sm:text-3xl italic font-display font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          "Everything is free for everyone — for now."
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-3 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Premium plans coming soon. Early users lock in free access.
        </motion.p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-5 mt-14 sm:mt-16 items-center">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <PricingCard plan={plan} reduced={reduced} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
