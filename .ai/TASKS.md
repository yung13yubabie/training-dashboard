# TASKS

## TODO

- Rerun the latest `supabase/schema.sql` in the Supabase SQL editor to relax wearable metric constraints.
- Configure Supabase Magic Link redirect URLs for local development and GitHub Pages.
- Seed the initial 12-week plan after first login.
- Verify live authenticated Supabase workout log submission after rerunning the latest schema.
- Verify workout segment insert/read after rerunning the latest schema.
- Verify the one-log-per-day update path against live Supabase.
- Deploy the `22003` frontend validation fix and verify live workout save with stride values entered in meters.
- Verify deployed activity edit flow from the recent activity feed.
- Verify remote fill link flow: Email draft, copy-link fallback, Magic Link login, and saved workout round trip.
- Verify deployed weekly plan accordion: current week opens by default and neighboring weeks expand on demand.
- Verify deployed planned-workout move flow against live Supabase.
- Verify deployed planned-workout edit flow against live Supabase.
- Verify deployed activity delete flow against live Supabase.
- Verify date-specific remote fill link, for example `?date=YYYY-MM-DD#plan`.
- Deploy `send-fill-link` Supabase Edge Function and set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` secrets.
- Verify automatic remote fill email delivery through Resend.

## DOING

## BLOCKED

- Live authenticated write verification is blocked until the user reruns the latest schema and tests through their Magic Link session.

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
- Identified the login-time Supabase failure as `PGRST205`, meaning the live project cannot find the expected tables in the schema cache.
- Added clearer Supabase diagnostics for missing schema / RLS failures.
- Made `supabase/schema.sql` safer to rerun by dropping existing policies before recreating them and notifying PostgREST to reload schema.
- Reworked the UI toward a Strava-inspired activity dashboard style.
- Verified the redesigned local UI at 320, 768, 1024, and 1440 px with Chrome headless.
- Added collapsible recent activity and 12-week plan rows with in-place workout logging.
- Added `workout_segments` schema support for optional split/group data.
- Changed workout saving to one log per day, with repeated saves updating the same daily record.
- Added dynamic segment add/remove controls and extended overall Amazfit metrics.
- Added detailed Supabase save error messages with code/details/hint instead of a generic failure notice.
- Relaxed database constraints for wearable metrics that can vary by device export.
- Added weekend missed-session adjustment guidance and adjustable fartlek sessions.
- Added an Email link generator for remote form access without exposing secrets.
- Changed plan import to archive old active plan versions before creating a new active plan.
- Added client-side validation and clearer messaging for `22003 numeric field overflow` caused by unit/range mismatches in wearable numeric fields.
- Added recent-activity edit flow and remote fill link fallback controls.
- Added weekly plan accordion UI, planned-workout move controls, activity delete, 4-week review metrics, and date-specific remote fill links.
- Added `send-fill-link` Supabase Edge Function and frontend automatic email send action with Email draft/copy-link fallbacks.
- Added planned-workout editing for type, priority, title, prescription, intensity target, duration, distance, elevation, and route.
- Added `npm run test:smoke` for repeatable local UI verification of weekly accordion, planned-workout edit, move controls, remote fill controls, and date query behavior.
- Added the local UI smoke gate to the GitHub Pages deploy workflow before build/upload.
