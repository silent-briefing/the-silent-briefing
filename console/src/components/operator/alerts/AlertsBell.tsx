"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countUnreadAlerts, listOrgAlerts, markAlertRead } from "@/lib/queries/alerts";
import type { AlertRow } from "@/lib/queries/schemas";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function alertTitle(row: AlertRow): string {
  const t = row.payload.title;
  return typeof t === "string" && t.trim() ? t : row.kind.replace(/_/g, " ");
}

function alertBody(row: AlertRow): string | null {
  const b = row.payload.body;
  return typeof b === "string" && b.trim() ? b : null;
}

function alertHref(row: AlertRow): string {
  const h = row.payload.href;
  return typeof h === "string" && h.startsWith("/") ? h : "/alerts";
}

export function AlertsBell() {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? null;

  const enabled = Boolean(userId && orgId);

  const { data: unread = 0 } = useQuery({
    queryKey: ["alerts-unread-count", orgId],
    queryFn: () => countUnreadAlerts(supabase, orgId!),
    enabled,
  });

  const { data: preview = [] } = useQuery({
    queryKey: ["alerts-preview", orgId],
    queryFn: () => listOrgAlerts(supabase, orgId!, { limit: 8 }),
    enabled,
  });

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      await markAlertRead(supabase, alertId, new Date().toISOString());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts-unread-count", orgId] });
      void qc.invalidateQueries({ queryKey: ["alerts-preview", orgId] });
      void qc.invalidateQueries({ queryKey: ["org-alerts-full", orgId] });
    },
  });

  const openItem = React.useCallback(
    (row: AlertRow) => {
      const href = alertHref(row);
      if (!row.read_at) {
        markRead.mutate(row.id);
      }
      router.push(href);
    },
    [markRead, router],
  );

  const badge =
    unread > 0 ? (
      <span
        className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tertiary px-1 font-mono text-[10px] font-bold leading-none text-[var(--fg-1)]"
        aria-hidden
      >
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "relative rounded-[var(--radius-md)] p-2.5 text-[var(--fg-1)] transition-colors",
              "hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
              !enabled && "opacity-50",
            )}
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            disabled={!userId}
            title={
              !orgId
                ? "Choose a Clerk organization to load org alerts (RLS matches your active org)."
                : undefined
            }
          />
        }
      >
        <Bell className="size-[18px]" strokeWidth={1.5} aria-hidden />
        {badge}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,380px)]">
        <DropdownMenuLabel className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
          Notifications
        </DropdownMenuLabel>
        {!orgId ? (
          <p className="px-2 py-3 font-sans text-sm text-[var(--fg-3)]">
            Active organization required to show alerts.
          </p>
        ) : preview.length === 0 ? (
          <p className="px-2 py-3 font-sans text-sm text-[var(--fg-3)]">No alerts yet.</p>
        ) : (
          preview.map((row) => {
            const title = alertTitle(row);
            const body = alertBody(row);
            const unreadDot = !row.read_at;
            return (
              <DropdownMenuItem
                key={row.id}
                className="cursor-pointer flex-col items-start gap-0.5 py-2.5"
                onClick={() => {
                  openItem(row);
                }}
              >
                <span className="flex w-full items-start gap-2">
                  {unreadDot ? (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-tertiary" aria-hidden />
                  ) : (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--fg-4)]/30" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 font-sans text-sm font-semibold text-[var(--fg-1)]">
                    {title}
                  </span>
                </span>
                {body ? (
                  <span className="line-clamp-2 pl-3.5 font-sans text-xs text-[var(--fg-3)]">{body}</span>
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="font-sans text-sm"
          onClick={() => {
            router.push("/alerts");
          }}
        >
          View all alerts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
