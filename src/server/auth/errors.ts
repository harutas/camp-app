import "server-only";

/**
 * 認証エラー：ログインしていない、またはセッションが無効。
 * 「あなたが誰か分からない」状態。ログイン画面に案内する（HTTP なら 401）。
 */
export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";

  constructor(message = "ログインが必要です") {
    super(message);
  }
}

/**
 * 認可エラー：ログインはしているが、その操作やデータへの権限がない。
 * 「あなたが誰かは分かったが、それは許可されていない」状態。ログインし直しても解決しない（HTTP なら 403）。
 */
export class ForbiddenError extends Error {
  override name = "ForbiddenError";

  constructor(message = "このデータにアクセスする権限がありません") {
    super(message);
  }
}
