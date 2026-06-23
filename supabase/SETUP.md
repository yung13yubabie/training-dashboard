# Supabase 設定

## 1. 建立 Project

建立 Supabase project 後保留：

- Project URL
- anon public key

不要把 service role key 放進前端、GitHub Pages、`.env.local` 或任何會被瀏覽器讀到的地方。

## 2. 建立資料表

到 Supabase SQL Editor，貼上 `supabase/schema.sql` 的完整檔案內容並執行。

不要只貼這個路徑：

```text
training-dashboard/supabase/schema.sql
```

SQL Editor 需要的是 SQL 內容本身。第一行應該類似：

```sql
create extension if not exists pgcrypto;
```

可用 PowerShell 複製完整 SQL：

```powershell
Get-Content C:\Users\LIN\training-dashboard\supabase\schema.sql -Raw | Set-Clipboard
```

目前 schema 會建立：

- `plan_versions`
- `planned_workouts`
- `workout_logs`
- `workout_segments`
- `trail_routes`

`workout_segments` 用來保存每次運動的分段 / 分組資料，例如距離、配速、本段用時、心率、步頻、步幅與消耗。

## 3. 設定 Auth Redirect

在 Supabase Auth URL settings 加入：

```text
http://127.0.0.1:5173
http://127.0.0.1:5173/
http://localhost:5173
http://localhost:5173/
https://yung13yubabie.github.io/training-dashboard/
```

## 4. 建立 `.env.local`

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

如果 5173 被佔用，Vite 可能會自動改用 5174。請看終端輸出的 Local URL。

## 6. 初始化課表

1. 開啟網站。
2. 用 Magic Link 登入。
3. 按「寫入 Supabase」。
4. 重新整理後確認 12 週課表已從雲端讀取。

## 7. 常見錯誤

### `PGRST205 Could not find the table ... in the schema cache`

代表 Supabase REST API 找不到資料表。處理方式：

1. 到 Supabase SQL Editor。
2. 貼上 `supabase/schema.sql` 的完整內容，不是貼檔案路徑。
3. 執行成功後等 10-30 秒。
4. 回網站按「重新整理」或重新登入。

`schema.sql` 結尾有：

```sql
notify pgrst, 'reload schema';
```

這會要求 PostgREST 重新載入 schema cache。
