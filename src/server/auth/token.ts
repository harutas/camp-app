import "server-only";

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
