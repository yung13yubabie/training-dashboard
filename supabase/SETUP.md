# Supabase 設定

## 1. 建立 Project

在 Supabase 建立 project，保留以下公開設定：

- Project URL
- anon public key

不要把 service role key 放進 GitHub Pages、`.env.local` 或任何前端程式碼。

## 2. 建立 / 更新資料庫 Schema

到 Supabase SQL Editor，開啟本專案的 `supabase/schema.sql`，複製整份 SQL 內容後執行。

不要在 SQL Editor 直接輸入這種路徑：

```text
training-dashboard/supabase/schema.sql
```

SQL Editor 需要的是 SQL 內容，不是檔案路徑。可以用 PowerShell 複製：

```powershell
Get-Content C:\Users\LIN\training-dashboard\supabase\schema.sql -Raw | Set-Clipboard
```

這份 schema 會建立或更新：

- `plan_versions`
- `planned_workouts`
- `workout_logs`
- `workout_segments`
- `trail_routes`

目前規則：

- `workout_logs` 一位使用者一天只能保留一筆。
- 同一天再次儲存應更新既有紀錄，不應新增重複資料。
- `workout_segments` 用於選填分段 / 分組資料。
- Amazfit / Zepp 的裝置數據欄位已放寬限制，避免真實裝置值被過窄的 check constraint 擋下。

如果你遇到 `23514`、`22P02`、`PGRST204` 或 `PGRST205`，先重跑最新版 `schema.sql`，再重新登入測試。

## 3. Auth Redirect

到 Supabase Auth URL settings 加入：

```text
http://127.0.0.1:5173
http://127.0.0.1:5173/
http://localhost:5173
http://localhost:5173/
https://yung13yubabie.github.io/training-dashboard/
```

## 4. 本機 `.env.local`

在 `C:\Users\LIN\training-dashboard` 建立 `.env.local`：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=http://127.0.0.1:5173
```

GitHub Pages 使用 GitHub Secrets：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5. 本機啟動

```powershell
cd C:\Users\LIN\training-dashboard
npm run dev -- --host 127.0.0.1 --port 5173
```

如果 5173 被占用，Vite 會改用其他 port。請以終端機顯示的 Local URL 為準。

## 6. 初次使用流程

1. 開啟網站。
2. 用 Magic Link 登入。
3. 按「匯入 Supabase」建立 12 週課表。
4. 到近期活動或 12 週課表展開某一天，填寫訓練資料並儲存。
5. 重新整理後確認昨天或指定日期的紀錄仍存在。

## 7. 常見錯誤

### `PGRST205` 或 `PGRST204`

Supabase REST schema cache 找不到表或欄位。處理方式：

1. 到 Supabase SQL Editor。
2. 複製最新版 `supabase/schema.sql` 的完整內容。
3. 執行 SQL。
4. 等 10-30 秒。
5. 重新登入網站再測試。

`schema.sql` 末尾包含：

```sql
notify pgrst, 'reload schema';
```

這會通知 PostgREST 重載 schema cache。

### `23514`

資料庫 check constraint 擋下某個數值。最新版 schema 已放寬裝置數據限制，請先重跑 `schema.sql`。

### `22P02`

欄位格式錯誤，常見原因是整數欄位填入小數或文字。前端目前會把整數型欄位四捨五入後再送出。

### `23505`

同一天已存在一筆紀錄。正常情況下前端會更新既有紀錄；如果仍出現，重新整理後再編輯該日紀錄，並保留錯誤訊息給下一輪除錯。
