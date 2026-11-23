import "server-only";

import { prisma } from "@/server/db";
import {
  calculateExpiresAt,
  calculateIdleThreshold,
  getSessionStatus,
  shouldTouchSession,
} from "./session-expiry";
import { generateSessionToken, hashSessionToken } from "./token";

// トークンの扱い：Cookie には生のトークン、DB の sessions.id にはそのハッシュを入れる。
// 外から受け取ったトークンは、DB に問い合わせる前に必ず hashSessionToken を通す。

/**
 * セッションを作成し、Cookie に入れるトークンを返す。
 * 生のトークンを知っているのは、この戻り値を受け取って Cookie に書き込む呼び出し元だけ。
 * あわせて、同じユーザーの期限切れセッションを削除する（Cookie を失った端末の行が残り続けないように）。
 */
export async function createSession(userId: string) {
  const now = new Date();
  await deleteExpiredSessions(userId, now);

  const token = generateSessionToken();
  const session = await prisma.session.create({
    data: {
      id: hashSessionToken(token),
      userId,
      expiresAt: calculateExpiresAt(now),
      lastSeenAt: now,
    },
  });

  return { token, session };
}

/**
 * Cookie のトークンからセッションとユーザーを引く。無効なら null。
 *
 * Firebase では ID トークン（JWT）の署名を検証すれば DB を見ずにユーザーが分かるが、
 * このトークンには情報が入っていないため、毎回 DB を引いてユーザーを特定する。
 * その代わり、DB の行を消せばその瞬間にセッションを無効にできる。
 */
export async function validateSession(token: string) {
  // ハッシュで検索するため、文字列の比較はDBのインデックス検索になる。
  // 生のトークンを1文字ずつ比較しないので、比較にかかる時間からトークンを推測される心配（タイミング攻撃）もない
  const session = await prisma.session.findUnique({
    where: { id: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  const now = new Date();
  if (getSessionStatus(session, now) !== "valid") {
    // 期限切れの行はその場で削除する。同時に別のリクエストが削除していても失敗しないよう deleteMany を使う
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  // アクセスがあったことを記録してアイドル期限を延ばす。書き込みは最大1時間に1回に抑える
  if (shouldTouchSession(session, now)) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });
    session.lastSeenAt = now;
  }

  const { user, ...rest } = session;
  return { session: rest, user };
}

/**
 * セッションを削除する。行がなくてもエラーにしない（ログアウトを何度押しても成功させる）。
 */
export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { id: hashSessionToken(token) } });
}

/**
 * ユーザーのセッションをすべて削除する（全端末からログアウト）。
 * Cookie を失った端末や、なくした端末に残ったセッションも含めて、その瞬間に無効になる。
 */
export async function deleteUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * ユーザーの期限切れセッション（絶対期限・アイドル期限のどちらか）をまとめて削除する。
 */
async function deleteExpiredSessions(userId: string, now: Date) {
  await prisma.session.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lte: now } }, { lastSeenAt: { lte: calculateIdleThreshold(now) } }],
    },
  });
}
