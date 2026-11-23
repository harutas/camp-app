-- 期限切れデータを定期的に削除する pg_cron ジョブ
--
-- なぜ必要か：
--   セッションの行は「ログアウト」「期限切れのセッションでアクセス」「同じユーザーの再ログイン」のときにしか消えない。
--   Cookie を失った端末（ブラウザのデータ削除・機種変更など）の行は誰もアクセスしないので、ずっと残る。
--   それを DB の中で定期的に掃除する。アプリ側の API や Vercel Cron は不要。
--
-- なぜ Prisma のマイグレーションに入れないか：
--   `prisma migrate dev` は一時的なシャドウ DB でマイグレーションを試すが、そこでは pg_cron を有効にできず失敗するため。
--   このファイルは Supabase の SQL Editor で手動で実行する（開発用・本番用の両方のプロジェクトで）。
--
-- 適用手順：
--   1. Supabase ダッシュボード → Database → Extensions で「pg_cron」を有効にする
--   2. SQL Editor にこのファイルの中身を貼り付けて実行する
--   cron.schedule はジョブ名が同じなら上書きするので、何度実行しても同じ状態になる（冪等）。
--
-- 時刻について：
--   - pg_cron のスケジュールは UTC。「0 19 * * *」は毎日 04:00 JST
--   - sessions の expires_at / last_seen_at は Prisma が timestamp(3)（タイムゾーンなし）に UTC で保存している。
--     そのため now()（timestamptz）をそのまま比べず、`now() at time zone 'utc'` で UTC のタイムゾーンなしの値に変換してから比べる
--
-- 期限の基準は src/server/auth/session-expiry.ts と揃える（定数を変えたらここも変える）：
--   - 絶対期限：expires_at <= 現在時刻             （getSessionStatus の "expired"）
--   - アイドル期限：last_seen_at <= 現在時刻 - 7日  （getSessionStatus の "idle"）

-- 期限切れセッションの削除（毎日 04:00 JST）
select cron.schedule(
  'cleanup-expired-sessions',
  '0 19 * * *',
  $$
    delete from public.sessions
    where expires_at <= (now() at time zone 'utc')
       or last_seen_at <= (now() at time zone 'utc') - interval '7 days';
  $$
);

-- pg_cron の実行履歴の削除（毎日 04:10 JST）
-- cron.job_run_details にはジョブを実行するたびに 1 行増えるため、これも放っておくと増え続ける。
-- end_time は timestamptz なので now() とそのまま比べてよい
select cron.schedule(
  'cleanup-cron-history',
  '10 19 * * *',
  $$
    delete from cron.job_run_details
    where end_time < now() - interval '7 days';
  $$
);

-- レート制限の古いカウンターの削除（毎日 04:05 JST）
-- rate_limits は窓（現状は10分）ごとに行が増え、窓が過ぎた行は判定に使われない。
-- 窓の幅を将来広げても消しすぎないよう、余裕を持って1日より前の行を消す。
-- window_start は sessions と同じく timestamp(3)（タイムゾーンなし・UTC）なので UTC に変換した現在時刻と比べる
select cron.schedule(
  'cleanup-rate-limits',
  '5 19 * * *',
  $$
    delete from public.rate_limits
    where window_start < (now() at time zone 'utc') - interval '1 day';
  $$
);

-- 確認用のクエリ（必要なときに個別に実行する）：
--   登録されているジョブ：     select jobid, jobname, schedule, active from cron.job;
--   直近の実行結果：           select jobid, status, return_message, start_time, end_time
--                              from cron.job_run_details order by start_time desc limit 20;
--   ジョブを止める：           select cron.unschedule('cleanup-expired-sessions');
