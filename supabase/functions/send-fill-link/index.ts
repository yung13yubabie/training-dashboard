type SendFillLinkRequest = {
  to?: string
  fillUrl?: string
  workoutDate?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')

  if (!resendApiKey || !fromEmail) {
    return json({ error: 'Email function is not configured' }, 500)
  }

  let payload: SendFillLinkRequest
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const to = payload.to?.trim() ?? ''
  const fillUrl = payload.fillUrl?.trim() ?? ''
  const workoutDate = payload.workoutDate?.trim() || '指定日期'

  if (!isValidEmail(to)) {
    return json({ error: 'Invalid recipient email' }, 400)
  }

  try {
    const parsedUrl = new URL(fillUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return json({ error: 'Invalid fill URL' }, 400)
    }
  } catch {
    return json({ error: 'Invalid fill URL' }, 400)
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <h1 style="font-size: 20px;">跑步訓練資料回填</h1>
      <p>請使用下方連結登入並回填 ${workoutDate} 的訓練紀錄。</p>
      <p><a href="${fillUrl}" style="display: inline-block; background: #fc4c02; color: #fff; padding: 10px 14px; text-decoration: none;">開啟回填表單</a></p>
      <p>如果按鈕無法開啟，請複製以下連結到瀏覽器：</p>
      <p>${fillUrl}</p>
    </div>
  `

  const text = [
    '跑步訓練資料回填',
    '',
    `請使用下方連結登入並回填 ${workoutDate} 的訓練紀錄。`,
    fillUrl,
    '',
    '如果連結無法點擊，請複製到瀏覽器開啟。',
  ].join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: `跑步訓練資料回填：${workoutDate}`,
      html,
      text,
      tags: [{ name: 'category', value: 'training_fill_link' }],
    }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    return json({ error: result.message ?? 'Email provider rejected the request' }, response.status)
  }

  return json({ ok: true, id: result.id ?? result.data?.id ?? null })
})
