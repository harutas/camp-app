import "server-only";

import { cache } from "react";
import { prisma } from "@/server/db";
import { getSessionToken } from "./cookie";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { validateSession } from "./session";

// 保護が必要な処理（Server Component / Server Action / Route Handler）は、
// 必ずその処理の中でここのガードを呼ぶ。middleware や画面の表示条件だけに頼らない。

/**
 * 1回のリクエストの中では、セッションの確認を1回だけにする。
 * ページとその中の複数の関数がそれぞれ requireSession() を呼んでも、DB を引くのは最初の1回だけ。
 */
const getSession = cache(async () => {
  const token = await getSessionToken();
  return token ? validateSession(token) : null;
});

/**
 * ログイン中のユーザーを返す。ログインしていなければ UnauthorizedError。
 */
export async function requireSession() {
  const result = await getSession();
  if (!result) {
    throw new UnauthorizedError();
  }
  return result;
}

/**
 * ログイン中のユーザーが、指定したグループのメンバーであることを確かめる。メンバーでなければ ForbiddenError。
 *
 * groupId は URL やフォームなど外から渡ってくる値なので、「その ID のグループが存在するか」ではなく
 * 「ログイン中のユーザーがそのグループに所属しているか」を必ず確かめる（IDOR 対策）。
 */
export async function requireMember(groupId: string) {
  const { user, session } = await requireSession();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    include: { group: true },
  });
  if (!membership) {
    // 存在しないグループか、他人のグループかを区別せずに同じエラーにする（グループの存在を推測させない）
    throw new ForbiddenError();
  }

  return { user, session, group: membership.group, role: membership.role };
}

/**
 * ログイン中のユーザーが所属するグループを返す。どこにも所属していなければ ForbiddenError。
 * 現状は1人1グループの想定なので、最初に参加したグループを返す。
 */
export async function getCurrentGroup() {
  const { user, session } = await requireSession();

  const membership = await prisma.groupMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { group: true },
  });
  if (!membership) {
    throw new ForbiddenError("どのグループにも所属していません");
  }

  return { user, session, group: membership.group, role: membership.role };
}
