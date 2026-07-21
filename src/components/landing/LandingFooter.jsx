import { Link } from "react-router-dom";
import Logo from "../Logo";

export default function LandingFooter() {
  return (
    <footer className="px-4 py-14" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid var(--border-subtle)" }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-start justify-between gap-8">
        <div className="flex items-center gap-2.5">
          <Logo size={30} className="rounded-lg" />
          <span className="font-display font-extrabold text-base" style={{ color: "var(--text-primary)" }}>LifeNotebook</span>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Product</p>
            <a href="#features" style={{ color: "var(--text-secondary)" }}>Features</a>
            <a href="#flow" style={{ color: "var(--text-secondary)" }}>Integrations</a>
            <a href="#pricing" style={{ color: "var(--text-secondary)" }}>Pricing</a>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Legal</p>
            <Link to="/terms" style={{ color: "var(--text-secondary)" }}>Terms of Use</Link>
            <Link to="/privacy" style={{ color: "var(--text-secondary)" }}>Privacy Policy</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Account</p>
            <Link to="/login" style={{ color: "var(--text-secondary)" }}>Sign in</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10 pt-6 text-xs" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
        © {new Date().getFullYear()} LifeNotebook. All rights reserved.
      </div>
    </footer>
  );
}
