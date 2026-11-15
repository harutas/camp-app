import "server-only";

// セッションの期限に関する判定。DB に触れない純粋関数にして、現在時刻を引数で受け取る（テストで時刻を自由に指定できる）

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 絶対期限：作成からこの時間が経つと、使われ続けていても失効する */
export const SESSION_ABSOLUTE_TTL_MS = 30 * DAY_MS;

/** アイドル期限：最後のアクセスからこの時間が経つと失効する */
export const SESSION_IDLE_TTL_MS = 7 * DAY_MS;

/**
 * last_seen_at を更新する間隔。毎リクエストで書き込むと DB の負荷が増えるため、
 * 前回の更新からこの時間が経ったときだけ更新する（アイドル期限の判定はこの分だけ誤差が出るが、7日に対して1時間なので許容する）
 */
export const SESSION_TOUCH_INTERVAL_MS = HOUR_MS;

type SessionTimestamps = {
  expiresAt: Date;
  lastSeenAt: Date;
};

export type SessionStatus = "valid" | "expired" | "idle";

/** 新しいセッションの絶対期限を求める */
export function calculateExpiresAt(now: Date): Date {
  return new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
}

/** アイドル期限切れとみなす last_seen_at の境界。これ以前に最後のアクセスがあったセッションは失効 */
export function calculateIdleThreshold(now: Date): Date {
  return new Date(now.getTime() - SESSION_IDLE_TTL_MS);
}

/** セッションが有効か、どちらの期限で失効したかを判定する */
export function getSessionStatus(session: SessionTimestamps, now: Date): SessionStatus {
  if (now.getTime() >= session.expiresAt.getTime()) {
    return "expired";
  }
  if (session.lastSeenAt.getTime() <= calculateIdleThreshold(now).getTime()) {
    return "idle";
  }
  return "valid";
}

/** last_seen_at を更新すべきか（前回の更新から一定時間が経っているか）を判定する */
export function shouldTouchSession(session: SessionTimestamps, now: Date): boolean {
  return now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;
}
