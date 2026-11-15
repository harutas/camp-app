import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionToken } from "@/server/auth/cookie";
import { validateSession } from "@/server/auth/session";

export default async function Home() {
  // Server Component はサーバーで実行されるため、ブラウザが自動送信した Cookie をここで読める
  const token = await getSessionToken();
  const result = token ? await validateSession(token) : null;

  if (!result) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">キャンプ記録</h1>
      <p className="mt-4">{result.user.displayName} さんでログイン中</p>
      {/* form の action に Server Action を渡すと、JS なしでも POST で呼び出せる */}
      <form action={logout} className="mt-6">
        <Button type="submit" variant="outline">
          ログアウト
        </Button>
      </form>
    </main>
  );
}
