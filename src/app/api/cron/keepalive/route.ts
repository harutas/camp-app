// Supabase の休止を防ぐための定期アクセス（Vercel Cron から毎日 03:00 JST に呼ばれる。vercel.json 参照）。
//
// Supabase の無料プランは、一定期間（約1週間）アクセスがないとプロジェクトが一時停止される。
// 家族のアプリはキャンプの時期以外は使われない期間が長いので、外から定期的に軽いクエリを流しておく。
// DB 内の pg_cron はアクセスとして数えられないため、アプリ（Vercel）側から接続する必要がある。
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

/**
 * Vercel Cron からの呼び出しかを確かめる。
 *
 * Vercel は環境変数 CRON_SECRET が設定されていると、Cron の呼び出しに `Authorization: Bearer <CRON_SECRET>` を付ける。
 * このパスは公開 URL なので、確かめないと誰でも叩けてしまう（DB への負荷や、ログの汚れの原因になる）。
 *
 * 文字列を === で比べると、先頭から何文字一致したかで処理時間が変わり、それを手がかりに推測される余地がある（タイミング攻撃）。
 * timingSafeEqual は一致・不一致にかかわらず同じ時間で比べる。長さが違うと例外になるので、先に SHA-256 で同じ長さに揃える。
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // 設定漏れのときは「誰でも通す」ではなく「誰も通さない」側に倒す
  if (!secret) {
    return false;
  }
  const received = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(`Bearer ${secret}`));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // テーブルに触れない最小のクエリ。DB に接続してクエリを実行したこと自体がアクセスとして数えられる
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true });
}
