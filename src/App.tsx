import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Lock,
  Mail,
  MapPinned,
  RefreshCw,
  ShieldCheck,
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
type DataStatus = 'idle' | 'ready' | 'schema-missing' | 'auth-or-rls' | 'unknown-error'
type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}
type Diagnostic = {
  table: string
  label: string
  ok: boolean
  code?: string
  message?: string
}

const dayLabels: Record<string, string> = {
  Tue: '週二',
  Wed: '週三',
  Thu: '週四',
  Sat: '週六',
  Sun: '週日',
}

const dayOrder: Record<string, number> = {
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Sat: 4,
  Sun: 5,
}

const workoutTypeLabels: Record<string, string> = {
  calibration: '基準測試',
  vo2max: 'VO2max',
  threshold: '閾值',
  zone2: 'Zone 2',
  neuromuscular: '神經刺激',
  trail: '越野長跑',
  recovery: '恢復',
  rest: '休息',
}

const priorityLabels: Record<string, string> = {
  low: '輔助',
  normal: '一般',
  key: '關鍵',
}

const difficultyLabels: Record<string, string> = {
  easy: '簡單',
  moderate: '中等',
  hard: '困難',
}

const dataLabels: Record<string, string> = {
  planned_workouts: '計畫課表',
  workout_logs: '訓練紀錄',
}

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

const toNumberOrNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string' || value.trim() === '') return null
  return Number(value)
}

const sortPlan = (workouts: PlannedWorkout[]) =>
  [...workouts].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      (dayOrder[a.day_label] ?? 99) - (dayOrder[b.day_label] ?? 99),
  )

const buildLoadMessage = (errors: SupabaseErrorLike[]) => {
  if (errors.some((error) => error.code === 'PGRST205')) {
    return 'Supabase 找不到訓練資料表。請到 Supabase SQL Editor 執行 `supabase/schema.sql`，再回來重新整理。'
  }

  if (errors.some((error) => error.code === '42501' || error.message?.toLowerCase().includes('permission'))) {
    return '資料表存在，但目前登入帳號沒有讀取權限。請檢查 RLS policy 是否已執行，並確認你是用 Magic Link 登入。'
  }

  return '資料讀取失敗。請查看下方診斷項目，確認 schema、RLS 與 Auth redirect 設定。'
}

const getDataStatus = (errors: SupabaseErrorLike[]): DataStatus => {
  if (!errors.length) return 'ready'
  if (errors.some((error) => error.code === 'PGRST205')) return 'schema-missing'
  if (errors.some((error) => error.code === '42501' || error.message?.toLowerCase().includes('permission'))) {
    return 'auth-or-rls'
  }
  return 'unknown-error'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [dataStatus, setDataStatus] = useState<DataStatus>('idle')
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([])
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(planSeed[0]?.id ?? null)
  const [isLoading, setIsLoading] = useState(false)

  const activePlan = plannedWorkouts.length ? plannedWorkouts : planSeed
  const selectedWorkout = activePlan.find((workout) => workout.id === selectedWorkoutId) ?? activePlan[0]
  const setupBlocked = !isSupabaseConfigured
  const hasRemotePlan = plannedWorkouts.length > 0

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

    const [workoutsResult, logsResult] = await Promise.all([
      supabase
        .from('planned_workouts')
        .select('*')
        .order('week_number', { ascending: true })
        .order('day_label', { ascending: true }),
      supabase.from('workout_logs').select('*').order('workout_date', { ascending: false }),
    ])

    const results = [
      { table: 'planned_workouts', ...workoutsResult },
      { table: 'workout_logs', ...logsResult },
    ]
    const errors = results.map((result) => result.error).filter(Boolean) as SupabaseErrorLike[]

    setDiagnostics(
      results.map((result) => ({
        table: result.table,
        label: dataLabels[result.table],
        ok: !result.error,
        code: result.error?.code,
        message: result.error?.message,
      })),
    )

    if (errors.length) {
      console.error('Supabase load failed', results)
      setDataStatus(getDataStatus(errors))
      setNotice({ kind: 'error', text: buildLoadMessage(errors) })
    } else {
      const sortedWorkouts = sortPlan((workoutsResult.data as PlannedWorkout[]) ?? [])
      setPlannedWorkouts(sortedWorkouts)
      setLogs((logsResult.data as WorkoutLog[]) ?? [])
      setDataStatus('ready')
      if (sortedWorkouts.length && !sortedWorkouts.some((workout) => workout.id === selectedWorkoutId)) {
        setSelectedWorkoutId(sortedWorkouts[0].id)
      }
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

    if (error) {
      console.error('Magic Link failed', error)
      setNotice({ kind: 'error', text: 'Magic Link 寄送失敗。請確認 Email、Supabase Auth 與 Redirect URL 設定。' })
    } else {
      setNotice({ kind: 'ok', text: 'Magic Link 已寄出。請到信箱點登入連結，再回到這個頁面。' })
    }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setPlannedWorkouts([])
    setLogs([])
    setDiagnostics([])
    setDataStatus('idle')
  }

  const seedPlan = async () => {
    if (!supabase || !session) return
    setIsLoading(true)
    setNotice(null)

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
      setNotice({ kind: 'error', text: buildLoadMessage([versionError]) })
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
      setNotice({ kind: 'error', text: buildLoadMessage([error]) })
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
      setNotice({ kind: 'error', text: buildLoadMessage([error]) })
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
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `training-logs-${todayIso}.csv`)
  }

  const activeWeek = selectedWorkout?.week_number ?? 1

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">td</span>
          <span>Training Dashboard</span>
        </div>
        <nav aria-label="主要導覽">
          <a href="#today">今日</a>
          <a href="#feed">活動</a>
          <a href="#feedback">回饋</a>
          <a href="#plan">課表</a>
          <a href="#routes">路線</a>
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={18} />
          <span>Magic Link + RLS。前端只放 Supabase anon key，不放 service role。</span>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div className="hero-copy">
            <span className="eyebrow">12 週跑步訓練</span>
            <h1>跑步訓練儀表板</h1>
            <p>以 VO2max、神經刺激、Zone 2 基礎與週末越野耐力為主軸。每天填回饋，週週稽核。</p>
            <div className="hero-actions">
              <button type="button" onClick={exportJson}>
                <Download size={16} /> 匯出 JSON
              </button>
              <button type="button" className="secondary" onClick={exportCsv} disabled={!logs.length}>
                <Download size={16} /> 匯出 CSV
              </button>
            </div>
          </div>
          <div className="hero-stats" aria-label="目前訓練摘要">
            <Metric label="本週完成" value={`${weeklyAudit.completed}/7`} />
            <Metric label="總分鐘" value={weeklyAudit.duration} />
            <Metric label="Zone 2" value={`${weeklyAudit.zone2} 分`} />
            <Metric label="疼痛峰值" value={weeklyAudit.maxPain} />
          </div>
        </header>

        {setupBlocked && (
          <NoticePanel kind="warn" icon={<Lock size={18} />}>
            尚未完成 Supabase 設定。請建立 `.env.local`，填入 Project URL 與 anon public key。
          </NoticePanel>
        )}

        {notice && (
          <NoticePanel kind={notice.kind} icon={notice.kind === 'error' ? <AlertTriangle size={18} /> : undefined}>
            {notice.text}
          </NoticePanel>
        )}

        <section className="auth-card" aria-label="登入狀態">
          {session ? (
            <>
              <div>
                <strong>{session.user.email}</strong>
                <span>已登入。資料狀態：{statusLabel(dataStatus)}</span>
              </div>
              <div className="auth-actions">
                <button type="button" className="secondary" onClick={refreshData} disabled={isLoading}>
                  <RefreshCw size={16} /> 重新整理
                </button>
                <button type="button" className="ghost" onClick={signOut}>
                  登出
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <strong>Magic Link 登入</strong>
                <span>登入後才能寫入課表與儲存每日訓練。</span>
              </div>
              <div className="auth-actions">
                <input
                  type="email"
                  aria-label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!supabase}
                />
                <button type="button" onClick={signIn} disabled={!supabase || !email}>
                  <Mail size={16} /> 寄出連結
                </button>
              </div>
            </>
          )}
        </section>

        {diagnostics.length > 0 && dataStatus !== 'ready' && (
          <section className="diagnostic-panel" aria-label="Supabase 診斷">
            <div>
              <span className="eyebrow">Supabase 診斷</span>
              <h2>{dataStatus === 'schema-missing' ? '資料表尚未建立' : '資料連線需要檢查'}</h2>
              <p>
                偵測到資料庫讀取失敗。若代碼是 PGRST205，請在 Supabase SQL Editor 執行
                `supabase/schema.sql`，再按重新整理。
              </p>
            </div>
            <div className="diagnostic-list">
              {diagnostics.map((item) => (
                <div className={item.ok ? 'diagnostic-item ok' : 'diagnostic-item error'} key={item.table}>
                  <strong>{item.label}</strong>
                  <span>{item.ok ? 'OK' : `${item.code ?? 'ERROR'}：${item.message ?? '讀取失敗'}`}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="dashboard-grid">
          <article className="workout-card" id="today">
            <div className="section-heading">
              <span><CalendarDays size={18} /> 今日課表</span>
              <select value={selectedWorkout?.id ?? ''} onChange={(event) => setSelectedWorkoutId(event.target.value)}>
                {activePlan.slice(0, 20).map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    第 {workout.week_number} 週 {dayLabels[workout.day_label] ?? workout.day_label} - {workout.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="workout-main">
              <span className={`type-chip ${selectedWorkout?.priority ?? 'normal'}`}>
                {priorityLabels[selectedWorkout?.priority ?? 'normal']}課
              </span>
              <h2>{selectedWorkout?.title}</h2>
              <p>{selectedWorkout?.prescription}</p>
            </div>
            <div className="metric-strip">
              <Metric label="週次" value={`W${activeWeek}`} />
              <Metric label="類型" value={workoutTypeLabels[selectedWorkout?.workout_type ?? 'zone2']} />
              <Metric label="時間" value={`${selectedWorkout?.duration_min ?? '-'} 分`} />
              <Metric label="目標" value={selectedWorkout?.intensity_target ?? '-'} />
            </div>
          </article>

          <aside className="side-stack">
            <article className="status-card">
              <div className="section-heading compact">
                <span><TrendingUp size={18} /> 週稽核</span>
                <span className={weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? 'risk high' : 'risk ok'}>
                  {weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? '需要檢查' : '穩定'}
                </span>
              </div>
              <div className="mini-metrics">
                <Metric label="高強度" value={`${weeklyAudit.high} 分`} />
                <Metric label="平均疲勞" value={weeklyAudit.avgFatigue} />
              </div>
            </article>

            <article className="status-card">
              <div className="section-heading compact">
                <span><Database size={18} /> Supabase</span>
              </div>
              <p>{hasRemotePlan ? '已讀取雲端課表。' : '目前顯示本地 12 週預設課表。登入後可寫入 Supabase。'}</p>
              <button type="button" onClick={seedPlan} disabled={!session || hasRemotePlan || isLoading}>
                寫入 Supabase
              </button>
            </article>
          </aside>
        </section>

        <section className="feed-grid">
          <article className="panel" id="feed">
            <div className="section-heading">
              <span><Activity size={18} /> 近期活動</span>
              <span className="muted">像活動 feed 一樣快速掃描訓練狀態</span>
            </div>
            <ActivityFeed logs={logs} fallbackPlan={activePlan.slice(0, 5)} />
          </article>

          <article className="panel chart-panel">
            <div className="section-heading"><span>訓練負荷</span></div>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={18} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="load" stroke="#fc4c02" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pain" stroke="#111827" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="還沒有圖表資料" text="儲存第一筆訓練回饋後，這裡會顯示負荷與疼痛趨勢。" />
            )}
          </article>

          <article className="panel chart-panel">
            <div className="section-heading"><span>Zone 2 分鐘</span></div>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={18} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="z2" fill="#fc4c02" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="等待 Zone 資料" text="從 Amazfit/Zepp 手錶填入各區間分鐘數後，週稽核會更準。" />
            )}
          </article>
        </section>

        <section className="panel" id="feedback">
          <div className="section-heading">
            <span><CheckCircle2 size={18} /> 訓練回饋</span>
            <span className="muted">標準欄位約 2 分鐘完成，細節可選填</span>
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
            <button type="submit" disabled={!session || !supabase || dataStatus === 'schema-missing'}>
              儲存回饋
            </button>
          </form>
        </section>

        <section className="panel" id="plan">
          <div className="section-heading">
            <span><Database size={18} /> 12 週課表</span>
            <span className="muted">目前顯示第 {activeWeek} 週附近的訓練週期</span>
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
          <div className="section-heading">
            <span><MapPinned size={18} /> 越野路線</span>
            <span className="muted">台北/桃園，大眾運輸優先</span>
          </div>
          <div className="route-grid">
            {trailRoutes.map((route) => (
              <article className="route-card" key={route.id}>
                <div>
                  <strong>{route.name}</strong>
                  <span>{route.area} / {difficultyLabels[route.difficulty]}</span>
                </div>
                <p>{route.role}</p>
                <div className="route-stats">
                  <Metric label="距離" value={`${route.distance_km ?? '-'} km`} />
                  <Metric label="爬升" value={`${route.elevation_gain_m ?? '-'} m`} />
                </div>
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

function NoticePanel({
  kind,
  icon,
  children,
}: {
  kind: 'ok' | 'warn' | 'error'
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      {icon}
      <span>{children}</span>
    </section>
  )
}

function ActivityFeed({ logs, fallbackPlan }: { logs: WorkoutLog[]; fallbackPlan: PlannedWorkout[] }) {
  if (logs.length) {
    return (
      <div className="activity-feed">
        {logs.slice(0, 5).map((log) => (
          <article className="activity-item" key={log.id ?? `${log.workout_date}-${log.duration_min}`}>
            <div className="activity-avatar">跑</div>
            <div>
              <strong>{log.workout_date}</strong>
              <p>{log.duration_min} 分鐘 / RPE {log.rpe} / Zone 2 {log.zone2_min} 分鐘</p>
              <span>疲勞 {log.fatigue}，疼痛 {log.pain}{log.notes ? `，${log.notes}` : ''}</span>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {fallbackPlan.map((workout) => (
        <article className="activity-item planned" key={workout.id}>
          <div className="activity-avatar">W{workout.week_number}</div>
          <div>
            <strong>{workout.title}</strong>
            <p>{dayLabels[workout.day_label]} / {workout.duration_min} 分鐘 / {workoutTypeLabels[workout.workout_type]}</p>
            <span>{workout.intensity_target}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      <span>{text}</span>
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

function statusLabel(status: DataStatus) {
  switch (status) {
    case 'ready':
      return '已連線'
    case 'schema-missing':
      return '缺少資料表'
    case 'auth-or-rls':
      return '需檢查權限'
    case 'unknown-error':
      return '讀取異常'
    default:
      return '等待讀取'
  }
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
