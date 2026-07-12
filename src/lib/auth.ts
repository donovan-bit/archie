import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { upsertAppUser } from "@/lib/items";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

async function refreshGoogleAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: `openid email profile ${CALENDAR_SCOPE}`,
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await upsertAppUser({
        email: user.email,
        name: user.name,
        image: user.image,
      });
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.email = user.email;
        return token;
      }

      if (
        token.expiresAt &&
        Date.now() / 1000 < (token.expiresAt as number) - 60
      ) {
        return token;
      }

      if (!token.refreshToken) return token;

      try {
        const refreshed = await refreshGoogleAccessToken(
          token.refreshToken as string,
        );
        token.accessToken = refreshed.accessToken;
        token.expiresAt = refreshed.expiresAt;
        token.refreshToken = refreshed.refreshToken;
      } catch (error) {
        console.error("Google token refresh failed", error);
        token.error = "RefreshFailed";
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      if (session.user) session.user.email = token.email as string;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
