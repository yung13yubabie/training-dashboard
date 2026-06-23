import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Lock,
  Mail,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import { buildTrainingPlan } from './data/trainingPlan'
import { trailRoutes } from './data/routes'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { PlannedWorkout, WorkoutLog } from './types'

const planSeed = buildTrainingPlan()

const todayIso = new Date().toISOString().slice(0, 10)

type Notice = { kind: 'ok' | 'warn' | 'error'; text: string } | null

const emptyLog = (plannedWorkoutId: string | null): WorkoutLog => ({
  planned_workout_id: plannedWorkoutId,
  workout_date: todayIso,
  completed: true,
  duration_min: 45,
  distance_km: null,
  avg_hr: null,
  max_hr: null,
  rpe: 4,
  fatigue: 3,
  pain: 0,
  sleep_hours: null,
  resting_hr: null,
  zone1_min: 5,
  zone2_min: 35,
  zone3_min: 5,
  zone4_min: 0,
  zone5_min: 0,
  elevation_gain_m: null,
  activity_link: null,
  gpx_file: null,
  notes: null,
})

const dayLabels: Record<string, string> = {
  Tue: '週二',
  Wed: '週三',
  Thu: '週四',
  Sat: '週六',
  Sun: '週日',
}

const workoutTypeLabels: Record<string, string> = {
  calibration: '基準測試',
  vo2max: '最大攝氧量',
  threshold: '閾值',
  zone2: 'Zone 2 有氧',
  neuromuscular: '神經肌肉刺激',
  trail: '越野長跑',
  recovery: '恢復',
  rest: '休息',
}

const priorityLabels: Record<string, string> = {
  low: '低',
  normal: '一般',
  key: '關鍵',
}

const difficultyLabels: Record<string, string> = {
  easy: '簡單',
  moderate: '中等',
  hard: '困難',
}

const toNumberOrNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  return Number(value)
}

const dayOrder: Record<string, number> = {
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Sat: 4,
  Sun: 5,
}

const sortPlan = (workouts: PlannedWorkout[]) =>
  [...workouts].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      (dayOrder[a.day_label] ?? 99) - (dayOrder[b.day_label] ?? 99),
  )

const fallbackError = (action: string) => {
  switch (action) {
    case 'load':
      return '無法讀取資料。請確認 Supabase schema 已建立、RLS 設定正確，並重新登入後再試。'
    case 'magic-link':
      return 'Magic Link 寄送失敗。請確認 Email 格式、Supabase Auth 設定與 Redirect URL。'
    case 'plan-version':
      return '建立課表版本失敗。請確認資料表已建立，且你目前已登入。'
    case 'seed-plan':
      return '寫入 12 週課表失敗。請確認 schema 已執行，並且 RLS 允許目前登入帳號寫入。'
    case 'save-log':
      return '儲存訓練回饋失敗。請確認已登入、資料表已建立，並檢查欄位數值是否合理。'
    default:
      return '操作失敗。請確認 Supabase 設定與登入狀態。'
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([])
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(planSeed[0]?.id ?? null)
  const [isLoading, setIsLoading] = useState(false)

  const selectedWorkout =
    plannedWorkouts.find((workout) => workout.id === selectedWorkoutId) ?? planSeed[0]

  const weeklyAudit = useMemo(() => {
    const lastSeven = logs.slice(0, 7)
    const completed = lastSeven.filter((log) => log.completed).length
    const duration = lastSeven.reduce((sum, log) => sum + log.duration_min, 0)
    const zone2 = lastSeven.reduce((sum, log) => sum + log.zone2_min, 0)
    const high = lastSeven.reduce((sum, log) => sum + log.zone4_min + log.zone5_min, 0)
    const maxPain = Math.max(0, ...lastSeven.map((log) => log.pain))
    const avgFatigue = lastSeven.length
      ? Math.round((lastSeven.reduce((sum, log) => sum + log.fatigue, 0) / lastSeven.length) * 10) / 10
      : 0

    return { completed, duration, zone2, high, maxPain, avgFatigue }
  }, [logs])

  const chartData = useMemo(
    () =>
      logs
        .slice(0, 14)
        .reverse()
        .map((log) => ({
          date: log.workout_date.slice(5),
          load: log.duration_min * log.rpe,
          z2: log.zone2_min,
          pain: log.pain,
        })),
    [logs],
  )

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshData = useCallback(async () => {
    if (!supabase || !session) return
    setIsLoading(true)
    setNotice(null)

    const [{ data: workouts, error: workoutsError }, { data: workoutLogs, error: logsError }] =
      await Promise.all([
        supabase
          .from('planned_workouts')
          .select('*')
          .order('week_number', { ascending: true })
          .order('day_label', { ascending: true }),
        supabase.from('workout_logs').select('*').order('workout_date', { ascending: false }),
      ])

    if (workoutsError || logsError) {
      console.error('Supabase load failed', workoutsError ?? logsError)
      setNotice({
        kind: 'error',
        text: fallbackError('load'),
      })
    } else {
      const sortedWorkouts = sortPlan((workouts as PlannedWorkout[]) ?? [])
      setPlannedWorkouts(sortedWorkouts)
      if (sortedWorkouts.length && !sortedWorkouts.some((workout) => workout.id === selectedWorkoutId)) {
        setSelectedWorkoutId(sortedWorkouts[0].id)
      }
      setLogs((workoutLogs as WorkoutLog[]) ?? [])
    }

    setIsLoading(false)
  }, [selectedWorkoutId, session])

  useEffect(() => {
    if (!supabase || !session) return
    void Promise.resolve().then(refreshData)
  }, [refreshData, session])

  const signIn = async () => {
    if (!supabase || !email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: import.meta.env.VITE_SITE_URL ?? window.location.origin,
      },
    })

    setNotice(
      error
        ? { kind: 'error', text: fallbackError('magic-link') }
        : { kind: 'ok', text: 'Magic Link 已寄出。請到信箱點連結，登入後回到這個頁面。' },
    )
    if (error) console.error('Magic Link failed', error)
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setPlannedWorkouts([])
    setLogs([])
  }

  const seedPlan = async () => {
    if (!supabase || !session) return
    setIsLoading(true)

    const { data: version, error: versionError } = await supabase
      .from('plan_versions')
      .insert({
        user_id: session.user.id,
        name: '12 週最大攝氧量與耐力課表',
        goal: '提升最大攝氧量、神經肌肉速度、Zone 2 有氧基礎與越野耐受。',
        status: 'active',
        notes: '依 2026-06-22 訪談假設產生。',
      })
      .select('id')
      .single()

    if (versionError) {
      console.error('Create plan version failed', versionError)
      setNotice({ kind: 'error', text: fallbackError('plan-version') })
      setIsLoading(false)
      return
    }

    const { error } = await supabase.from('planned_workouts').insert(
      planSeed.map((workout) => ({
        user_id: session.user.id,
        plan_version_id: version.id,
        week_number: workout.week_number,
        day_label: workout.day_label,
        workout_type: workout.workout_type,
        title: workout.title,
        prescription: workout.prescription,
        intensity_target: workout.intensity_target,
        duration_min: workout.duration_min,
        distance_km: workout.distance_km,
        elevation_gain_m: workout.elevation_gain_m,
        route_id: workout.route_id,
        priority: workout.priority,
      })),
    )

    if (error) {
      console.error('Seed plan failed', error)
      setNotice({ kind: 'error', text: fallbackError('seed-plan') })
    } else {
      setNotice({ kind: 'ok', text: '已把初始 12 週課表寫入 Supabase。' })
      await refreshData()
    }

    setIsLoading(false)
  }

  const submitLog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !session) return

    const form = new FormData(event.currentTarget)
    const persistedWorkoutId = plannedWorkouts.some((workout) => workout.id === selectedWorkout?.id)
      ? selectedWorkout?.id ?? null
      : null
    const log: WorkoutLog = {
      ...emptyLog(persistedWorkoutId),
      user_id: session.user.id,
      planned_workout_id: persistedWorkoutId,
      workout_date: String(form.get('workout_date') ?? todayIso),
      completed: form.get('completed') === 'on',
      duration_min: Number(form.get('duration_min') ?? 0),
      distance_km: toNumberOrNull(form.get('distance_km')),
      avg_hr: toNumberOrNull(form.get('avg_hr')),
      max_hr: toNumberOrNull(form.get('max_hr')),
      rpe: Number(form.get('rpe') ?? 4),
      fatigue: Number(form.get('fatigue') ?? 3),
      pain: Number(form.get('pain') ?? 0),
      sleep_hours: toNumberOrNull(form.get('sleep_hours')),
      resting_hr: toNumberOrNull(form.get('resting_hr')),
      zone1_min: Number(form.get('zone1_min') ?? 0),
      zone2_min: Number(form.get('zone2_min') ?? 0),
      zone3_min: Number(form.get('zone3_min') ?? 0),
      zone4_min: Number(form.get('zone4_min') ?? 0),
      zone5_min: Number(form.get('zone5_min') ?? 0),
      elevation_gain_m: toNumberOrNull(form.get('elevation_gain_m')),
      activity_link: String(form.get('activity_link') || '') || null,
      gpx_file: String(form.get('gpx_file') || '') || null,
      notes: String(form.get('notes') || '') || null,
    }

    const { error } = await supabase.from('workout_logs').insert(log)

    if (error) {
      console.error('Save workout log failed', error)
      setNotice({ kind: 'error', text: fallbackError('save-log') })
    } else {
      setNotice({ kind: 'ok', text: '訓練回饋已儲存。' })
      event.currentTarget.reset()
      await refreshData()
    }
  }

  const exportJson = () => {
    const exportPlan = plannedWorkouts.length ? plannedWorkouts : planSeed
    const blob = new Blob([JSON.stringify({ plannedWorkouts: exportPlan, logs, trailRoutes }, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `training-export-${todayIso}.json`)
  }

  const exportCsv = () => {
    const rows = [
      ['日期', '分鐘', '距離公里', '平均心率', 'RPE', '疲勞', '疼痛', 'Zone 2 分鐘', '備註'],
      ...logs.map((log) => [
        log.workout_date,
        log.duration_min,
        log.distance_km ?? '',
        log.avg_hr ?? '',
        log.rpe,
        log.fatigue,
        log.pain,
        log.zone2_min,
        log.notes ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `training-logs-${todayIso}.csv`)
  }

  const activePlan = plannedWorkouts.length ? plannedWorkouts : planSeed
  const setupBlocked = !isSupabaseConfigured

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Activity size={24} />
          <span>跑步訓練儀表板</span>
        </div>
        <nav>
          <a href="#today">今日課表</a>
          <a href="#feedback">訓練回饋</a>
          <a href="#audit">週稽核</a>
          <a href="#plan">12 週課表</a>
          <a href="#routes">越野路線</a>
        </nav>
        <div className="sidebar-footer">
          <ShieldAlert size={18} />
          <span>僅使用 Magic Link 與 RLS。前端不可放服務角色金鑰。</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>跑步訓練儀表板</h1>
            <p>最大攝氧量、神經肌肉刺激、Zone 2 有氧基礎與週末越野耐力。</p>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={exportJson}>
              <Download size={16} /> JSON
            </button>
            <button type="button" onClick={exportCsv} disabled={!logs.length}>
              <Download size={16} /> CSV
            </button>
          </div>
        </header>

        {setupBlocked && (
          <section className="notice warn">
            <Lock size={18} />
            <span>
              尚未完成 Supabase 設定。請從 `.env.example` 建立 `.env.local`，填入 Project URL 與匿名公開金鑰。
            </span>
          </section>
        )}

        {notice && (
          <section className={`notice ${notice.kind}`}>
            <span>{notice.text}</span>
          </section>
        )}

        <section className="auth-card">
          {session ? (
            <>
              <div>
                <strong>{session.user.email}</strong>
                <span>已登入，session 目前有效</span>
              </div>
              <button type="button" onClick={refreshData} disabled={isLoading}>
                <RefreshCw size={16} /> 重新整理
              </button>
              <button type="button" onClick={signOut}>登出</button>
            </>
          ) : (
            <>
              <div>
                <strong>Magic Link 登入</strong>
                <span>登入後才能寫入課表與儲存每日回饋。</span>
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!supabase}
              />
              <button type="button" onClick={signIn} disabled={!supabase || !email}>
                <Mail size={16} /> 寄出登入連結
              </button>
            </>
          )}
        </section>

        <section className="grid two">
          <article className="panel" id="today">
            <div className="panel-heading">
              <span><CalendarDays size={18} /> 今日課表</span>
              <select value={selectedWorkoutId ?? ''} onChange={(event) => setSelectedWorkoutId(event.target.value)}>
                {activePlan.slice(0, 20).map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    第 {workout.week_number} 週 {dayLabels[workout.day_label] ?? workout.day_label} - {workout.title}
                  </option>
                ))}
              </select>
            </div>
            <h2>{selectedWorkout.title}</h2>
            <p className="prescription">{selectedWorkout.prescription}</p>
            <div className="metric-row">
              <Metric label="強度目標" value={selectedWorkout.intensity_target} />
              <Metric label="時間" value={`${selectedWorkout.duration_min ?? '-'} 分鐘`} />
              <Metric label="類型" value={workoutTypeLabels[selectedWorkout.workout_type] ?? selectedWorkout.workout_type} />
              <Metric label="優先度" value={priorityLabels[selectedWorkout.priority] ?? selectedWorkout.priority} />
            </div>
          </article>

          <article className="panel" id="audit">
            <div className="panel-heading">
              <span><TrendingUp size={18} /> 週稽核</span>
              <span className={weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? 'risk high' : 'risk ok'}>
                {weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? '需要檢查' : '穩定'}
              </span>
            </div>
            <div className="metric-row">
              <Metric label="完成數" value={`${weeklyAudit.completed}/7`} />
              <Metric label="總分鐘" value={weeklyAudit.duration} />
              <Metric label="Zone 2" value={`${weeklyAudit.zone2} 分鐘`} />
              <Metric label="高強度" value={`${weeklyAudit.high} 分鐘`} />
              <Metric label="最高疼痛" value={weeklyAudit.maxPain} />
              <Metric label="平均疲勞" value={weeklyAudit.avgFatigue} />
            </div>
          </article>
        </section>

        <section className="panel" id="feedback">
          <div className="panel-heading">
            <span><CheckCircle2 size={18} /> 訓練回饋</span>
            <span>標準欄位約 2 分鐘完成，細節可選填</span>
          </div>
          <form className="feedback-form" onSubmit={submitLog}>
            <Field label="日期" name="workout_date" type="date" defaultValue={todayIso} />
            <Field label="時間（分鐘）" name="duration_min" type="number" defaultValue="45" />
            <Field label="距離（公里）" name="distance_km" type="number" step="0.01" />
            <Field label="平均心率" name="avg_hr" type="number" />
            <Field label="最高心率" name="max_hr" type="number" />
            <Field label="RPE" name="rpe" type="number" min="1" max="10" defaultValue="4" />
            <Field label="疲勞 1-10" name="fatigue" type="number" min="1" max="10" defaultValue="3" />
            <Field label="疼痛 0-10" name="pain" type="number" min="0" max="10" defaultValue="0" />
            <Field label="睡眠小時" name="sleep_hours" type="number" step="0.1" />
            <Field label="晨間靜息心率" name="resting_hr" type="number" />
            <Field label="Z1 分鐘" name="zone1_min" type="number" defaultValue="5" />
            <Field label="Z2 分鐘" name="zone2_min" type="number" defaultValue="35" />
            <Field label="Z3 分鐘" name="zone3_min" type="number" defaultValue="5" />
            <Field label="Z4 分鐘" name="zone4_min" type="number" defaultValue="0" />
            <Field label="Z5 分鐘" name="zone5_min" type="number" defaultValue="0" />
            <Field label="爬升（公尺）" name="elevation_gain_m" type="number" />
            <label className="checkbox-field">
              <input type="checkbox" name="completed" defaultChecked /> 已完成
            </label>
            <Field label="活動連結" name="activity_link" type="url" />
            <Field label="GPX 檔名/參考" name="gpx_file" type="text" />
            <label className="wide">
              備註
              <textarea name="notes" rows={3} placeholder="今天感覺如何？有沒有異常、疼痛、睡眠或路線狀況？" />
            </label>
            <button type="submit" disabled={!session || !supabase}>儲存回饋</button>
          </form>
        </section>

        <section className="grid two">
          <article className="panel chart-panel">
            <div className="panel-heading"><span>訓練負荷</span></div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={18} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="load" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pain" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </article>

          <article className="panel chart-panel">
            <div className="panel-heading"><span>Zone 2 分鐘</span></div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={18} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="z2" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>
        </section>

        <section className="panel" id="plan">
          <div className="panel-heading">
            <span><Database size={18} /> 12 週課表</span>
            <button type="button" onClick={seedPlan} disabled={!session || plannedWorkouts.length > 0 || isLoading}>
              寫入 Supabase
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>週</th>
                  <th>日</th>
                  <th>類型</th>
                  <th>課表</th>
                  <th>目標</th>
                  <th>分鐘</th>
                </tr>
              </thead>
              <tbody>
                {activePlan.map((workout) => (
                  <tr key={workout.id}>
                    <td>{workout.week_number}</td>
                    <td>{dayLabels[workout.day_label] ?? workout.day_label}</td>
                    <td>{workoutTypeLabels[workout.workout_type] ?? workout.workout_type}</td>
                    <td>{workout.title}</td>
                    <td>{workout.intensity_target}</td>
                    <td>{workout.duration_min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" id="routes">
          <div className="panel-heading">
            <span><MapPinned size={18} /> 越野路線</span>
            <span>台北/桃園，大眾運輸優先的候選路線</span>
          </div>
          <div className="route-grid">
            {trailRoutes.map((route) => (
              <article className="route-card" key={route.id}>
                <strong>{route.name}</strong>
                <span>{route.area} / {difficultyLabels[route.difficulty] ?? route.difficulty}</span>
                <p>{route.role}</p>
                <small>{route.access}</small>
                {route.source_url && (
                  <a href={route.source_url} target="_blank" rel="noopener noreferrer">
                    查看來源
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...inputProps } = props
  return (
    <label>
      {label}
      <input {...inputProps} />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default App
