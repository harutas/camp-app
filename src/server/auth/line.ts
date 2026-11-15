import "server-only";

import { z } from "zod";

const LINE_VERIFY_ENDPOINT = "https://api.line.me/oauth2/v2.1/verify";
const LINE_ISSUER = "https://access.line.me";

const lineChannelIdSchema = z.string().regex(/^\d+$/, "LINE_CHANNEL_ID は数字のチャネルIDです");

// 検証 API が成功時に返す ID トークンの中身（使う項目だけ）
const verifiedIdTokenSchema = z.object({
  iss: z.string(),
  // LINE のユーザーID。認証・認可に使ってよいのは、検証 API が返したこの値だけ
  sub: z.string().regex(/^U[0-9a-f]{32}$/),
  aud: z.string(),
  exp: z.number(),
  // profile スコープがあるときだけ含まれる
  name: z.string().optional(),
});

export type VerifiedLineIdToken = z.infer<typeof verifiedIdTokenSchema>;

export class LineIdTokenError extends Error {
  override name = "LineIdTokenError";
}

/**
 * LINE の ID トークンを LINE の検証 API で検証し、中身を返す。検証に失敗したら LineIdTokenError。
 *
 * ID トークンは LINE が署名した JWT。クライアントから届いた値をそのまま信じず、
 * 「LINE が発行した」「期限内である」「このアプリ（チャネル）宛てに発行された」ことを LINE に確認してもらう。
 */
export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineIdToken> {
  const channelId = lineChannelIdSchema.parse(process.env.LINE_CHANNEL_ID);

  const response = await fetch(LINE_VERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      // client_id を渡すと、LINE は「このチャネル宛てに発行された ID トークンか（aud）」も検証する。
      // 渡さないと、別のアプリ用に発行された本物の ID トークンでもログインできてしまう
      client_id: channelId,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // 期限切れ・改ざん・別チャネル宛てなどは 400 で返る
    const detail = await response.text();
    throw new LineIdTokenError(`ID トークンの検証に失敗しました（${response.status}）: ${detail}`);
  }

  const parsed = verifiedIdTokenSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new LineIdTokenError("検証 API の応答が想定した形式ではありません");
  }

  // LINE 側でも検証済みだが、取り違えを防ぐため発行元と宛先を自分でも確認する
  if (parsed.data.iss !== LINE_ISSUER || parsed.data.aud !== channelId) {
    throw new LineIdTokenError("ID トークンの発行元または宛先が一致しません");
  }

  return parsed.data;
}
