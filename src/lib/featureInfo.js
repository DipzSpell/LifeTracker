/**
 * featureInfo.js — copy for the login page's feature pills AND the
 * /about/:slug pages they link to. Single source of truth so the pill
 * label/icon and the About page content never drift apart.
 */
export const FEATURE_INFO = [
  {
    slug: "log",
    icon: "📝",
    label: "Log",
    tagline: "One check-in for your whole day",
    description:
      "The Daily Log is where you record everything about today in a single pass — habits, workout, sleep, water, mood, and notes — instead of hunting through separate screens.",
    howTo: [
      "Tap each habit pill to mark it done, skipped, or failed — good and bad habits are tracked separately, with streaks updating live.",
      "Log gym status, sleep and wake time, and steps — a circular progress ring fills up as you complete each section.",
      "Track water intake by tapping glass icons, and set today's mood with the emoji picker.",
      "Check off your morning routine: teeth, bath, meditation, early wake.",
      "Add a free-text note before you save — it feeds into your points and streaks for the day.",
    ],
  },
  {
    slug: "journal",
    icon: "📔",
    label: "Journal",
    tagline: "Deeper reflection, once a day",
    description:
      "Journal is a structured end-of-day write-up — five focused sections instead of one big blank box — so reflecting doesn't feel like homework.",
    howTo: [
      "Fill in Top 3 Things Today, Work/Dev Notes, Gym & Training, Mood & Mindset, and Tomorrow's Focus — each with its own character counter.",
      "Your draft autosaves to your device every few seconds, so you never lose an entry mid-write.",
      "LifeNotebook reads your mood section and shows a 😊 / 😐 / 😔 badge automatically — no manual tagging.",
      "Jump straight into a trade entry from inside your journal if today involved trading.",
      "Browse the last 7 days as collapsible cards to see how your week went.",
    ],
  },
  {
    slug: "fitness",
    icon: "💪",
    label: "Fitness",
    tagline: "Workouts, water, and weight — auto-calculated",
    description:
      "Fitness tracks your training, hydration, and body metrics, and does the math for you — calorie burn is estimated automatically from your workout type and duration.",
    howTo: [
      "Pick a workout — Running, Cycling, Yoga, HIIT, strength splits, and more — calories burned are calculated live using your logged body weight.",
      "Log distance, duration, heart rate, and active minutes for cardio sessions.",
      "Track daily steps against a target, shown as a color-shifting intensity ring.",
      "Record water intake and your current weight to keep body-metric trends accurate.",
    ],
  },
  {
    slug: "traders",
    icon: "📈",
    label: "Traders",
    tagline: "A real F&O trading journal, not a spreadsheet",
    description:
      "Traders (Trading Journal) is built specifically for NSE options trading — symbol autocomplete, strike/expiry pickers, and automatic P&L, not a generic notes app.",
    howTo: [
      "Log a trade with symbol, strike, auto-suggested expiry, CE/PE, lots, stop-loss/target, and a strategy tag.",
      "P&L and P&L% are calculated automatically the moment you close a position, formatted in ₹L / ₹Cr.",
      "See your monthly P&L, win rate, trade count, and best/worst trade in the summary bar.",
      "Filter and sort your trade list by symbol, strategy, date, or outcome.",
      "Open the Analytics tab for a cumulative P&L curve, win/loss breakdown, and per-strategy performance charts.",
    ],
  },
  {
    slug: "stats",
    icon: "📊",
    label: "Stats",
    tagline: "Every log, turned into one picture",
    description:
      "Stats pulls together everything you've logged across the app into charts — so patterns in your energy, habits, and mood become visible instead of buried in daily entries.",
    howTo: [
      "Browse Energy & Productivity and Vibe & Hydration charts, plus a gym attendance breakdown.",
      "Explore your 30-day habit heatmap — darker cells mean more habits completed that day; click any day to inspect it.",
      "Filter the heatmap down to a single habit to track just that one streak.",
      "Check today's habit ratio at a glance in the pie chart.",
      "Export your data to CSV whenever you want it outside the app.",
    ],
  },
  {
    slug: "tasks",
    icon: "✅",
    label: "Tasks",
    tagline: "To-dos with priority, deadlines, and points",
    description:
      "Tasks is a priority-driven to-do list — every task carries a priority, category, and optional due date, and completing one earns you points based on how important it was.",
    howTo: [
      "Add a task with a title, category, and priority (High, Medium, Low) — priority sets both its color and its point value.",
      "Set a due date and time to get a browser notification when it's due.",
      "Mark recurring tasks (daily/weekly) so they come back automatically.",
      "Filter your list by Today, Pending, or Done.",
      "Completing a task instantly adds points and plays a small celebration.",
    ],
  },
  {
    slug: "dashboard",
    icon: "🏠",
    label: "Dashboard",
    tagline: "Today, at a glance",
    description:
      "Dashboard is your landing screen — a single view summarizing today's progress across every feature, so you know where you stand before diving into any one of them.",
    howTo: [
      "See your overall daily completion as one animated Today's Score ring.",
      "Read an AI-generated insight about your recent habits, fitness, and logs — refresh it anytime.",
      "Check quick stat tiles for habits done, steps, mood, and points earned.",
      "Jump straight into logging with one-tap quick actions, including a 30-second Quick Log modal.",
      "Scroll down for your 7-day history, active streaks, and a monthly heatmap.",
    ],
  },
];

export const getFeatureInfo = (slug) => FEATURE_INFO.find((f) => f.slug === slug) || null;
