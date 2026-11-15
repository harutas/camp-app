// 開発専用のログイン API。ユーザーIDを受け取るだけでセッションを発行する。
// 誰でも任意のユーザーになりすませるため、本番では絶対に動かしてはいけない。
import { NextResponse } from "next/server";
import { z } from "zod";
import { signIn } from "@/server/auth/sign-in";
import { prisma } from "@/server/db";

const bodySchema = z.object({
  userId: z.uuid(),
});

export async function POST(request: Request) {
  // 本番では存在しないエンドポイントとして振る舞う（他のどの処理よりも先に判定する）
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  // ログイン画面の <form> から application/x-www-form-urlencoded で送られてくる
  const formData = await request.formData();
  const parsed = bodySchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "userId が不正です" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  await signIn(user.id);

  // POST の結果として別ページに移るときは 303 を使う（ブラウザは GET で / を開き直す）
  return NextResponse.redirect(new URL("/", request.url), 303);
}
