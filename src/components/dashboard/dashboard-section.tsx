"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDownIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared chrome for a collapsible, expandable dashboard section (To Do
 * List, Calendar, and any Phase 2+ additions). Handles the collapse
 * toggle and a "fill the whole screen" expand toggle; the section's own
 * toolbar/content is just children.
 */
export function DashboardSection({
  title,
  icon,
  headerActions,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-5",
        expanded
          ? "fixed inset-0 z-50 overflow-y-auto rounded-none"
          : className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {icon}
          {title}
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !collapsed && "rotate-180",
            )}
          />
        </button>
        <div className="flex items-center gap-2">
          {!collapsed && headerActions}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Exit full screen" : "Fill screen"}
          >
            {expanded ? (
              <Minimize2Icon className="size-4" />
            ) : (
              <Maximize2Icon className="size-4" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );
}
