# TASKS

## TODO

- Create a Supabase project and provide the project URL plus anon public key.
- Run `supabase/schema.sql` in the Supabase SQL editor.
- Configure Supabase Magic Link redirect URLs for local development and GitHub Pages.
- Seed the initial 12-week plan after first login.
- Verify live Supabase login, plan read/write, and workout log submission.

## DOING

## BLOCKED

- Live Supabase verification is blocked until Supabase project credentials and Auth redirect settings exist.

## DONE

- Created initial Vite + React + TypeScript project.
- Added Supabase schema and setup notes.
- Added initial 12-week training plan seed data.
- Added first dashboard UI for plan, feedback, audit, exports, and route library.
- Added `.ai/` collaboration document layer.
- Verified `npm run lint`.
- Verified `npm run build`.
- Verified local page render with Chrome headless at desktop and mobile viewport sizes.
- Added parent-directory npm script forwarding from `C:\Users\LIN` to `training-dashboard`.
- Converted visible app UI, training plan seed content, route seed content, README, and Supabase setup notes to Traditional Chinese.
- Fixed Supabase seed/log happy-path UUID mismatch by not inserting local seed IDs into UUID columns.
- Rechecked responsive widths at 390, 768, 1024, and 1366 px with system Chrome.
- Published repository to `https://github.com/yung13yubabie/training-dashboard`.
- Configured GitHub Pages deployment through GitHub Actions.
- Verified the public Pages URL loads at `https://yung13yubabie.github.io/training-dashboard/`.
