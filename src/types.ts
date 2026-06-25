export type WorkoutType =
  | 'calibration'
  | 'vo2max'
  | 'threshold'
  | 'fartlek'
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
  calories: number | null
  avg_pace: string | null
  best_pace: string | null
  avg_hr: number | null
  max_hr: number | null
  avg_power_w: number | null
  power_weight_ratio: number | null
  avg_cadence_spm: number | null
  max_cadence_spm: number | null
  avg_stride_m: number | null
  max_stride_m: number | null
  avg_vertical_oscillation_cm: number | null
  max_vertical_oscillation_cm: number | null
  avg_vertical_ratio_percent: number | null
  avg_ground_contact_ms: number | null
  min_ground_contact_ms: number | null
  aerobic_training_effect: number | null
  anaerobic_training_effect: number | null
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

export type WorkoutSegment = {
  id?: string
  user_id: string
  workout_log_id: string
  segment_index: number
  distance_km: number | null
  pace: string | null
  duration_text: string | null
  avg_hr: number | null
  cadence_spm: number | null
  stride_m: number | null
  calories: number | null
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
