import "server-only";

import { deleteSessionCookie, getSessionToken, setSessionCookie } from "./cookie";
import { createSession, deleteSession, deleteUserSessions } from "./session";

/**
 * ログイン処理の共通部分。認証（本人確認）が済んだユーザーに対して呼ぶ。
 * Server Action / Route Handler の中でのみ呼べる（Cookie を書き込むため）。
 */
export async function signIn(userId: string) {
  // ログイン前のセッションは使い回さず、必ず破棄して作り直す（セッション固定攻撃の対策）。
  // 攻撃者が用意したトークンを被害者の Cookie に仕込み、被害者がそのままログインすると、
  // 攻撃者も同じトークンでログイン後の状態を使えてしまう。作り直せばその手口は成立しない。
  const currentToken = await getSessionToken();
  if (currentToken) {
    await deleteSession(currentToken);
  }

  const { token, session } = await createSession(userId);
  await setSessionCookie(token, session.expiresAt);
}

/**
 * ログアウト処理。DB の行を消してから Cookie を消す。
 * Cookie だけを消しても、トークンを控えていた人はそのまま使えてしまう。DB の行を消して初めて無効になる。
 */
export async function signOut() {
  const token = await getSessionToken();
  if (token) {
    await deleteSession(token);
  }
  await deleteSessionCookie();
}

/**
 * 全端末からのログアウト。そのユーザーのセッションをすべて削除し、この端末の Cookie も消す。
 * 端末をなくしたときなど、自分以外の端末に残っているログイン状態をまとめて無効にするために使う。
 */
export async function signOutEverywhere(userId: string) {
  await deleteUserSessions(userId);
  await deleteSessionCookie();
}
