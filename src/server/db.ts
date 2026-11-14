// サーバー専用モジュール。クライアントコンポーネントから import されるとビルドエラーになる。
// （DB接続情報やクエリがブラウザ向けバンドルに混入するのを防ぐ）
import "server-only";

import { PrismaClient } from "@prisma/client";

// 開発時（next dev）はファイル保存のたびにモジュールが再評価される。
// そのたびに new PrismaClient() すると接続プールが増え続けるので、
// globalThis にキャッシュして使い回す。本番ではモジュールは1回しか評価されないのでキャッシュ不要。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
