# HANDOFF

## This Round

Investigated the latest workout save failure with Supabase code `22003` and detail `numeric field overflow / precision 4, scale 2`. Root cause is most likely a unit/range mismatch in `numeric(4,2)` wearable fields, especially stride fields stored as meters (`avg_stride_m`, `max_stride_m`, segment `stride_m`) while device exports may show centimeters.

Implemented client-side range validation before Supabase writes, clarified stride labels as meters, added a `22003` save error message, documented the error in setup notes, and added database column comments for stride units.

Follow-up update: added explicit units across workout form labels, segment headers, saved log metric values, and CSV export headers.

Follow-up update: added an edit toggle in the recent activity feed. Editing from this feed reuses the workout log form and preserves the existing `planned_workout_id` instead of clearing the plan link. Hardened remote fill link generation by validating the recipient email before opening a `mailto:` draft and adding a copy-link fallback.

Follow-up update: redesigned the plan surface with weekly folding. The current training week opens by default, previous/next weeks remain collapsed, and week navigation buttons jump between weeks. Added planned-workout move controls for rain/work/life interruptions, activity delete, 4-week review metrics, and date-specific remote fill links.

Follow-up update: added `send-fill-link` Supabase Edge Function for true automatic remote fill email via Resend. The frontend now has an automatic send button using `supabase.functions.invoke`, while retaining Email draft and copy-link fallbacks.

Follow-up update: added editable planned-workout content inside each workout accordion. Users can edit type, priority, title, prescription, intensity target, duration, distance, elevation, and route; remote Supabase plans persist to `planned_workouts`, while local seed plans use temporary in-browser preview until seeded.

Follow-up update: added `npm run test:smoke` as a repeatable local UI smoke gate. It starts Vite, opens local Chrome/Edge through Playwright Core, and checks desktop plus mobile render behavior for the folded weekly plan, planned-workout edit controls, move controls, remote fill controls, and date query parameter.

Follow-up update: wired lint and `npm run test:smoke` into the GitHub Pages deploy workflow before build/upload. `scripts/smoke.mjs` now also knows common Linux and macOS Chrome/Chromium paths for CI and non-Windows machines.

## Added or Modified

- `src/App.tsx`
- `src/App.css`
- `scripts/smoke.mjs`
- `package.json`
- `.github/workflows/deploy.yml`
- `src/types.ts`
- `supabase/functions/send-fill-link/index.ts`
- `.ai/CURRENT_STATE.md`
- `supabase/schema.sql`
- `supabase/SETUP.md`
- `.ai/TASKS.md`
- `.ai/HANDOFF.md`

## Verified This Round

- `npm run lint` passes.
- `npm run build` passes.
- Render smoke check with Playwright fallback passed at 1440x1000 and 390x844: page renders, no console errors, 12 week sections exist, current week is open, remote fill date query parameter is applied.
- Render smoke check after email-function UI update passed: no console errors, remote panel shows automatic send/fallback options, date query parameter is applied, and only one current week is open.
- Render smoke check after planned-workout edit update passed at 1440x1000 and 390x844: 12 week sections exist, only one week is open, the planned-workout edit panel opens, edit inputs render, move controls still render, remote fill controls still render, date query parameter is applied, and no console errors are emitted.
- `npm run test:smoke` passes and reports 12 week sections, one open week, 60 workout accordions, planned-workout edit inputs, remote fill fallback buttons, and date query application at 1440x1000 and 390x844.
- GitHub Pages deploy workflow now includes lint and UI smoke test steps before `npm run build`.

Build produced non-blocking bundle-size/plugin timing warnings only.

## Still Need Verification

- Deploy/push this frontend validation fix.
- Re-test live authenticated workout save through Magic Link.
- Enter stride values in meters, for example `1.20` for 120 cm.
- Confirm the live page now blocks `120` in stride fields before reaching Supabase.
- Verify a recent activity can be opened, edited, saved, refreshed, and still linked to its planned workout when applicable.
- Verify the remote fill flow outside the happy path: invalid email disables Email draft, copy-link works, and the receiver still must Magic Link login.
- Verify planned-workout move persists on live Supabase after Magic Link login.
- Verify planned-workout content edits persist on live Supabase after Magic Link login.
- Verify activity delete cascades segment rows in live Supabase.
- Deploy `supabase/functions/send-fill-link`, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as Supabase secrets, then verify actual Resend delivery.

## Previous Round

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
