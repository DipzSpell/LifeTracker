import Reveal from "./Reveal";

const POINTS = [
  { icon: "🔥", text: "Never lose a streak — habits, gym, and tasks all count toward one daily score." },
  { icon: "📊", text: "See your whole life on one dashboard instead of five different apps." },
  { icon: "🎮", text: "Logging feels like a game — points, badges, and streaks keep you coming back." },
];

function MockDashboardCard() {
  return (
    <div className="glass-card p-5 sm:p-7 max-w-lg mx-auto text-left">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Good morning</p>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>You're on a 12-day streak 🔥</p>
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "conic-gradient(var(--accent) 78%, var(--border-subtle) 0)", color: "var(--text-primary)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px]" style={{ background: "var(--bg-elevated)" }}>78%</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Habits", val: "6/8" },
          { label: "Steps", val: "8.4k" },
          { label: "Points", val: "+145" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3 text-center" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{tile.val}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{tile.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SolutionsSection() {
  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <Reveal className="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
          y={12}>
          <span style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", padding: "4px 12px", borderRadius: 999 }}>
            Solutions
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-3xl sm:text-4xl font-display font-bold" style={{ color: "var(--text-primary)" }}>
            Solve the chaos of tracking your life
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5 mt-10 text-left">
          {POINTS.map((p, i) => (
            <Reveal key={p.text} delay={0.1 + i * 0.08} className="glass-card p-5">
              <span className="text-xl">{p.icon}</span>
              <p className="text-sm mt-2.5" style={{ color: "var(--text-secondary)" }}>{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal delay={0.2}>
        <MockDashboardCard />
      </Reveal>
    </section>
  );
}
