create extension if not exists pgcrypto;

create table if not exists public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text not null,
  start_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_version_id uuid references public.plan_versions(id) on delete set null,
  week_number integer not null check (week_number between 1 and 52),
  day_label text not null,
  workout_date date,
  workout_type text not null,
  title text not null,
  prescription text not null,
  intensity_target text not null,
  duration_min integer,
  distance_km numeric(5,2),
  elevation_gain_m integer,
  route_id text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'key')),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_workout_id uuid references public.planned_workouts(id) on delete set null,
  workout_date date not null,
  completed boolean not null default true,
  duration_min integer not null check (duration_min >= 0),
  distance_km numeric(5,2) check (distance_km >= 0),
  avg_hr integer check (avg_hr between 30 and 240),
  max_hr integer check (max_hr between 30 and 240),
  rpe integer not null check (rpe between 1 and 10),
  fatigue integer not null check (fatigue between 1 and 10),
  pain integer not null check (pain between 0 and 10),
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  resting_hr integer check (resting_hr between 30 and 120),
  zone1_min integer default 0 check (zone1_min >= 0),
  zone2_min integer default 0 check (zone2_min >= 0),
  zone3_min integer default 0 check (zone3_min >= 0),
  zone4_min integer default 0 check (zone4_min >= 0),
  zone5_min integer default 0 check (zone5_min >= 0),
  elevation_gain_m integer check (elevation_gain_m >= 0),
  activity_link text,
  gpx_file text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.trail_routes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  area text not null,
  access text not null,
  distance_km numeric(5,2),
  elevation_gain_m integer,
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  role text not null,
  gpx_url text,
  source_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plan_versions_user_id_idx on public.plan_versions(user_id);
create index if not exists planned_workouts_user_week_idx on public.planned_workouts(user_id, week_number);
create index if not exists planned_workouts_plan_version_id_idx on public.planned_workouts(plan_version_id);
create index if not exists workout_logs_user_date_idx on public.workout_logs(user_id, workout_date desc);
create index if not exists workout_logs_planned_workout_id_idx on public.workout_logs(planned_workout_id);
create index if not exists trail_routes_user_area_idx on public.trail_routes(user_id, area);

alter table public.plan_versions enable row level security;
alter table public.planned_workouts enable row level security;
alter table public.workout_logs enable row level security;
alter table public.trail_routes enable row level security;

create policy "Users read own plan versions"
on public.plan_versions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users write own plan versions"
on public.plan_versions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read own planned workouts"
on public.planned_workouts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users write own planned workouts"
on public.planned_workouts for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read own workout logs"
on public.workout_logs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users write own workout logs"
on public.workout_logs for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read own or public trail routes"
on public.trail_routes for select
to authenticated
using (user_id is null or (select auth.uid()) = user_id);

create policy "Users write own trail routes"
on public.trail_routes for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
