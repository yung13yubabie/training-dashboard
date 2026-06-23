# DECISIONS

## 2026-06-22 - Use GitHub Pages with Supabase

### Decision

The app uses GitHub Pages for static frontend hosting and Supabase for Auth and Postgres-backed data persistence.

### Reason

GitHub Pages is sufficient for the React frontend, but it cannot store user training data by itself. Supabase provides authentication, database storage, and row-level security without requiring a custom backend.

### Impact

Frontend code may use only the Supabase anon public key. Sensitive service role keys must never be placed in the frontend.

## 2026-06-22 - Start with Magic Link Auth

### Decision

The first authentication method is Supabase Magic Link email login. Google OAuth can be added later.

### Reason

Magic Link avoids the extra Google Cloud OAuth setup required for the initial version while still using Supabase `auth.users.id` as the stable user identity.

### Impact

All user-owned tables use `user_id = auth.uid()` RLS policies, so adding OAuth later does not require changing the data model.

## 2026-06-22 - Store Plans and Logs in Supabase

### Decision

Planned workouts, workout logs, plan versions, and trail routes are modeled as database records, with seed data shipped in the frontend.

### Reason

The assistant provides the plan, the user records actual feedback, and future audits need planned-vs-actual comparisons.

### Impact

The app includes a seed action after login so the initial 12-week plan can be inserted for the authenticated user.
