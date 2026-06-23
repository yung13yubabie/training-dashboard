# Supabase 設定

## 1. 建立 Project

建立 Supabase project 後，複製：

- Project URL
- anon public key

不要複製或暴露 service role key。這是純前端專案，service role key 不能放進 `.env.local`。

## 2. 建立資料表

打開 Supabase SQL Editor，完整執行：

```text
supabase/schema.sql
```

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

在 `C:\Users\LIN\training-dashboard` 從 `.env.example` 建立 `.env.local`，填入：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=http://127.0.0.1:5173
```

## 5. 本機啟動

請在專案目錄執行：

```powershell
cd C:\Users\LIN\training-dashboard
npm run dev -- --host 127.0.0.1 --port 5173
```

如果你在 `C:\Users\LIN` 執行後看到 `Missing script: "dev"`，代表當下資料夾不是 Vite app。請先切到 `training-dashboard`，或使用根目錄已新增的轉發 script。

## 6. 寫入初始課表

Magic Link 登入後，在網站按「寫入 Supabase」，把助理提供的 12 週課表寫入你的帳號。

## 7. 驗證

請確認：

- Magic Link 可以寄出並回到網站。
- 網站顯示已登入 session。
- 「寫入 Supabase」會建立 planned workouts。
- 「儲存回饋」會建立 workout log。
- JSON/CSV 匯出符合目前資料。

## 常見錯誤

### `PGRST205 Could not find the table ... in the schema cache`

這代表目前 Supabase project 的 PostgREST API 找不到資料表。通常原因是：

- 還沒有在 SQL Editor 執行 `supabase/schema.sql`
- SQL 執行中途失敗
- schema 剛建立，但 API schema cache 尚未刷新

處理方式：

1. 到 Supabase SQL Editor。
2. 重新完整執行 `supabase/schema.sql`。
3. 等 10-30 秒。
4. 回到網站按「重新整理」。

`schema.sql` 已設計成可重複執行，並在最後包含 `notify pgrst, 'reload schema';` 來刷新 schema cache。
