import { redirect } from "next/navigation";
import { logout, logoutEverywhere } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/errors";
import { getCurrentGroup } from "@/server/auth/guards";
import { listGroupMembers } from "@/server/groups";

export default async function Home() {
  let current;
  try {
    current = await getCurrentGroup();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError) {
      return (
        <main className="mx-auto max-w-md p-6">
          <h1 className="text-2xl font-bold">キャンプ記録</h1>
          <p className="mt-4">{error.message}</p>
          <LogoutButtons />
        </main>
      );
    }
    throw error;
  }

  const members = await listGroupMembers(current.group.id);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">キャンプ記録</h1>
      <p className="mt-4">{current.user.displayName} さんでログイン中</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{current.group.name}</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-2">
              <span>{member.user.displayName}</span>
              {member.role === "OWNER" && (
                <span className="text-xs text-muted-foreground">オーナー</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <LogoutButtons />
    </main>
  );
}

function LogoutButtons() {
  return (
    <div className="mt-8 flex gap-2">
      {/* form の action に Server Action を渡すと、JS なしでも POST で呼び出せる */}
      <form action={logout}>
        <Button type="submit" variant="outline">
          ログアウト
        </Button>
      </form>
      <form action={logoutEverywhere}>
        <Button type="submit" variant="ghost">
          全端末からログアウト
        </Button>
      </form>
    </div>
  );
}
