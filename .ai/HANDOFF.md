# HANDOFF

## This Round

Investigated the login-time Supabase failure, rebuilt the UI in a Strava-inspired activity-dashboard style, and fixed local source encoding issues before redeployment.

## Root Cause Found

The live Supabase project returns `PGRST205` for all expected tables:

- `public.plan_versions`
- `public.planned_workouts`
- `public.workout_logs`
- `public.trail_routes`

This means the REST API cannot find those tables in the schema cache. The most likely cause is that `supabase/schema.sql` has not been successfully executed in the live Supabase project, or the schema cache has not reloaded after SQL execution.

## Added or Modified

- `src/App.tsx`
- `src/App.css`
- `src/data/trainingPlan.ts`
- `supabase/schema.sql`
- `supabase/SETUP.md`
- `.ai/TASKS.md`
- `.ai/HANDOFF.md`

## Important Fixes

- UI now shows actionable Supabase diagnostics instead of only a generic reload/login message.
- `PGRST205` maps to a clear "run schema.sql" instruction.
- `supabase/schema.sql` drops existing policies before recreating them, so it is safer to rerun.
- `supabase/schema.sql` ends with `notify pgrst, 'reload schema';`.
- Rebuilt the UI with Strava-inspired patterns: orange primary actions, activity feed, metric strips, compact white cards, and denser dashboard scanning.
- Removed mojibake from the modified app source and training plan seed data.

## Verified This Round

- Direct Supabase anon query reproduces `PGRST205` for the expected tables.
- `npm run lint` passes.
- `npm run build` passes.
- `GITHUB_PAGES=true npm run build` uses the Pages base path.
- Bundle text scan shows no old mojibake marker codepoints.
- Local Chrome headless renders the redesigned UI at 320, 768, 1024, and 1440 px with no console errors.
- Local Chrome headless shows no document/body horizontal overflow at those widths.
- GitHub Actions run `28024252118` deployed this round successfully.
- Public Pages URL returns HTTP 200 and renders Traditional Chinese at 320, 390, 768, and 1440 px with no console errors or horizontal overflow.

## Still Need Verification

- User must run `supabase/schema.sql` in the live Supabase SQL Editor.
- Magic Link redirect must be tested again after the schema exists.
- "寫入 Supabase" must be tested after login.
- A workout log insert/select round trip must be tested after seeding.

## Next Steps

1. In Supabase SQL Editor, run `supabase/schema.sql`.
2. Wait 10-30 seconds for PostgREST schema cache reload.
3. Re-login and test "寫入 Supabase".
4. Submit one workout log and confirm it appears after refresh.
