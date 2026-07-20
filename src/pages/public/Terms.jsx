/**
 * Terms.jsx — public /terms page. Plain-language terms of use for
 * LifeNotebook, a personal life-tracking app. Written to accurately
 * reflect what the app actually does (Supabase-backed storage, RLS
 * per-user isolation, Google/GitHub OAuth, no ad/tracking network) rather
 * than boilerplate legal claims the codebase can't back up.
 */
import PublicPageCard from "../../components/PublicPageCard";

const SECTION_STYLE = { marginBottom: "1.5rem" };
const H2_STYLE = {
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  color: "rgba(20,184,166,0.9)",
  margin: "0 0 0.5rem",
};
const P_STYLE = { fontSize: "0.85rem", lineHeight: 1.7, color: "rgba(228,228,231,0.85)", margin: 0 };

function Section({ title, children }) {
  return (
    <div style={SECTION_STYLE}>
      <h2 style={H2_STYLE}>{title}</h2>
      <p style={P_STYLE}>{children}</p>
    </div>
  );
}

export default function Terms() {
  return (
    <PublicPageCard title="Terms of Use" subtitle="Last updated: July 2026">
      <Section title="What LifeNotebook is">
        LifeNotebook is a personal life-tracking app — habits, journal entries, fitness logs, a trading journal,
        tasks, and analytics, all tied to your own account. It's an independent, personally-run project, not a
        registered company with a dedicated legal team, so these terms are written in plain language rather than
        formal legal boilerplate.
      </Section>
      <Section title="Your account">
        You're responsible for keeping your password (or OAuth login) secure and for the accuracy of what you log.
        You can sign in with Google, GitHub, or an email/username/mobile number + password combination you choose
        at signup. One account is meant for one person.
      </Section>
      <Section title="Your data">
        Everything you log — habits, journal text, trades, fitness stats, tasks — belongs to you. It's stored in a
        Supabase-managed database with Row Level Security enabled, meaning the database itself enforces that only
        your signed-in account can read or write your rows; nobody else's account can query into yours.
      </Section>
      <Section title="Service as-is">
        LifeNotebook is provided "as is," without uptime guarantees or warranties. Features may change, and bugs
        can happen — if you hit one, please report it rather than assume data loss is silent or intentional.
      </Section>
      <Section title="Acceptable use">
        Don't use LifeNotebook to store or process anything illegal, don't attempt to access another user's data,
        and don't abuse the service (scripted account creation, load-testing production, etc.).
      </Section>
      <Section title="Changes">
        These terms may be updated as the app evolves. Material changes will be reflected here with an updated
        date at the top of this page.
      </Section>
      <Section title="Contact">
        Questions about these terms: dipzspell.ai@gmail.com.
      </Section>
    </PublicPageCard>
  );
}
