/**
 * Privacy.jsx — public /privacy page. Describes what's actually collected
 * and how it's actually stored, matching the real auth/DB implementation
 * (Supabase + RLS, Google/GitHub OAuth, no ad network or analytics-for-sale
 * anywhere in this codebase) rather than generic privacy-policy filler.
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

export default function Privacy() {
  return (
    <PublicPageCard title="Privacy Policy" subtitle="Last updated: July 2026">
      <Section title="What we collect">
        Account info you provide at signup (name, userid, email, and optionally a mobile number — email is always
        required), or whatever your OAuth provider (Google/GitHub) shares when you sign in that way — typically
        your name, email, and profile photo. Beyond that, we only store what you actively log inside the app:
        habits, journal entries, fitness data, trades, and tasks.
      </Section>
      <Section title="What we don't collect">
        No ad network, no third-party analytics-for-sale, no cross-site trackers. Your mobile number, if you add
        one, is stored as a login lookup key only — it is never SMS-verified and never used for marketing contact.
      </Section>
      <Section title="How it's stored">
        All data lives in a Supabase-managed Postgres database with Row Level Security enabled on every table —
        the database itself enforces that a query can only ever return rows belonging to the signed-in account
        making it. Passwords are handled entirely by Supabase Auth; this app never sees or stores a plaintext
        password.
      </Section>
      <Section title="Third parties">
        Sign-in only: if you choose "Continue with Google" or "Continue with GitHub," those providers process your
        authentication per their own privacy policies. Supabase is the backend infrastructure provider. Neither is
        paid to share your data onward, and nothing in this app sells or rents your data to anyone.
      </Section>
      <Section title="Your control over your data">
        You can export your logged data to CSV from the Stats page at any time. To request full account deletion,
        contact us at the email below.
      </Section>
      <Section title="Changes">
        This policy may be updated as the app evolves. Material changes will be reflected here with an updated
        date at the top of this page.
      </Section>
      <Section title="Contact">
        Questions about this policy or a data deletion request: dipzspell.ai@gmail.com.
      </Section>
    </PublicPageCard>
  );
}
