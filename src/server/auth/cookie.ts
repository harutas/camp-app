import "server-only";

import { cookies } from "next/headers";

// __Host- 接頭辞：ブラウザは次の条件をすべて満たす Cookie しか保存しない
//   - Secure が付いている
//   - Path=/ である
//   - Domain 属性がない（＝発行したホストだけに送られ、サブドメインからは上書きできない）
// 条件を満たさない Set-Cookie はブラウザが無視するため、属性の付け忘れにもすぐ気づける
const SESSION_COOKIE_NAME = "__Host-session";

const SESSION_COOKIE_ATTRIBUTES = {
  // JavaScript（document.cookie）から読めなくする。XSS でスクリプトを埋め込まれてもトークンは盗まれない
  httpOnly: true,
  // HTTPS の通信でだけ送る。通信を盗み見られてもトークンが漏れない
  secure: true,
  // 他サイトから始まったリクエストには付けない（リンクをたどる通常の遷移は除く）。CSRF の主な手口を防ぐ
  sameSite: "lax",
  // サイト内のすべてのパスへのリクエストで送る（__Host- の条件でもある）
  path: "/",
} as const;

/**
 * セッショントークンを Cookie に保存する。
 *
 * Cookie はブラウザが同じサイトへのリクエストに自動で付けて送る。
 * Firebase のように JS でトークンを取り出して Authorization ヘッダーに付ける処理は不要。
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...SESSION_COOKIE_ATTRIBUTES,
    // ブラウザに Cookie を残す秒数。セッションの絶対期限に合わせる。
    // 指定しないとブラウザを閉じた時点で消える（LINE アプリ内ブラウザでは頻繁にログインし直しになる）
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
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
 *
 * __Host- の Cookie は上書きするときも同じ条件（Secure・Path=/）が必要なため、
 * 保存時と同じ属性で Max-Age=0 の空の値を書き込む。
 */
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_ATTRIBUTES, maxAge: 0 });
}
