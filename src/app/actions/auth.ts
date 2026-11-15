"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/server/auth/sign-in";

// Server Action はフォームから POST で呼ばれる。
// Next.js はリクエストの Origin と Host が一致しない呼び出しを拒否するため、他サイトから勝手にログアウトさせられることはない。
export async function logout() {
  await signOut();
  redirect("/login");
}
