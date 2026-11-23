"use client";

import type { Liff } from "@line/liff";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status =
  | { type: "initializing" }
  | { type: "ready"; notice?: string } // ボタンを押してログインを始める状態
  | { type: "signing-in" }
  | { type: "error"; message: string };

/**
 * ID トークンをサーバーに送ってセッションを発行してもらう。
 * 成功したら保護ページへ移動して null を返し、失敗したら次に表示する状態を返す。
 */
async function signInWithIdToken(liff: Liff): Promise<Status | null> {
  const idToken = liff.getIDToken();
  if (!idToken) {
    return {
      type: "error",
      message: "ID トークンを取得できません（LIFF アプリのスコープに openid が必要です）",
    };
  }

  const response = await fetch("/api/auth/line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (response.ok) {
    // サーバーが発行した Cookie を使って保護ページを開き直す
    window.location.replace("/");
    return null;
  }

  if (response.status === 401) {
    // ID トークンの期限切れなど。LIFF のログイン状態を捨てて、LINE ログインからやり直してもらう
    liff.logout();
    return { type: "ready" };
  }

  if (response.status === 403) {
    return { type: "error", message: "この LINE アカウントは利用できません" };
  }

  if (response.status === 429) {
    return {
      type: "error",
      message: "ログインの試行回数が多すぎます。しばらく待ってからやり直してください",
    };
  }

  return { type: "error", message: "ログインに失敗しました" };
}

/**
 * LIFF で LINE ログインし、ID トークンをサーバーに送ってセッションを発行してもらう。
 *
 * このコンポーネントは ID トークンを「運ぶ」だけで、誰がログインしたかの判断はしない。
 * liff.getProfile() や liff.getDecodedIDToken() の値はブラウザ側で書き換えられるため、認証・認可には使わない。
 * ユーザーの特定は、サーバーが LINE の検証 API で ID トークンを検証して得た sub だけで行う。
 *
 * loggedOut が true（ログアウト直後）のときは自動ログインせず、ボタンが押されるまで待つ。
 */
export function LiffLogin({ loggedOut }: { loggedOut: boolean }) {
  const [status, setStatus] = useState<Status>({ type: "initializing" });
  const liffRef = useRef<Liff | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // 開発時の React Strict Mode では effect が2回実行されるため、初期化は1回だけにする
    if (startedRef.current) return;
    startedRef.current = true;

    async function initialize() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setStatus({ type: "error", message: "NEXT_PUBLIC_LIFF_ID が設定されていません" });
        return;
      }

      // LIFF SDK はブラウザでしか動かないため、クライアントで動的に読み込む
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId });
      liffRef.current = liff;

      if (loggedOut) {
        // 外部ブラウザでは LIFF のトークンがブラウザに残り、次に開いたとき自動ログインしてしまうので消しておく。
        // LINE アプリ内（isInClient）は LINE のログイン状態そのものなので消さない（消してもアプリを開き直せば戻る）
        if (!liff.isInClient() && liff.isLoggedIn()) {
          liff.logout();
        }
        setStatus({ type: "ready", notice: "ログアウトしました" });
        return;
      }

      // LINE アプリ内では常にログイン済み。外部ブラウザでも LINE ログインから戻ってきた直後はログイン済みになる
      if (liff.isLoggedIn()) {
        setStatus({ type: "signing-in" });
        const next = await signInWithIdToken(liff);
        if (next) setStatus(next);
      } else {
        setStatus({ type: "ready" });
      }
    }

    initialize().catch((error: unknown) => {
      console.error(error);
      setStatus({ type: "error", message: "LINE ログインの準備に失敗しました" });
    });
  }, [loggedOut]);

  async function handleLogin() {
    const liff = liffRef.current;
    if (!liff) return;

    if (liff.isLoggedIn()) {
      // LINE アプリ内のログアウト直後など、LINE にはログイン済み。LINE のログイン画面を挟まずにトークンを送る
      setStatus({ type: "signing-in" });
      try {
        const next = await signInWithIdToken(liff);
        if (next) setStatus(next);
      } catch (error) {
        console.error(error);
        setStatus({ type: "error", message: "ログインに失敗しました" });
      }
      return;
    }

    // LINE のログイン画面に移動し、ログイン後はこのページに戻ってくる。
    // 戻り先に ?loggedOut=1 が残っていると自動ログインしないので、クエリを付けない /login に戻す
    liff.login({ redirectUri: `${window.location.origin}/login` });
  }

  return (
    <div className="flex flex-col gap-2">
      {status.type === "ready" && status.notice && (
        <p className="text-sm text-muted-foreground">{status.notice}</p>
      )}
      <Button type="button" onClick={() => void handleLogin()} disabled={status.type !== "ready"}>
        {status.type === "signing-in" ? "ログイン中…" : "LINE でログイン"}
      </Button>
      {status.type === "error" && <p className="text-sm text-destructive">{status.message}</p>}
    </div>
  );
}
