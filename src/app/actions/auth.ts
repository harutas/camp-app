"use server";

import { redirect } from "next/navigation";
import { UnauthorizedError } from "@/server/auth/errors";
import { requireSession } from "@/server/auth/guards";
import { signOut, signOutEverywhere } from "@/server/auth/sign-in";

// Server Action はフォームから POST で呼ばれる。
// Next.js はリクエストの Origin と Host が一致しない呼び出しを拒否するため、他サイトから勝手にログアウトさせられることはない。
//
// Server Action は画面にボタンがなくても、ID が分かれば誰でも直接呼び出せる公開エンドポイント。
// 「ログイン中の画面にしかボタンを置いていない」は保護にならないので、権限が必要な処理は中でガードを呼ぶ。

// ログアウト後のログイン画面。LINE アプリ内では LINE に常にログインしているため、
// 印を付けずに /login を開くと自動ログインでその場でセッションが作り直されてしまう。
const LOGGED_OUT_URL = "/login?loggedOut=1";

export async function logout() {
  await signOut();
  redirect(LOGGED_OUT_URL);
}

export async function logoutEverywhere() {
  try {
    // 誰のセッションを消すかは、引数ではなくログイン中のセッションから決める（他人のセッションを消させない）
    const { user } = await requireSession();
    await signOutEverywhere(user.id);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      throw error;
    }
  }
  redirect(LOGGED_OUT_URL);
}
