import "server-only";

import { createHash } from "node:crypto";

// セッショントークンの長さ。32バイト = 256ビットの乱数は総当たりで推測できない
const TOKEN_BYTES = 32;

/**
 * セッショントークンを生成する。
 *
 * Firebase の ID トークン（JWT）は中身にユーザー情報と署名を持つが、
 * このトークンは「意味を持たないランダムな文字列」。ユーザーが誰かは DB の sessions テーブルを引いて初めて分かる。
 */
export function generateSessionToken(): string {
  // crypto.getRandomValues は暗号学的に安全な乱数を返す（Math.random は予測可能なので使わない）
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  // base64url は Cookie や URL にそのまま入れられる文字（A-Z a-z 0-9 - _）だけで構成される
  return Buffer.from(bytes).toString("base64url");
}

/**
 * セッショントークンを DB に保存する形（SHA-256 ハッシュ、16進数64文字）に変換する。
 *
 * DB には生のトークンを置かない。DB の中身が漏れても、ハッシュから元のトークンは復元できないため、
 * 漏れた値を Cookie に入れてもログインできない。
 *
 * パスワードと違いソルトや bcrypt のような遅いハッシュが要らないのは、元の値が 256 ビットの乱数だから。
 * パスワードは人が覚えられる程度の候補しかなく、総当たりや事前計算の表で逆算できてしまうので、
 * ソルトで表を無効にし、遅いハッシュで試行回数を減らす必要がある。
 * 256 ビットの乱数は候補が多すぎて、どちらの方法でも逆算できない。
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
