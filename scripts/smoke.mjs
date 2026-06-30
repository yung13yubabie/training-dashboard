import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright-core'

const appUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const smokeUrl = `${appUrl}/?date=2026-07-02#plan`
const viewports = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]

const browserCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/opt/google/chrome/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function findBrowser() {
  for (const candidate of browserCandidates) {
    if (await fileExists(candidate)) return candidate
  }
  throw new Error('No Chrome or Edge executable found. Set CHROME_PATH to run smoke tests.')
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Retry until Vite finishes starting.
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for dev server at ${url}`)
}

function startDevServer() {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })

  child.once('exit', (code) => {
    if (code !== null && code !== 0) {
      process.stderr.write(output)
    }
  })

  return child
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function inspectViewport(browser, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const consoleErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto(smokeUrl, { waitUntil: 'networkidle' })

  const weekCount = await page.locator('.week-section').count()
  const openWeeks = await page.locator('.week-section[open]').count()
  const firstWorkout = page.locator('.workout-accordion').first()
  const workoutCount = await page.locator('.workout-accordion').count()

  assert(weekCount === 12, `Expected 12 week sections, found ${weekCount} at ${viewport.width}px`)
  assert(openWeeks === 1, `Expected exactly one open week, found ${openWeeks} at ${viewport.width}px`)
  assert(workoutCount > 0, `Expected workout accordions at ${viewport.width}px`)

  await firstWorkout.locator('summary').click()
  await firstWorkout.locator('.edit-actions button').first().click()

  const planEditVisible = await firstWorkout.locator('.plan-edit-panel').isVisible()
  const planEditInputs = await firstWorkout.locator('.plan-edit-panel input, .plan-edit-panel textarea, .plan-edit-panel select').count()
  const saveEditVisible = await firstWorkout.locator('.plan-save-button').isVisible()
  const moveVisible = await firstWorkout.locator('.move-panel button').isVisible()
  const remoteButtons = await page.locator('.remote-panel button').count()
  const remoteDateValue = await page.locator('.remote-panel input[type="date"]').inputValue()

  assert(planEditVisible, `Expected planned-workout edit panel to open at ${viewport.width}px`)
  assert(planEditInputs >= 9, `Expected planned-workout edit fields, found ${planEditInputs} at ${viewport.width}px`)
  assert(saveEditVisible, `Expected planned-workout save button at ${viewport.width}px`)
  assert(moveVisible, `Expected planned-workout move button at ${viewport.width}px`)
  assert(remoteButtons >= 2, `Expected remote fill fallback buttons at ${viewport.width}px`)
  assert(remoteDateValue === '2026-07-02', `Expected remote fill date query to apply, got ${remoteDateValue}`)
  assert(consoleErrors.length === 0, `Console errors at ${viewport.width}px:\n${consoleErrors.join('\n')}`)

  await context.close()

  return {
    viewport,
    weekCount,
    openWeeks,
    workoutCount,
    planEditInputs,
    remoteButtons,
    remoteDateValue,
  }
}

const devServer = startDevServer()

try {
  await waitForServer(appUrl)
  const executablePath = await findBrowser()
  const browser = await chromium.launch({ executablePath, headless: true })
  const results = []

  for (const viewport of viewports) {
    results.push(await inspectViewport(browser, viewport))
  }

  await browser.close()
  console.log(JSON.stringify({ ok: true, url: smokeUrl, results }, null, 2))
} finally {
  devServer.kill()
}
