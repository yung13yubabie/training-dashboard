export type WorkoutType =
  | 'calibration'
  | 'vo2max'
  | 'threshold'
  | 'zone2'
  | 'neuromuscular'
  | 'trail'
  | 'recovery'
  | 'rest'

export type PlannedWorkout = {
  id: string
  week_number: number
  day_label: string
  workout_type: WorkoutType
  title: string
  prescription: string
  intensity_target: string
  duration_min: number | null
  distance_km: number | null
  elevation_gain_m: number | null
  route_id: string | null
  priority: 'low' | 'normal' | 'key'
}

export type WorkoutLog = {
  id?: string
  user_id?: string
  planned_workout_id: string | null
  workout_date: string
  completed: boolean
  duration_min: number
  distance_km: number | null
  avg_hr: number | null
  max_hr: number | null
  rpe: number
  fatigue: number
  pain: number
  sleep_hours: number | null
  resting_hr: number | null
  zone1_min: number
  zone2_min: number
  zone3_min: number
  zone4_min: number
  zone5_min: number
  elevation_gain_m: number | null
  activity_link: string | null
  gpx_file: string | null
  notes: string | null
  created_at?: string
}

export type TrailRoute = {
  id: string
  name: string
  area: string
  access: string
  distance_km: number | null
  elevation_gain_m: number | null
  difficulty: 'easy' | 'moderate' | 'hard'
  role: string
  gpx_url: string | null
  source_url: string | null
  notes: string
}
