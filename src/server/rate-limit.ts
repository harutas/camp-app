import "server-only";

import { prisma } from "@/server/db";
import { getRetryAfterSeconds, getWindowStart } from "@/server/rate-limit-window";

type RateLimitOptions = {
  /** 1つの窓で許可する回数 */
  limit: number;
  /** 窓の幅（ミリ秒） */
  windowMs: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * key の試行回数を1回数え、上限を超えていないかを返す。
 *
 * 「SELECT で今の回数を読む → 上限未満なら UPDATE で +1」と2回に分けると、
 * 同時に来たリクエストが同じ回数を読んでしまい、数え漏れが出る（上限を超えて通る）。
 * INSERT ... ON CONFLICT DO UPDATE を使うと、行の作成と +1 が1文で行われ、Postgres が行をロックして順番に処理するので、
 * 同時に来ても必ず1回ずつ数えられる。RETURNING で数えた後の値を受け取る。
 */
export async function consumeRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = getWindowStart(now, windowMs);

  // window_start は Prisma に合わせて timestamp(3)（タイムゾーンなし）に UTC で保存する。
  // Date をそのまま渡すと、DB の接続のタイムゾーン設定によって解釈がずれる可能性があるため、
  // エポックミリ秒から timestamptz を作り、UTC のタイムゾーンなしの値に変換して入れる。
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limits" ("key", "window_start", "count")
    VALUES (${key}, to_timestamp(${windowStart.getTime()}::double precision / 1000) AT TIME ZONE 'utc', 1)
    ON CONFLICT ("key", "window_start") DO UPDATE SET "count" = "rate_limits"."count" + 1
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  if (count > limit) {
    return { allowed: false, retryAfterSeconds: getRetryAfterSeconds(now, windowMs) };
  }
  return { allowed: true };
}

/**
 * リクエスト元の IP アドレス。
 *
 * x-forwarded-for は本来クライアントが自由に付けられるヘッダーで、そのままでは信用できない。
 * Vercel はクライアントが送ってきた x-forwarded-for を捨てて、実際の接続元 IP で上書きするので、
 * Vercel 上で動いている限りは先頭の値を接続元として扱える（別のプロキシを前に置く場合は見直す）。
 * ローカル開発などヘッダーが無いときは "unknown" にまとめる（全員が同じ枠を使うだけで、困ることはない）。
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}
