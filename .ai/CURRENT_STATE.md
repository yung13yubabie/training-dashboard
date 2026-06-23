# CURRENT STATE

This project is a Vite + React + TypeScript training dashboard for a single runner.

The product direction is:

- GitHub Pages hosts the frontend.
- Supabase Auth provides Magic Link login.
- Supabase Postgres stores planned workouts, completed workout logs, route options, and plan versions.
- The training plan is produced by the assistant and seeded into the app.
- The user fills daily workout feedback online.
- Weekly lightweight audits and 4-week formal adjustments are performed when the user asks the assistant to review the data.

The current project is an initial implementation. The visible app interface and seed training/route content are Traditional Chinese. Supabase project credentials exist locally only if the user has filled `.env.local`; live login and database writes still require Supabase Auth/project verification before they can be treated as confirmed.

The parent `C:\Users\LIN\package.json` contains forwarding scripts so `npm run dev` from `C:\Users\LIN` delegates to `training-dashboard`.

Known training assumptions:

- Initial plan length: 12 weeks.
- Running frequency target: 5 days per week.
- Training goal: mixed VO2max improvement and long-run endurance.
- Intensity system: mixed pace, heart rate, RPE, duration, and elevation.
- Weekend trail runs can use Taipei/Taoyuan public-transit-accessible routes.

Known deployment target:

- GitHub repository: `https://github.com/yung13yubabie/training-dashboard`
- GitHub Pages URL: `https://yung13yubabie.github.io/training-dashboard/`

Unknown or pending:

- Final Supabase project URL and anon public key.
- Current live fitness baseline beyond older 5K and 10K results.
