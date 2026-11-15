import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { LiffLogin } from "./liff-login";

const isDevelopment = process.env.NODE_ENV !== "production";

export default async function LoginPage() {
  // 開発用ログインのためのユーザー一覧。本番では DB を引かない（家族の名前を未ログインの人に見せない）
  const users = isDevelopment ? await prisma.user.findMany({ orderBy: { createdAt: "asc" } }) : [];

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">ログイン</h1>

      <section className="mt-6">
        <LiffLogin />
      </section>

      {isDevelopment && (
        <section className="mt-10">
          <h2 className="text-sm text-muted-foreground">開発用ログイン</h2>
          {/* JS を使わない通常のフォーム送信。押したボタンの value が userId として送られる */}
          <form action="/api/auth/dev" method="post" className="mt-2 flex flex-col gap-2">
            {users.map((user) => (
              <Button key={user.id} type="submit" name="userId" value={user.id} variant="outline">
                {user.displayName}
              </Button>
            ))}
          </form>
          {users.length === 0 && (
            <p className="text-sm">ユーザーがいません。`pnpm db:seed` を実行してください。</p>
          )}
        </section>
      )}
    </main>
  );
}
