import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/items";

/**
 * Resolves the signed-in user's app_users row for use in Server
 * Components/Actions and Route Handlers. Redirects to sign-in if there is
 * no session -- Proxy only does an optimistic check, so every entry point
 * that touches user data verifies the session itself (defense in depth).
 *
 * Wrapped in cache() so a Server Action that calls requireUser(), mutates,
 * and then triggers a revalidatePath re-render of the page (which calls
 * requireUser() again as part of the *same* request) reuses one session
 * check + one Supabase lookup instead of two.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByEmail(session.user.email);
  if (!dbUser) {
    redirect("/sign-in");
  }

  return { session, dbUser };
});
