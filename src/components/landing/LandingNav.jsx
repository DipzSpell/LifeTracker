import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "../Logo";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#flow", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "rgba(11,14,20,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={30} className="rounded-lg" />
          <span className="font-display font-extrabold text-base" style={{ color: "var(--text-primary)" }}>LifeNotebook</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Sign in</Link>
          <Link to="/login" className="glass-btn glass-btn-accent" style={{ padding: "0.55rem 1.1rem", fontSize: 13, fontWeight: 700 }}>
            Get Started
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={22} style={{ color: "var(--text-primary)" }} /> : <Menu size={22} style={{ color: "var(--text-primary)" }} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium pt-3" style={{ color: "var(--text-secondary)" }}>
              {l.label}
            </a>
          ))}
          <Link to="/login" className="text-sm font-medium pt-1" style={{ color: "var(--text-secondary)" }}>Sign in</Link>
          <Link to="/login" className="glass-btn glass-btn-accent text-center mt-1" style={{ padding: "0.6rem 1.1rem", fontSize: 13, fontWeight: 700 }}>
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}
