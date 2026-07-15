import type { ReactNode } from "react";

import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "@/components/dashboard/assistant-chat";

export function DashboardShell({
  userName,
  userEmail,
  children,
}: {
  userName?: string | null;
  userEmail?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Archie</h1>
          <p className="text-sm text-muted-foreground">
            {userName ?? userEmail}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      {children}
      <AssistantChat />
    </div>
  );
}
