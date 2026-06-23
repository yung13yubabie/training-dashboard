# 跑步訓練儀表板

給個人使用的跑步訓練網站：由助理提供 12 週課表，你每天填訓練回饋，之後用週稽核與 4 週調整來修正課表。

## 技術

- Vite + React + TypeScript
- Supabase Auth Magic Link
- Supabase Postgres + RLS
- 目標部署到 GitHub Pages

## 本機啟動

最穩定的方式是在專案目錄執行：

```powershell
cd C:\Users\LIN\training-dashboard
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

如果你人在 `C:\Users\LIN`，也可以直接跑：

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

根目錄的 `package.json` 會把指令轉到 `training-dashboard`。

如果看到 `Missing script: "dev"`，代表你在沒有轉發 script 的資料夾執行了 `npm run dev`。請先 `cd C:\Users\LIN\training-dashboard`。

## Supabase 設定

1. 建立 Supabase project。
2. 到 SQL Editor 執行 `supabase/schema.sql`。
3. 複製 `.env.example` 成 `.env.local`。
4. 填入：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=http://127.0.0.1:5173
```

5. 到 Supabase Auth URL settings 加入：

```text
http://127.0.0.1:5173
http://127.0.0.1:5173/
http://localhost:5173
http://localhost:5173/
https://yung13yubabie.github.io/training-dashboard/
```

6. 重新啟動網站，使用 Magic Link 登入，按「寫入 Supabase」建立 12 週課表。

## 安全提醒

- 不要把 Supabase service role key 放進這個專案。
- 前端只能使用 anon public key。
- 資料表使用 `auth.uid()` 搭配 RLS，只能讀寫自己的資料。
- GitHub Pages 正式網址是 `https://yung13yubabie.github.io/training-dashboard/`。

## 稽核流程

你每天填回饋。要我稽核時，可以從網站匯出 JSON/CSV，或提供 Supabase 匯出的資料。週稽核重點是完成率、疲勞、疼痛、Zone 2 量與高強度分鐘數。
