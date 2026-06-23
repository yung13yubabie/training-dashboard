import type { PlannedWorkout } from '../types'

const weekdays = ['Tue', 'Wed', 'Thu', 'Sat', 'Sun']

const weekThemes = [
  '基準校準與節奏建立',
  '有氧基礎穩定',
  '最大攝氧量導入',
  '降載與 20 分鐘檢查',
  '建立閾值支撐',
  '最大攝氧量進展',
  '長距離越野耐力',
  '降載與 5K 控制檢查',
  '專項耐力',
  '高峰有氧刺激',
  '吸收與銳化',
  '最後檢查與交接',
]

const weekLoad = [1, 1.05, 1.1, 0.82, 1.12, 1.18, 1.2, 0.86, 1.22, 1.25, 0.95, 0.8]

const round5 = (value: number) => Math.round(value / 5) * 5

export const buildTrainingPlan = (): PlannedWorkout[] =>
  weekThemes.flatMap((theme, weekIndex) => {
    const week = weekIndex + 1
    const load = weekLoad[weekIndex]
    const isDeload = [4, 8, 12].includes(week)
    const longDuration = round5((isDeload ? 80 : 90 + week * 4) * load)
    const zone2Duration = round5((45 + Math.min(week, 8) * 2) * load)

    const workouts: PlannedWorkout[] = [
      {
        id: `w${week}-tue`,
        week_number: week,
        day_label: weekdays[0],
        workout_type: week === 1 ? 'calibration' : isDeload ? 'threshold' : 'vo2max',
        title:
          week === 1
            ? '20 分鐘控制強度校準'
            : isDeload
              ? '控制強度閾值檢查'
              : '最大攝氧量間歇',
        prescription:
          week === 1
            ? '輕鬆暖身 15 分鐘，接著 RPE 7 控制強度跑 20 分鐘，收操 10 分鐘。'
            : isDeload
              ? '暖身 15 分鐘，跑 2 x 8 分鐘 RPE 7，中間慢跑 3 分鐘，最後收操。'
              : `暖身 15 分鐘，跑 ${4 + Math.floor(week / 3)} x 3 分鐘 RPE 8-9，組間同時間慢跑恢復，最後收操。`,
        intensity_target:
          week === 1
            ? 'RPE 7，記錄平均心率與配速作為校準'
            : '主段 RPE 8-9，動作放鬆，不衝刺',
        duration_min: week === 1 ? 50 : round5(50 + Math.min(week, 8)),
        distance_km: null,
        elevation_gain_m: null,
        route_id: null,
        priority: 'key',
      },
      {
        id: `w${week}-wed`,
        week_number: week,
        day_label: weekdays[1],
        workout_type: 'zone2',
        title: 'Zone 2 有氧跑',
        prescription: '能講話的輕鬆跑。配速不要逞強，以心率與體感為主。',
        intensity_target: '心率 Zone 2，RPE 3-4',
        duration_min: zone2Duration,
        distance_km: null,
        elevation_gain_m: null,
        route_id: null,
        priority: 'normal',
      },
      {
        id: `w${week}-thu`,
        week_number: week,
        day_label: weekdays[2],
        workout_type: 'neuromuscular',
        title: '加速跑與放鬆速度',
        prescription: isDeload
          ? '輕鬆跑 35 分鐘，加 6 x 12 秒加速跑，走回完全恢復。'
          : '輕鬆跑 45 分鐘，加 8 x 15 秒加速跑或短坡衝，完全恢復。',
        intensity_target: '快但順，不要跑到動作變形',
        duration_min: isDeload ? 40 : 50,
        distance_km: null,
        elevation_gain_m: null,
        route_id: null,
        priority: 'normal',
      },
      {
        id: `w${week}-sat`,
        week_number: week,
        day_label: weekdays[3],
        workout_type: week % 3 === 0 && !isDeload ? 'threshold' : 'zone2',
        title: week % 3 === 0 && !isDeload ? '穩定耐力分段' : '輕鬆有氧支撐',
        prescription:
          week % 3 === 0 && !isDeload
            ? '暖身後跑 3 x 8 分鐘穩定強度 RPE 6-7，組間 3 分鐘輕鬆跑，最後收操。'
            : '輕鬆跑；如果疲勞偏高，可改騎車或步行。',
        intensity_target: week % 3 === 0 && !isDeload ? 'RPE 6-7，不進紅區' : 'Zone 1-2',
        duration_min: isDeload ? 40 : 55,
        distance_km: null,
        elevation_gain_m: null,
        route_id: null,
        priority: week % 3 === 0 && !isDeload ? 'key' : 'low',
      },
      {
        id: `w${week}-sun`,
        week_number: week,
        day_label: weekdays[4],
        workout_type: 'trail',
        title: `${theme}越野長跑`,
        prescription: isDeload
          ? '較短越野或平路長跑。爬坡可健行，全程保持輕鬆。'
          : '越野長跑，可跑走交替。大多時間維持有氧，恢復好才短暫推坡。',
        intensity_target: 'RPE 3-5，長坡上限 RPE 6',
        duration_min: longDuration,
        distance_km: null,
        elevation_gain_m: isDeload ? 200 : 300 + week * 25,
        route_id: week < 4 ? 'jiantan-easy' : week < 8 ? 'junjiianyan-loop' : 'taipei-grand-trail-section-5',
        priority: 'key',
      },
    ]

    return workouts
  })
