import "server-only";

// レート制限の「窓」の計算。DB に触れない純粋関数にして、現在時刻を引数で受け取る（テストで時刻を自由に指定できる）
//
// 固定ウィンドウ方式：時間を windowMs ごとの区間（窓）に区切り、窓ごとに回数を数える。
// 例：10分の窓なら 12:00〜12:10、12:10〜12:20…。窓が変わると回数は 0 からやり直しになる。
// 実装が単純（1行の UPSERT で済む）な代わりに、窓の境目をまたぐと短時間に最大で上限の2倍まで通ってしまう。
// 家族用アプリのログイン API を総当たりから守る目的なら、その程度の誤差は許容できる。

/** now が属する窓の開始時刻（windowMs の倍数に切り捨てた時刻） */
export function getWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** 次の窓が始まるまでの秒数（Retry-After ヘッダー用）。0 秒にならないよう最低 1 秒にする */
export function getRetryAfterSeconds(now: Date, windowMs: number): number {
  const nextWindowStart = getWindowStart(now, windowMs).getTime() + windowMs;
  return Math.max(1, Math.ceil((nextWindowStart - now.getTime()) / 1000));
}
