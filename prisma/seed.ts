// 初期データの登録。`pnpm db:seed` で実行する。
// 何度実行しても同じ状態になるよう（冪等）、既存データがあれば作成せずに使い回す。
import { GroupRole, PrismaClient } from "@prisma/client";
import { z } from "zod";

const GROUP_NAME = "家族";

// LINE のユーザーIDは "U" + 32桁の16進数
const lineUserIdSchema = z
  .string()
  .regex(/^U[0-9a-f]{32}$/, "LINE のユーザーIDの形式ではありません");

const envSchema = z.object({
  SEED_LINE_USER_IDS: z
    .string()
    .min(1, "SEED_LINE_USER_IDS が空です")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(lineUserIdSchema).min(1)),
});

const prisma = new PrismaClient();

async function main() {
  const { SEED_LINE_USER_IDS: lineUserIds } = envSchema.parse(process.env);

  const group =
    (await prisma.group.findFirst({ where: { name: GROUP_NAME } })) ??
    (await prisma.group.create({ data: { name: GROUP_NAME } }));

  for (const [index, lineUserId] of lineUserIds.entries()) {
    // 表示名は LINE ログイン時にプロフィール名で上書きされる。初期値は連番の名前にする
    const user = await prisma.user.upsert({
      where: { lineUserId },
      update: {},
      create: { lineUserId, displayName: `メンバー${index + 1}` },
    });

    // 先頭のユーザーをグループのオーナーにする
    const role = index === 0 ? GroupRole.OWNER : GroupRole.MEMBER;
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: {},
      create: { groupId: group.id, userId: user.id, role },
    });
  }

  console.log(`グループ「${group.name}」に ${lineUserIds.length} 人を登録しました`);
}

// スクリプトの最上位なので結果を待つ先がない。void で「意図的に待たない」ことを示す
void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
