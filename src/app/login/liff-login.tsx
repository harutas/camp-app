"use client";

import type { Liff } from "@line/liff";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status =
  | { type: "initializing" }
  | { type: "ready" } // LINE 未ログイン。ボタンで LINE ログインを始める
  | { type: "signing-in" }
  | { type: "error"; message: string };

/**
 * LIFF で LINE ログインし、ID トークンをサーバーに送ってセッションを発行してもらう。
 *
 * このコンポーネントは ID トークンを「運ぶ」だけで、誰がログインしたかの判断はしない。
 * liff.getProfile() や liff.getDecodedIDToken() の値はブラウザ側で書き換えられるため、認証・認可には使わない。
 * ユーザーの特定は、サーバーが LINE の検証 API で ID トークンを検証して得た sub だけで行う。
 */
export function LiffLogin() {
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

      // LINE アプリ内では常にログイン済み。外部ブラウザでも LINE ログインから戻ってきた直後はログイン済みになる
      if (liff.isLoggedIn()) {
        await signInWithIdToken(liff);
      } else {
        setStatus({ type: "ready" });
      }
    }

    async function signInWithIdToken(liff: Liff) {
      setStatus({ type: "signing-in" });

      const idToken = liff.getIDToken();
      if (!idToken) {
        setStatus({
          type: "error",
          message: "ID トークンを取得できません（LIFF アプリのスコープに openid が必要です）",
        });
        return;
      }

      const response = await fetch("/api/auth/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        // サーバーが発行した Cookie を使って保護ページを開き直す
        window.location.replace("/");
        return;
      }

      if (response.status === 401) {
        // ID トークンの期限切れなど。LIFF のログイン状態を捨てて、LINE ログインからやり直してもらう
        liff.logout();
        setStatus({ type: "ready" });
        return;
      }

      if (response.status === 403) {
        setStatus({ type: "error", message: "この LINE アカウントは利用できません" });
        return;
      }

      setStatus({ type: "error", message: "ログインに失敗しました" });
    }

    initialize().catch((error: unknown) => {
      console.error(error);
      setStatus({ type: "error", message: "LINE ログインの準備に失敗しました" });
    });
  }, []);

  function handleLogin() {
    // LINE のログイン画面に移動し、ログイン後はこのページに戻ってくる
    liffRef.current?.login({ redirectUri: window.location.href });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleLogin} disabled={status.type !== "ready"}>
        {status.type === "signing-in" ? "ログイン中…" : "LINE でログイン"}
      </Button>
      {status.type === "error" && <p className="text-sm text-destructive">{status.message}</p>}
    </div>
  );
}
