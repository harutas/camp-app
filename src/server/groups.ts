import "server-only";

import { requireMember } from "@/server/auth/guards";
import { prisma } from "@/server/db";

/**
 * グループのメンバー一覧を返す。呼び出したユーザーがそのグループのメンバーでなければ ForbiddenError。
 *
 * データを返す関数は、呼び出し元が確認済みかどうかに関係なく、自分の中でガードを呼ぶ。
 * どこから呼ばれても（別のページや Server Action から再利用されても）同じ確認が必ず通るようにするため。
 */
export async function listGroupMembers(groupId: string) {
  await requireMember(groupId);

  // ID 単独ではなく groupId を条件に含めて引く。確認したグループ以外のデータは返らない
  return prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, displayName: true } } },
  });
}
