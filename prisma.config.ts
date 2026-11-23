import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma CLI はこのファイルがあると .env を自動で読み込まなくなる。
// 自動読み込みに任せると、.env.prod に書き忘れた変数を .env（開発用）の値で黙って補ってしまう
// （例：DIRECT_URL が無いと本番向けのつもりの migrate deploy が開発 DB に流れる）。
// そこで読み込むファイルをここで 1 つだけに決め、足りない変数があれば Prisma のエラーで止まるようにする。
const envFile = process.env.PRISMA_ENV_FILE;
if (envFile) {
  // 本番 DB 向け（package.json の db:*:prod）。ファイルが無ければ例外で止める
  process.loadEnvFile(envFile);
} else if (existsSync(".env")) {
  // 開発時の既定。Vercel のビルド（postinstall の prisma generate）には .env が無く、DB にもつながないので読まない
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
