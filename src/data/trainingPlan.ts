import type { PlannedWorkout, WorkoutType } from '../types'

const weekLoad = [1, 1.05, 1.1, 0.82, 1.12, 1.18, 1.2, 0.86, 1.22, 1.25, 0.95, 0.8]

const weekThemes = [
  '基準校準與節奏建立',
  '有氧基礎穩定',
  '最大攝氧量導入',
  '恢復週與節奏控制',
  'VO2max 容量擴張',
  '法特萊克變速刺激',
  '長跑耐力堆疊',
  '5K / 10K 檢核週',
  '高峰負荷週',
  '越野耐力整合',
  '銳化與速度維持',
  '減量與測驗準備',
]

const round5 = (value: number) => Math.round(value / 5) * 5

const createWorkout = (
  week: number,
  day_label: string,
  workout_type: WorkoutType,
  title: string,
  prescription: string,
  intensity_target: string,
  duration_min: number,
  priority: PlannedWorkout['priority'] = 'normal',
  elevation_gain_m: number | null = null,
  route_id: string | null = null,
): PlannedWorkout => ({
  id: `w${week}-${day_label.toLowerCase()}`,
  week_number: week,
  day_label,
  workout_type,
  title,
  prescription,
  intensity_target,
  duration_min,
  distance_km: null,
  elevation_gain_m,
  route_id,
  priority,
})

export const buildTrainingPlan = (): PlannedWorkout[] =>
  weekThemes.flatMap((theme, weekIndex) => {
    const week = weekIndex + 1
    const load = weekLoad[weekIndex]
    const isDeload = [4, 8, 12].includes(week)
    const zone2Duration = round5((45 + Math.min(week, 8) * 2) * load)
    const longDuration = round5((isDeload ? 80 : 90 + week * 4) * load)
    const vo2Reps = 4 + Math.floor(week / 3)
    const useFartlek = [3, 6, 9, 11].includes(week)

    return [
      createWorkout(
        week,
        'Tue',
        week === 1 ? 'calibration' : isDeload ? 'threshold' : 'vo2max',
        week === 1 ? '20 分鐘控制強度校準' : isDeload ? '節奏跑控制' : '最大攝氧量間歇',
        week === 1
          ? '熱身 15 分鐘，接 20 分鐘 RPE 7 穩定跑，記錄平均心率、配速與體感，收操 10 分鐘。'
          : isDeload
            ? '熱身 15 分鐘，2 x 8 分鐘 RPE 7，組間慢跑 3 分鐘，收操放鬆。'
            : `熱身 15 分鐘，${vo2Reps} x 3 分鐘 RPE 8-9，組間慢跑恢復，收操 10 分鐘。`,
        week === 1 ? 'RPE 7，作為後續校準' : '主段 RPE 8-9，不衝刺，動作放鬆',
        week === 1 ? 50 : round5(50 + Math.min(week, 8)),
        'key',
      ),
      createWorkout(
        week,
        'Wed',
        'zone2',
        'Zone 2 有氧跑',
        '全程可對話，維持心率 Zone 2；若前一天疲勞高，縮短 10-15 分鐘。',
        '心率 Zone 2，RPE 3-4',
        zone2Duration,
      ),
      createWorkout(
        week,
        'Thu',
        useFartlek ? 'fartlek' : 'neuromuscular',
        useFartlek ? '調整式法特萊克跑' : '加速跑與放鬆速度',
        useFartlek
          ? '熱身 15 分鐘，接 8-12 組 1 分鐘快 / 1 分鐘慢；快段 RPE 7-8，慢段完全放鬆，最後收操。'
          : isDeload
            ? '輕鬆跑 35 分鐘，加入 6 x 12 秒放鬆加速，完整恢復。'
            : '輕鬆跑 45 分鐘，加入 8 x 15 秒放鬆加速，快但不硬撐。',
        useFartlek ? '快慢交替，保留餘裕' : '快但順，不要跑到動作變形',
        useFartlek ? 50 : isDeload ? 40 : 50,
        useFartlek ? 'key' : 'normal',
      ),
      createWorkout(
        week,
        'Sat',
        week % 3 === 0 && !isDeload ? 'threshold' : 'zone2',
        week % 3 === 0 && !isDeload ? '穩定耐力分段' : '輕鬆有氧支撐',
        week % 3 === 0 && !isDeload
          ? '熱身後 3 x 8 分鐘 RPE 6-7，組間慢跑 3 分鐘；不要進紅區。'
          : '輕鬆跑或低衝擊交叉訓練。若平日漏課，可把 Tue/Thu 的品質課移到此日早上。',
        week % 3 === 0 && !isDeload ? 'RPE 6-7，不進紅區' : 'Zone 1-2',
        isDeload ? 40 : 55,
        week % 3 === 0 && !isDeload ? 'key' : 'low',
      ),
      createWorkout(
        week,
        'Sun',
        'trail',
        `${theme}越野長跑`,
        isDeload
          ? '低強度越野或健行跑，控制下坡衝擊，必要時改平路長走。'
          : '越野長跑，長坡上限 RPE 6。若週六已補品質課，週日只保留 Zone 1-2 或縮短 20%。',
        'RPE 3-5，長坡上限 RPE 6',
        longDuration,
        'key',
        isDeload ? 200 : 300 + week * 25,
        week < 4 ? 'jiantan-easy' : week < 8 ? 'junjiianyan-loop' : 'taipei-grand-trail-section-5',
      ),
    ]
  })
