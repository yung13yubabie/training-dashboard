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
  calories integer check (calories >= 0),
  avg_pace text,
  best_pace text,
  avg_hr integer,
  max_hr integer,
  avg_power_w integer check (avg_power_w >= 0),
  power_weight_ratio numeric(4,2) check (power_weight_ratio >= 0),
  avg_cadence_spm integer,
  max_cadence_spm integer,
  avg_stride_m numeric(4,2),
  max_stride_m numeric(4,2),
  avg_vertical_oscillation_cm numeric(4,1),
  max_vertical_oscillation_cm numeric(4,1),
  avg_vertical_ratio_percent numeric(4,1),
  avg_ground_contact_ms integer,
  min_ground_contact_ms integer,
  aerobic_training_effect numeric(3,1) check (aerobic_training_effect >= 0),
  anaerobic_training_effect numeric(3,1) check (anaerobic_training_effect >= 0),
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

alter table public.workout_logs add column if not exists calories integer check (calories >= 0);
alter table public.workout_logs add column if not exists avg_pace text;
alter table public.workout_logs add column if not exists best_pace text;
alter table public.workout_logs add column if not exists avg_power_w integer check (avg_power_w >= 0);
alter table public.workout_logs add column if not exists power_weight_ratio numeric(4,2) check (power_weight_ratio >= 0);
alter table public.workout_logs add column if not exists avg_cadence_spm integer;
alter table public.workout_logs add column if not exists max_cadence_spm integer;
alter table public.workout_logs add column if not exists avg_stride_m numeric(4,2);
alter table public.workout_logs add column if not exists max_stride_m numeric(4,2);
alter table public.workout_logs add column if not exists avg_vertical_oscillation_cm numeric(4,1);
alter table public.workout_logs add column if not exists max_vertical_oscillation_cm numeric(4,1);
alter table public.workout_logs add column if not exists avg_vertical_ratio_percent numeric(4,1);
alter table public.workout_logs add column if not exists avg_ground_contact_ms integer;
alter table public.workout_logs add column if not exists min_ground_contact_ms integer;
alter table public.workout_logs add column if not exists aerobic_training_effect numeric(3,1) check (aerobic_training_effect >= 0);
alter table public.workout_logs add column if not exists anaerobic_training_effect numeric(3,1) check (anaerobic_training_effect >= 0);

alter table public.workout_logs drop constraint if exists workout_logs_avg_hr_check;
alter table public.workout_logs drop constraint if exists workout_logs_max_hr_check;
alter table public.workout_logs drop constraint if exists workout_logs_avg_cadence_spm_check;
alter table public.workout_logs drop constraint if exists workout_logs_max_cadence_spm_check;
alter table public.workout_logs drop constraint if exists workout_logs_avg_stride_m_check;
alter table public.workout_logs drop constraint if exists workout_logs_max_stride_m_check;
alter table public.workout_logs drop constraint if exists workout_logs_avg_vertical_oscillation_cm_check;
alter table public.workout_logs drop constraint if exists workout_logs_max_vertical_oscillation_cm_check;
alter table public.workout_logs drop constraint if exists workout_logs_avg_vertical_ratio_percent_check;
alter table public.workout_logs drop constraint if exists workout_logs_avg_ground_contact_ms_check;
alter table public.workout_logs drop constraint if exists workout_logs_min_ground_contact_ms_check;
alter table if exists public.workout_segments drop constraint if exists workout_segments_avg_hr_check;
alter table if exists public.workout_segments drop constraint if exists workout_segments_cadence_spm_check;
alter table if exists public.workout_segments drop constraint if exists workout_segments_stride_m_check;

with ranked_logs as (
  select
    id,
    row_number() over (
      partition by user_id, workout_date
      order by created_at desc, id desc
    ) as row_number
  from public.workout_logs
)
delete from public.workout_logs
where id in (
  select id
  from ranked_logs
  where row_number > 1
);

create table if not exists public.workout_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  segment_index integer not null check (segment_index between 1 and 99),
  distance_km numeric(5,2) check (distance_km >= 0),
  pace text,
  duration_text text,
  avg_hr integer,
  cadence_spm integer,
  stride_m numeric(4,2),
  calories integer check (calories >= 0),
  created_at timestamptz not null default now()
);

comment on column public.workout_logs.avg_stride_m is 'Average stride length in meters. Convert device values shown in centimeters before saving.';
comment on column public.workout_logs.max_stride_m is 'Maximum stride length in meters. Convert device values shown in centimeters before saving.';
comment on column public.workout_segments.stride_m is 'Segment stride length in meters. Convert device values shown in centimeters before saving.';

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
create unique index if not exists workout_logs_user_date_unique_idx on public.workout_logs(user_id, workout_date);
create index if not exists workout_segments_log_idx on public.workout_segments(workout_log_id, segment_index);
create index if not exists workout_segments_user_idx on public.workout_segments(user_id);
create index if not exists trail_routes_user_area_idx on public.trail_routes(user_id, area);

alter table public.plan_versions enable row level security;
alter table public.planned_workouts enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_segments enable row level security;
alter table public.trail_routes enable row level security;

drop policy if exists "Users read own plan versions" on public.plan_versions;
drop policy if exists "Users write own plan versions" on public.plan_versions;
drop policy if exists "Users read own planned workouts" on public.planned_workouts;
drop policy if exists "Users write own planned workouts" on public.planned_workouts;
drop policy if exists "Users read own workout logs" on public.workout_logs;
drop policy if exists "Users write own workout logs" on public.workout_logs;
drop policy if exists "Users read own workout segments" on public.workout_segments;
drop policy if exists "Users write own workout segments" on public.workout_segments;
drop policy if exists "Users read own or public trail routes" on public.trail_routes;
drop policy if exists "Users write own trail routes" on public.trail_routes;

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

create policy "Users read own workout segments"
on public.workout_segments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users write own workout segments"
on public.workout_segments for all
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

notify pgrst, 'reload schema';
