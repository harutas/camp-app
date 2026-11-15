import "server-only";

import { prisma } from "@/server/db";
import { generateSessionToken } from "./token";

// セッションの絶対期限。作成から30日で、利用状況に関係なく失効させる
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * セッションを作成し、Cookie に入れるトークンを返す。
 */
export async function createSession(userId: string) {
  const token = generateSessionToken();
  const now = new Date();

  const session = await prisma.session.create({
    data: {
      id: token,
      userId,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS),
      lastSeenAt: now,
    },
  });

  return { token, session };
}

/**
 * Cookie のトークンからセッションとユーザーを引く。見つからなければ null。
 *
 * Firebase では ID トークン（JWT）の署名を検証すれば DB を見ずにユーザーが分かるが、
 * このトークンには情報が入っていないため、毎回 DB を引いてユーザーを特定する。
 */
export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  const { user, ...rest } = session;
  return { session: rest, user };
}
