import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/items";

/**
 * Resolves the signed-in user's app_users row for use in Server
 * Components/Actions and Route Handlers. Redirects to sign-in if there is
 * no session -- Proxy only does an optimistic check, so every entry point
 * that touches user data verifies the session itself (defense in depth).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByEmail(session.user.email);
  if (!dbUser) {
    redirect("/sign-in");
  }

  return { session, dbUser };
}
