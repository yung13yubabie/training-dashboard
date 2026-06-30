# CURRENT STATE

This project is a Vite + React + TypeScript training dashboard for a single runner.

The product direction is:

- GitHub Pages hosts the frontend.
- Supabase Auth provides Magic Link login.
- Supabase Postgres stores planned workouts, completed daily workout logs, workout segment rows, route options, and plan versions.
- The training plan is produced by the assistant and seeded into the app.
- The user fills daily workout feedback online.
- Weekly lightweight audits and 4-week formal adjustments are performed when the user asks the assistant to review the data.

The current project is an initial implementation. The visible app interface and seed training/route content are Traditional Chinese. The app is deployed to GitHub Pages. Supabase URL and anon key are configured as GitHub Secrets for production builds.

Live Supabase currently exposes the expected workout tables and newer metric columns to anonymous read probes. Authenticated write behavior still needs verification in the user's Magic Link session after the latest `supabase/schema.sql` is rerun, because the schema now relaxes wearable metric constraints that can reject real Amazfit values.

The parent `C:\Users\LIN\package.json` contains forwarding scripts so `npm run dev` from `C:\Users\LIN` delegates to `training-dashboard`.

Known training assumptions:

- Initial plan length: 12 weeks.
- Running frequency target: 5 days per week.
- Training goal: mixed VO2max improvement and long-run endurance.
- Intensity system: mixed pace, heart rate, RPE, duration, and elevation.
- Weekend trail runs can use Taipei/Taoyuan public-transit-accessible routes.
- Workout logging is one entry per user per date. Saving the same date again updates the existing daily log instead of creating a duplicate.
- Importing the 12-week seed plan archives existing active plan versions and creates a new active plan version.
- Weekday unavoidable missed quality sessions can be moved to Saturday or Sunday.
- Weekend days may use two or three sessions, but only one quality session should be kept on the same day.
- The 12-week seed plan includes adjustable fartlek sessions.
- The plan UI groups workouts by week. The current training week opens by default, previous/next weeks stay collapsed but can be expanded.
- Planned workouts can be moved to another week/day from the UI. Remote Supabase plans are updated in `planned_workouts`; local seed plans use a temporary in-browser preview until seeded.
- Planned workouts can be edited from the UI for type, priority, title, prescription, intensity target, duration, distance, elevation, and route. Remote Supabase plans are updated in `planned_workouts`; local seed plans use a temporary in-browser preview until seeded.
- Remote fill links can include a target date query parameter so the recipient lands on the intended log date after Magic Link login.
- Remote fill links support automatic email sending through the `send-fill-link` Supabase Edge Function when deployed with `RESEND_API_KEY` and `RESEND_FROM_EMAIL` secrets. The frontend still keeps Email draft and copy-link fallbacks.

Known deployment target:

- GitHub repository: `https://github.com/yung13yubabie/training-dashboard`
- GitHub Pages URL: `https://yung13yubabie.github.io/training-dashboard/`

Unknown or pending:

- Authenticated live workout save result after rerunning the latest schema.
- Current live fitness baseline beyond older 5K and 10K results.
- Live verification for the latest plan move, activity delete, and date-specific remote fill flows.
- Live verification for the latest planned-workout edit flow.
- Live deployment and verification for the `send-fill-link` Edge Function and Resend delivery.
