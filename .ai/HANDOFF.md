# HANDOFF

## This Round

Investigated the login-time Supabase failure, rebuilt the UI in a Strava-inspired activity-dashboard style, added collapsible workout logging, added structured segment data support, and changed workout logs to one entry per day.

## Root Cause Found

The live Supabase project returns `PGRST205` for all expected tables:

- `public.plan_versions`
- `public.planned_workouts`
- `public.workout_logs`
- `public.workout_segments`
- `public.trail_routes`

This means the REST API cannot find those tables in the schema cache. The most likely cause is that `supabase/schema.sql` has not been successfully executed in the live Supabase project, or the schema cache has not reloaded after SQL execution.

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

- UI now shows actionable Supabase diagnostics instead of only a generic reload/login message.
- `PGRST205` maps to a clear "run schema.sql" instruction.
- `supabase/schema.sql` drops existing policies before recreating them, so it is safer to rerun.
- `supabase/schema.sql` ends with `notify pgrst, 'reload schema';`.
- Rebuilt the UI with Strava-inspired patterns: orange primary actions, activity feed, metric strips, compact white cards, and denser dashboard scanning.
- Recent activity and 12-week plan rows are now collapsible.
- Workout logging now happens inside a planned workout row.
- Added optional segment rows for Amazfit-style distance, pace, duration, heart rate, cadence, stride, and calories.
- Saving the same date now updates the existing daily workout log instead of inserting another row.
- `supabase/schema.sql` removes duplicate same-day logs before creating the `workout_logs_user_date_unique_idx` unique index.
- Added dynamic segment add/remove controls.
- Added overall Amazfit metrics for calories, pace, power, cadence, stride, vertical oscillation, vertical ratio, ground contact time, and training effect.
- Rewrote `supabase/SETUP.md` in clean Traditional Chinese with the exact SQL Editor workflow.

## Verified This Round

- Direct Supabase anon query reproduces `PGRST205` for the expected tables.
- `npm run lint` passes.
- `npm run build` passes.
- `GITHUB_PAGES=true npm run build` uses the Pages base path.
- Local Chrome headless opens the first 12-week plan row at 320, 390, 768, and 1440 px.
- Local Chrome headless confirms the in-row log form has total fields and segment fields.
- Local Chrome headless confirms segment add/remove works at 320, 390, 768, and 1440 px.
- Local Chrome headless shows no document/body horizontal overflow at those widths.

## Still Need Verification

- User must run `supabase/schema.sql` in the live Supabase SQL Editor.
- Magic Link redirect must be tested again after the schema exists.
- "寫入 Supabase" must be tested after login.
- A workout log insert/select round trip must be tested after seeding.
- A workout segment insert/select round trip must be tested after the latest schema is applied.
- Same-day overwrite behavior must be tested against live Supabase after running the latest schema.
- GitHub Pages deployment for this round must complete after pushing.

## Next Steps

1. In Supabase SQL Editor, run `supabase/schema.sql`.
2. Wait 10-30 seconds for PostgREST schema cache reload.
3. Re-login and test "寫入 Supabase".
4. Submit one workout log with at least one segment row and confirm it appears after refresh.
5. Push this round and verify GitHub Pages.
