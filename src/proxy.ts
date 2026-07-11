import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

/**
 * Optimistic check only -- redirects signed-out visitors away from
 * /dashboard for a smooth UX. Every Server Component/Action/Route Handler
 * behind /dashboard still calls requireUser() itself, since Proxy can be
 * misconfigured or skipped for certain request types.
 */
export async function proxy(request: Request) {
  const session = await auth();
  const url = new URL(request.url);

  if (!session?.user && url.pathname.startsWith("/dashboard")) {
    const signInUrl = new URL("/sign-in", url);
    signInUrl.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
