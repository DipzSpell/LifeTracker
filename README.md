# 🌌 LifeTracker — Your Personal OS

A modern, dark-themed Personal Life OS designed to help users track daily habits, manage tasks, and log sleep cycles with advanced gamification (Points System) and strict multi-user data isolation.

🔗 **Live Deployment:** [https://lifenotebook.netlify.app/](https://lifenotebook.netlify.app/)

---

## ✨ Core Features

* **🔒 Secure Google Authentication:** Integrated seamlessly using Supabase OAuth for swift and safe user onboarding.
* **🛡️ Multi-User Data Isolation:** Backed by Supabase Row-Level Security (RLS) policies, ensuring each user's data remains private and entirely isolated.
* **🔥 Intelligent Habit Tracker:**
  * **Good Habits:** Yield positive streaks and daily points.
  * **Bad Habits ("To Reduce"):** Utilizes an inverted logic system where clicking **Resisted** advances the streak, while clicking **Did it** instantly resets the streak to `0` day streak.
* **📊 Interactive Analytics:** Visually clean spline/curve charts mapping out "This Week's Points" to monitor weekly productivity trends.
* **🛌 Sleep Logs:** Displays start/end bedtimes and automatically calculates the total duration of sleep, formatted beautifully as `Xh Ym`.
* **✅ Advanced Task Manager (Todo):** Robust task creation modal featuring priority tiers (High, Medium, Low), distinct categories, due dates/times, and recurring frequencies (Once, Daily, Weekly).

---

## 🛠️ Tech Stack

* **Frontend:** [React.js](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Authentication:** Google Cloud Console OAuth 2.0
* **Hosting & Deployment:** [Netlify](https://www.netlify.com/) & GitHub CI/CD pipeline

---

## 🚀 Local Setup Instructions

Follow these simple steps to set up the project locally:

### 1. Clone the Repository
```bash
git clone https://github.com/DipzSpell/LifeTracker.git
cd LifeTracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and define the following variables:
```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Run the Development Server
```bash
npm run dev
```
The application will boot up locally on `http://localhost:5173/` (or an alternative port like `http://localhost:5174/` if 5173 is already in use).

---

## 🔑 Database Schema (Supabase)

To enable all integrations, execute the SQL script located at [`supabase_setup.sql`](file:///c:/Users/dipan/Documents/CODING/Life%20Tracking%20Antigravity/supabase_setup.sql) in your Supabase SQL Editor. This sets up the database tables (todos, habits, sleep, and logs) alongside Row-Level Security (RLS) policies for complete multi-user data isolation.
