import "server-only";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session";

/**
 * セッショントークンを Cookie に保存する。
 *
 * Cookie はブラウザが同じサイトへのリクエストに自動で付けて送る。
 * Firebase のように JS でトークンを取り出して Authorization ヘッダーに付ける処理は不要。
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    // サイト内のすべてのパスへのリクエストで送られるようにする
    path: "/",
  });
}

/**
 * リクエストに付いてきた Cookie からセッショントークンを取り出す。
 */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * セッションの Cookie を削除する（ブラウザに有効期限切れの Cookie を送って上書きさせる）。
 * Cookie を変更できるのは Server Action と Route Handler の中だけ。
 */
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/" });
}
