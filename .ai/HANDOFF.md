# HANDOFF

## This Round

Investigated a save failure when entering yesterday's workout, improved Supabase save diagnostics, relaxed wearable metric constraints, added weekend missed-session adjustment guidance, added fartlek sessions to the seed plan, and added an Email link generator for remote form access.

## Root Cause Found

Live Supabase anonymous read probes now return status 200 for `workout_logs`, `workout_segments`, and `planned_workouts`, including the newer columns. This means the current failure is no longer best explained as missing tables or columns.

The likely failure layer is authenticated insert/update validation:

- DB check constraints can reject real wearable values with `23514`.
- Integer columns can reject decimal/text values with `22P02`.
- Same-day uniqueness can return `23505` if the UI cannot first read the existing daily row.

The app now rounds integer-like fields before save and displays the actual Supabase code/message/details/hint. The schema also drops overly strict wearable metric checks and should be rerun.

## Added or Modified

- `src/App.tsx`
- `src/App.css`
- `src/data/trainingPlan.ts`
- `src/types.ts`
- `supabase/schema.sql`
- `supabase/SETUP.md`
- `.ai/CURRENT_STATE.md`
- `.ai/TASKS.md`
- `.ai/HANDOFF.md`

## Important Fixes

- Added specific save error messages for `PGRST204/PGRST205`, `23505`, `23514`, `22P02`, and RLS permission failures.
- Changed integer-like form parsing to round decimals before sending to integer columns.
- Relaxed wearable metric constraints in `supabase/schema.sql`.
- Added a missed-session adjustment panel: weekday unavoidable misses can move to Saturday/Sunday, and weekend two/three-session rules are shown.
- Added adjustable fartlek workouts to the 12-week seed plan.
- Changed plan import so it archives old active plan versions before creating a new active plan, and the app reads only active planned workouts.
- Added an Email link generator. It opens the website remotely; true automatic sending still requires a backend email provider integration.

## Verified This Round

- Direct Supabase anonymous read probes return status 200 for the expected workout tables/columns.
- `npm run lint` passes.
- `npm run build` passes.
- `GITHUB_PAGES=true npm run build` uses the Pages base path.
- Build assets contain the new adjustment and fartlek strings.

Browser automation was attempted but could not be completed in this environment: transient Playwright execution could not resolve the package, and headless Chrome returned empty DOM output. Do not treat rendered RWD/browser QA as completed for this round.

## Still Need Verification

- User must rerun the latest `supabase/schema.sql` in the live Supabase SQL Editor.
- Magic Link redirect must be tested again after the schema update.
- The Supabase import/seed action must be tested after login.
- Re-importing the plan should be tested to confirm old active plans are archived and the fartlek plan appears.
- A workout log insert/select round trip must be tested after seeding.
- A workout segment insert/select round trip must be tested after the latest schema is applied.
- Same-day overwrite behavior must be tested against live Supabase after running the latest schema.
- Rendered RWD/browser QA should be rerun with a working browser automation tool.
- GitHub Pages deployment for this round must complete after pushing.

## Next Steps

1. In Supabase SQL Editor, rerun the latest `supabase/schema.sql`.
2. Wait 10-30 seconds for PostgREST schema cache reload.
3. Re-login and test seeding/saving.
4. Submit one workout log for yesterday with at least one segment row and confirm it appears after refresh.
5. If saving still fails, copy the exact Supabase code/message/details now shown in the red notice.
