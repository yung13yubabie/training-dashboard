import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
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
import type { PlannedWorkout, WorkoutLog, WorkoutSegment } from './types'

const planSeed = buildTrainingPlan()
const todayIso = new Date().toISOString().slice(0, 10)
const segmentRows = [1, 2, 3, 4, 5]

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
  calibration: '校準測試',
  vo2max: 'VO2max',
  threshold: '閾值',
  zone2: 'Zone 2',
  neuromuscular: '神經刺激',
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

const dataLabels: Record<string, string> = {
  planned_workouts: '計畫課表',
  workout_logs: '訓練紀錄',
  workout_segments: '分段資料',
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
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const toNumber = (value: FormDataEntryValue | null, fallback: number) => {
  const number = toNumberOrNull(value)
  return number ?? fallback
}

const sortPlan = (workouts: PlannedWorkout[]) =>
  [...workouts].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      (dayOrder[a.day_label] ?? 99) - (dayOrder[b.day_label] ?? 99),
  )

const buildLoadMessage = (errors: SupabaseErrorLike[]) => {
  if (errors.some((error) => error.code === 'PGRST205')) {
    return '偵測到資料庫讀取失敗。若代碼是 PGRST205，請把 supabase/schema.sql 的完整內容貼到 Supabase SQL Editor 執行，再按重新整理。'
  }

  if (errors.some((error) => error.code === '42501' || error.message?.toLowerCase().includes('permission'))) {
    return '資料庫權限被拒。請確認 RLS policy 已建立，且目前是透過 Magic Link 登入。'
  }

  return '資料讀取失敗。請確認 Supabase schema、RLS policy 與 Auth redirect 設定。'
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
  const [segments, setSegments] = useState<WorkoutSegment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const activePlan = plannedWorkouts.length ? plannedWorkouts : planSeed
  const setupBlocked = !isSupabaseConfigured
  const hasRemotePlan = plannedWorkouts.length > 0

  const logsByWorkout = useMemo(() => {
    const grouped = new Map<string, WorkoutLog[]>()
    for (const log of logs) {
      if (!log.planned_workout_id) continue
      const items = grouped.get(log.planned_workout_id) ?? []
      items.push(log)
      grouped.set(log.planned_workout_id, items)
    }
    return grouped
  }, [logs])

  const segmentsByLog = useMemo(() => {
    const grouped = new Map<string, WorkoutSegment[]>()
    for (const segment of segments) {
      const items = grouped.get(segment.workout_log_id) ?? []
      items.push(segment)
      grouped.set(segment.workout_log_id, items)
    }
    return grouped
  }, [segments])

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

    const [workoutsResult, logsResult, segmentsResult] = await Promise.all([
      supabase
        .from('planned_workouts')
        .select('*')
        .order('week_number', { ascending: true })
        .order('day_label', { ascending: true }),
      supabase.from('workout_logs').select('*').order('workout_date', { ascending: false }),
      supabase.from('workout_segments').select('*').order('segment_index', { ascending: true }),
    ])

    const results = [
      { table: 'planned_workouts', ...workoutsResult },
      { table: 'workout_logs', ...logsResult },
      { table: 'workout_segments', ...segmentsResult },
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
      setPlannedWorkouts(sortPlan((workoutsResult.data as PlannedWorkout[]) ?? []))
      setLogs((logsResult.data as WorkoutLog[]) ?? [])
      setSegments((segmentsResult.data as WorkoutSegment[]) ?? [])
      setDataStatus('ready')
    }

    setIsLoading(false)
  }, [session])

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
      setNotice({ kind: 'error', text: 'Magic Link 發送失敗。請確認 Email 與 Supabase Auth Redirect URL。' })
    } else {
      setNotice({ kind: 'ok', text: 'Magic Link 已寄出，請到信箱登入。' })
    }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setPlannedWorkouts([])
    setLogs([])
    setSegments([])
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
        goal: '最大攝氧量、神經刺激、Zone 2 基礎與週末越野耐力',
        status: 'active',
        notes: '由訓練儀表板初始化建立',
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

  const submitLog = async (event: React.FormEvent<HTMLFormElement>, workout: PlannedWorkout | null) => {
    event.preventDefault()
    if (!supabase || !session) return

    const form = new FormData(event.currentTarget)
    const persistedWorkoutId =
      workout && plannedWorkouts.some((planned) => planned.id === workout.id) ? workout.id : null
    const log: WorkoutLog = {
      ...emptyLog(persistedWorkoutId),
      user_id: session.user.id,
      planned_workout_id: persistedWorkoutId,
      workout_date: String(form.get('workout_date') ?? todayIso),
      completed: form.get('completed') === 'on',
      duration_min: toNumber(form.get('duration_min'), 0),
      distance_km: toNumberOrNull(form.get('distance_km')),
      avg_hr: toNumberOrNull(form.get('avg_hr')),
      max_hr: toNumberOrNull(form.get('max_hr')),
      rpe: toNumber(form.get('rpe'), 4),
      fatigue: toNumber(form.get('fatigue'), 3),
      pain: toNumber(form.get('pain'), 0),
      sleep_hours: toNumberOrNull(form.get('sleep_hours')),
      resting_hr: toNumberOrNull(form.get('resting_hr')),
      zone1_min: toNumber(form.get('zone1_min'), 0),
      zone2_min: toNumber(form.get('zone2_min'), 0),
      zone3_min: toNumber(form.get('zone3_min'), 0),
      zone4_min: toNumber(form.get('zone4_min'), 0),
      zone5_min: toNumber(form.get('zone5_min'), 0),
      elevation_gain_m: toNumberOrNull(form.get('elevation_gain_m')),
      activity_link: String(form.get('activity_link') || '') || null,
      gpx_file: String(form.get('gpx_file') || '') || null,
      notes: String(form.get('notes') || '') || null,
    }

    const { data: insertedLog, error } = await supabase
      .from('workout_logs')
      .insert(log)
      .select('id')
      .single()

    if (error) {
      console.error('Save workout log failed', error)
      setNotice({ kind: 'error', text: buildLoadMessage([error]) })
      return
    }

    const segmentPayload = buildSegmentsFromForm(form, session.user.id, insertedLog.id)
    if (segmentPayload.length) {
      const { error: segmentError } = await supabase.from('workout_segments').insert(segmentPayload)
      if (segmentError) {
        console.error('Save workout segments failed', segmentError)
        setNotice({ kind: 'error', text: buildLoadMessage([segmentError]) })
        return
      }
    }

    setNotice({ kind: 'ok', text: '訓練資料已儲存。之後可在近期活動或課表展開回看。' })
    event.currentTarget.reset()
    await refreshData()
  }

  const exportJson = () => {
    const exportPlan = plannedWorkouts.length ? plannedWorkouts : planSeed
    const blob = new Blob([JSON.stringify({ plannedWorkouts: exportPlan, logs, segments, trailRoutes }, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `training-export-${todayIso}.json`)
  }

  const exportCsv = () => {
    const rows = [
      ['日期', '總時間', '總距離', '平均心率', '最高心率', 'RPE', '疲勞', '疼痛', 'Zone 2', '備註'],
      ...logs.map((log) => [
        log.workout_date,
        log.duration_min,
        log.distance_km ?? '',
        log.avg_hr ?? '',
        log.max_hr ?? '',
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

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主要導覽">
        <div className="brand" aria-label="Training Dashboard">
          <span className="brand-mark">TD</span>
          <span className="brand-name">Run Log</span>
        </div>
        <nav>
          <a href="#today">今日</a>
          <a href="#feed">活動</a>
          <a href="#plan">課表</a>
          <a href="#routes">路線</a>
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={16} />
          <span>Magic Link + RLS</span>
        </div>
      </aside>

      <main className="content">
        <header className="hero" id="today">
          <div className="hero-copy">
            <span className="eyebrow">12 週跑步訓練</span>
            <h1>跑步訓練儀表板</h1>
            <p>以 VO2max、神經刺激、Zone 2 基礎與週末越野耐力為主軸。每次訓練可展開填寫，隔天也能回看歷史資料。</p>
            <div className="hero-actions">
              <button type="button" onClick={exportJson}>
                <Download size={16} /> 匯出 JSON
              </button>
              <button type="button" className="secondary" onClick={exportCsv} disabled={!logs.length}>
                <Download size={16} /> 匯出 CSV
              </button>
            </div>
          </div>
          <div className="hero-stats" aria-label="近 7 筆訓練摘要">
            <Metric label="完成" value={`${weeklyAudit.completed}/7`} />
            <Metric label="總時間" value={`${weeklyAudit.duration} 分`} />
            <Metric label="Zone 2" value={`${weeklyAudit.zone2} 分`} />
            <Metric label="最高疼痛" value={weeklyAudit.maxPain} />
          </div>
        </header>

        {setupBlocked && (
          <NoticePanel kind="warn" icon={<Lock size={18} />}>
            尚未設定 Supabase。請建立 `.env.local`，填入 Project URL 與 anon public key。
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
                <span>資料狀態：{statusLabel(dataStatus)}</span>
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
                <span>登入後才能寫入課表、儲存活動與回看歷史。</span>
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
              <h2>{dataStatus === 'schema-missing' ? '資料表不存在或 schema cache 未更新' : '資料庫讀取失敗'}</h2>
              <p>如果代碼是 PGRST205，請把 `supabase/schema.sql` 的完整內容貼到 Supabase SQL Editor 執行，不是貼檔案路徑。</p>
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
          <article className="status-card">
            <div className="section-heading compact">
              <span><TrendingUp size={18} /> 週稽核</span>
              <span className={weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? 'risk high' : 'risk ok'}>
                {weeklyAudit.maxPain >= 4 || weeklyAudit.avgFatigue >= 7 ? '注意恢復' : '可維持'}
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
        </section>

        <section className="feed-grid">
          <article className="panel" id="feed">
            <div className="section-heading">
              <span><Activity size={18} /> 近期活動</span>
              <span className="muted">{logs.length ? `共 ${logs.length} 筆，可展開回看` : '尚無活動紀錄'}</span>
            </div>
            <ActivityFeed logs={logs} segmentsByLog={segmentsByLog} />
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
              <EmptyState title="尚無訓練紀錄" text="展開課表填入一次訓練後，這裡會顯示負荷與疼痛趨勢。" />
            )}
          </article>

          <article className="panel chart-panel">
            <div className="section-heading"><span>Zone 2 時間</span></div>
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
              <EmptyState title="尚無 Zone 資料" text="把 Amazfit / Zepp 的總體 Zone 分鐘填入，就能追蹤低強度基礎量。" />
            )}
          </article>
        </section>

        <section className="panel" id="plan">
          <div className="section-heading">
            <span><CalendarDays size={18} /> 12 週課表</span>
            <span className="muted">點開任一課表即可填寫當次運動數據。</span>
          </div>
          <div className="plan-list">
            {activePlan.map((workout) => (
              <WorkoutAccordion
                key={workout.id}
                workout={workout}
                logs={logsByWorkout.get(workout.id) ?? []}
                segmentsByLog={segmentsByLog}
                canSubmit={Boolean(session && supabase && dataStatus !== 'schema-missing')}
                onSubmit={submitLog}
              />
            ))}
          </div>
        </section>

        <section className="panel" id="routes">
          <div className="section-heading">
            <span><MapPinned size={18} /> 越野路線</span>
            <span className="muted">台北 / 桃園，優先大眾運輸可達。</span>
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

function WorkoutAccordion({
  workout,
  logs,
  segmentsByLog,
  canSubmit,
  onSubmit,
}: {
  workout: PlannedWorkout
  logs: WorkoutLog[]
  segmentsByLog: Map<string, WorkoutSegment[]>
  canSubmit: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>, workout: PlannedWorkout | null) => Promise<void>
}) {
  const latestLog = logs[0]

  return (
    <details className="workout-accordion">
      <summary>
        <span className={`type-chip ${workout.priority}`}>{priorityLabels[workout.priority]}</span>
        <span className="summary-main">
          <strong>W{workout.week_number} {dayLabels[workout.day_label] ?? workout.day_label} · {workout.title}</strong>
          <small>{workoutTypeLabels[workout.workout_type]} · {workout.duration_min ?? '-'} 分 · {workout.intensity_target}</small>
        </span>
        <span className={latestLog ? 'log-state done' : 'log-state'}>{latestLog ? '已填' : '待填'}</span>
      </summary>
      <div className="accordion-body">
        <div className="prescription">
          <strong>課表內容</strong>
          <p>{workout.prescription}</p>
        </div>
        {logs.length > 0 && (
          <div className="log-history compact-history">
            <strong>此課表歷史紀錄</strong>
            {logs.map((log) => (
              <LogDetail key={log.id ?? `${log.workout_date}-${log.duration_min}`} log={log} segments={log.id ? segmentsByLog.get(log.id) ?? [] : []} />
            ))}
          </div>
        )}
        <WorkoutLogForm workout={workout} canSubmit={canSubmit} onSubmit={onSubmit} />
      </div>
    </details>
  )
}

function WorkoutLogForm({
  workout,
  canSubmit,
  onSubmit,
}: {
  workout: PlannedWorkout
  canSubmit: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>, workout: PlannedWorkout | null) => Promise<void>
}) {
  return (
    <form className="log-form" onSubmit={(event) => onSubmit(event, workout)}>
      <fieldset>
        <legend>總體資料</legend>
        <Field label="日期" name="workout_date" type="date" defaultValue={todayIso} />
        <Field label="總時間（分鐘）" name="duration_min" type="number" defaultValue={String(workout.duration_min ?? 45)} min="0" />
        <Field label="總距離（km）" name="distance_km" type="number" step="0.01" min="0" />
        <Field label="平均心率" name="avg_hr" type="number" />
        <Field label="最高心率" name="max_hr" type="number" />
        <Field label="RPE" name="rpe" type="number" min="1" max="10" defaultValue="4" />
        <Field label="疲勞 1-10" name="fatigue" type="number" min="1" max="10" defaultValue="3" />
        <Field label="疼痛 0-10" name="pain" type="number" min="0" max="10" defaultValue="0" />
        <Field label="睡眠時數" name="sleep_hours" type="number" step="0.1" min="0" max="24" />
        <Field label="靜息心率" name="resting_hr" type="number" />
        <Field label="Z1 分鐘" name="zone1_min" type="number" defaultValue="0" min="0" />
        <Field label="Z2 分鐘" name="zone2_min" type="number" defaultValue="0" min="0" />
        <Field label="Z3 分鐘" name="zone3_min" type="number" defaultValue="0" min="0" />
        <Field label="Z4 分鐘" name="zone4_min" type="number" defaultValue="0" min="0" />
        <Field label="Z5 分鐘" name="zone5_min" type="number" defaultValue="0" min="0" />
        <Field label="總爬升（m）" name="elevation_gain_m" type="number" min="0" />
      </fieldset>

      <fieldset>
        <legend>分段 / 分組資料（選填）</legend>
        <p className="form-hint">Amazfit 分段常見欄位：距離、配速、本段用時、心率、步頻、步幅、消耗。沒有就留空。</p>
        <div className="segment-table">
          <div className="segment-head">
            <span>段</span>
            <span>距離 km</span>
            <span>配速</span>
            <span>用時</span>
            <span>心率</span>
            <span>步頻</span>
            <span>步幅</span>
            <span>消耗</span>
          </div>
          {segmentRows.map((index) => (
            <div className="segment-row" key={index}>
              <span>{index}</span>
              <input aria-label={`第 ${index} 段距離`} name={`seg_${index}_distance`} type="number" step="0.01" min="0" />
              <input aria-label={`第 ${index} 段配速`} name={`seg_${index}_pace`} placeholder="5:20" />
              <input aria-label={`第 ${index} 段用時`} name={`seg_${index}_duration`} placeholder="10:00" />
              <input aria-label={`第 ${index} 段心率`} name={`seg_${index}_hr`} type="number" />
              <input aria-label={`第 ${index} 段步頻`} name={`seg_${index}_cadence`} type="number" />
              <input aria-label={`第 ${index} 段步幅`} name={`seg_${index}_stride`} type="number" step="0.01" />
              <input aria-label={`第 ${index} 段消耗`} name={`seg_${index}_calories`} type="number" />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>補充</legend>
        <Field label="活動連結" name="activity_link" type="url" />
        <Field label="GPX 檔名 / 連結" name="gpx_file" type="text" />
        <label className="wide">
          備註
          <textarea name="notes" rows={3} placeholder="例如：分組感受、路況、腿部狀態、是否需要調整下週課表。" />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" name="completed" defaultChecked /> 已完成
        </label>
      </fieldset>

      <button type="submit" disabled={!canSubmit}>
        儲存這次訓練
      </button>
    </form>
  )
}

function ActivityFeed({
  logs,
  segmentsByLog,
}: {
  logs: WorkoutLog[]
  segmentsByLog: Map<string, WorkoutSegment[]>
}) {
  if (!logs.length) {
    return <EmptyState title="尚無活動" text="登入並展開課表填寫後，活動會保留在這裡，明天也能回看。" />
  }

  return (
    <div className="activity-feed">
      {logs.map((log) => (
        <details className="activity-item" key={log.id ?? `${log.workout_date}-${log.duration_min}`}>
          <summary>
            <div className="activity-avatar">跑</div>
            <span className="summary-main">
              <strong>{log.workout_date}</strong>
              <small>{log.distance_km ?? '-'} km · {log.duration_min} 分 · RPE {log.rpe} · 均心 {log.avg_hr ?? '-'}</small>
            </span>
            <span className="log-state done">查看</span>
          </summary>
          <LogDetail log={log} segments={log.id ? segmentsByLog.get(log.id) ?? [] : []} />
        </details>
      ))}
    </div>
  )
}

function LogDetail({ log, segments }: { log: WorkoutLog; segments: WorkoutSegment[] }) {
  return (
    <div className="log-detail">
      <div className="metric-strip compact">
        <Metric label="距離" value={`${log.distance_km ?? '-'} km`} />
        <Metric label="時間" value={`${log.duration_min} 分`} />
        <Metric label="平均心率" value={log.avg_hr ?? '-'} />
        <Metric label="最高心率" value={log.max_hr ?? '-'} />
        <Metric label="RPE" value={log.rpe} />
        <Metric label="疲勞" value={log.fatigue} />
        <Metric label="疼痛" value={log.pain} />
        <Metric label="爬升" value={`${log.elevation_gain_m ?? '-'} m`} />
      </div>
      <div className="zone-line">
        Z1 {log.zone1_min} 分 · Z2 {log.zone2_min} 分 · Z3 {log.zone3_min} 分 · Z4 {log.zone4_min} 分 · Z5 {log.zone5_min} 分
      </div>
      {segments.length > 0 && (
        <div className="saved-segments">
          <strong>分段資料</strong>
          {segments.map((segment) => (
            <div className="saved-segment" key={segment.id ?? `${segment.workout_log_id}-${segment.segment_index}`}>
              <span>#{segment.segment_index}</span>
              <span>{segment.distance_km ?? '-'} km</span>
              <span>{segment.pace ?? '-'}</span>
              <span>{segment.duration_text ?? '-'}</span>
              <span>HR {segment.avg_hr ?? '-'}</span>
              <span>步頻 {segment.cadence_spm ?? '-'}</span>
              <span>步幅 {segment.stride_m ?? '-'}</span>
              <span>{segment.calories ?? '-'} kcal</span>
            </div>
          ))}
        </div>
      )}
      {log.notes && <p className="log-notes">{log.notes}</p>}
    </div>
  )
}

function buildSegmentsFromForm(form: FormData, userId: string, workoutLogId: string): Omit<WorkoutSegment, 'id' | 'created_at'>[] {
  return segmentRows.flatMap((index) => {
    const distance = toNumberOrNull(form.get(`seg_${index}_distance`))
    const pace = String(form.get(`seg_${index}_pace`) || '').trim()
    const duration = String(form.get(`seg_${index}_duration`) || '').trim()
    const avgHr = toNumberOrNull(form.get(`seg_${index}_hr`))
    const cadence = toNumberOrNull(form.get(`seg_${index}_cadence`))
    const stride = toNumberOrNull(form.get(`seg_${index}_stride`))
    const calories = toNumberOrNull(form.get(`seg_${index}_calories`))

    const hasAnyValue = [distance, pace, duration, avgHr, cadence, stride, calories].some(
      (value) => value !== null && value !== '',
    )

    if (!hasAnyValue) return []

    return [
      {
        user_id: userId,
        workout_log_id: workoutLogId,
        segment_index: index,
        distance_km: distance,
        pace: pace || null,
        duration_text: duration || null,
        avg_hr: avgHr,
        cadence_spm: cadence,
        stride_m: stride,
        calories,
      },
    ]
  })
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
      return '已同步'
    case 'schema-missing':
      return '缺少資料表'
    case 'auth-or-rls':
      return '權限需確認'
    case 'unknown-error':
      return '讀取異常'
    default:
      return '尚未讀取'
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
