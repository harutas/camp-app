// LINE ログイン。LIFF で取得した ID トークンを受け取り、検証できたらセッションを発行する。
import { NextResponse } from "next/server";
import { z } from "zod";
import { LineIdTokenError, verifyLineIdToken } from "@/server/auth/line";
import { signIn } from "@/server/auth/sign-in";
import { prisma } from "@/server/db";
import { consumeRateLimit, getClientIp } from "@/server/rate-limit";

/**
 * ログインの試行回数の上限（IP ごと）。
 * 許可リスト方式なので総当たりで突破される心配は小さいが、LINE の検証 API と DB を無制限に叩かれないようにする。
 * 家族が普通に使う分（ログインのやり直しを含む）には十分な回数にしている。
 */
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

const bodySchema = z.object({
  idToken: z.string().min(1),
});

/**
 * リクエストが自分のサイトのページから送られたかを Origin ヘッダーで確かめる（CSRF 対策）。
 *
 * ブラウザは fetch や form の POST に、送信元ページのオリジンを Origin ヘッダーとして必ず付け、JS からは書き換えられない。
 * 他サイトのページが勝手にこの API を呼んでも Origin が一致しないので拒否できる。
 * SameSite=Lax の Cookie と二重の対策になる（このエンドポイントは Cookie を「発行する」側なので、Cookie の属性だけでは守れない）。
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }
  // Vercel などのプロキシ経由では、ブラウザが接続したホストは x-forwarded-host に入る
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // 回数制限は最初に確認する（Origin を偽装したリクエストや不正なボディも1回として数え、後続の処理まで進ませない）
  const rateLimit = await consumeRateLimit(`login:${getClientIp(request)}`, LOGIN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "ログインの試行回数が多すぎます。しばらく待ってからやり直してください" },
      // Retry-After：何秒後に再試行してよいかをクライアントに伝える標準のヘッダー
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "許可されていないリクエストです" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "idToken がありません" }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifyLineIdToken(parsed.data.idToken);
  } catch (error) {
    if (error instanceof LineIdTokenError) {
      console.warn(error.message);
      // 期限切れの ID トークンなどはクライアントで LINE ログインをやり直せば解決するため、401 で返す
      return NextResponse.json({ error: "LINE の認証に失敗しました" }, { status: 401 });
    }
    throw error;
  }

  // 許可リスト：users に登録された LINE ユーザーだけがログインできる
  const user = await prisma.user.findUnique({ where: { lineUserId: verified.sub } });
  if (!user) {
    // 家族の LINE ユーザーIDを集めるためにログに残す（ユーザーIDは LINE のプロバイダーごとに異なる値）
    console.warn(`未登録の LINE ユーザーがログインを試みました: sub=${verified.sub}`);
    return NextResponse.json({ error: "このアカウントは利用できません" }, { status: 403 });
  }

  // 表示名は検証済みの ID トークンに含まれるプロフィール名で更新する
  if (verified.name && verified.name !== user.displayName) {
    await prisma.user.update({ where: { id: user.id }, data: { displayName: verified.name } });
  }

  await signIn(user.id);
  return new NextResponse(null, { status: 204 });
}
