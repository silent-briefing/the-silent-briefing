"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { listOrgAlerts, markAlertRead } from "@/lib/queries/alerts";
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

function alertHref(row: AlertRow): string | null {
  const h = row.payload.href;
  return typeof h === "string" && h.startsWith("/") ? h : null;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AlertsHub() {
  const supabase = useSupabaseBrowser();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? null;

  const enabled = Boolean(userId && orgId);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["org-alerts-full", orgId],
    queryFn: () => listOrgAlerts(supabase, orgId!, { limit: 100 }),
    enabled,
  });

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      await markAlertRead(supabase, alertId, new Date().toISOString());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org-alerts-full", orgId] });
      void qc.invalidateQueries({ queryKey: ["alerts-unread-count", orgId] });
      void qc.invalidateQueries({ queryKey: ["alerts-preview", orgId] });
    },
  });

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/" className="hover:text-[var(--fg-2)]">
          Briefing
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Alerts</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Org notifications
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">Alerts</h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Worker-generated notices for your active Clerk organization. Mark items read when you have handled them.
      </p>

      {!orgId ? (
        <p className="mt-10 font-sans text-sm text-[var(--fg-3)]">
          Select an organization in Clerk to load alerts (Supabase RLS matches{" "}
          <span className="font-mono text-[var(--fg-2)]">org_id</span> on your JWT).
        </p>
      ) : isPending ? (
        <p className="mt-10 font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-10 font-sans text-sm text-[var(--fg-3)]">No alerts for this organization.</p>
      ) : (
        <ul className="mt-10 divide-y divide-[rgba(0,15,34,0.08)] border-t border-[rgba(0,15,34,0.08)]">
          {rows.map((row) => {
            const href = alertHref(row);
            const title = alertTitle(row);
            const body = alertBody(row);
            return (
              <li key={row.id} className="flex flex-col gap-3 py-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!row.read_at ? (
                      <span className="size-2 shrink-0 rounded-full bg-tertiary" aria-label="Unread" />
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="font-sans text-base font-semibold text-[var(--fg-1)] underline-offset-4 hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      <span className="font-sans text-base font-semibold text-[var(--fg-1)]">{title}</span>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-4)]">
                      {row.kind}
                    </span>
                  </div>
                  {body ? <p className="font-sans text-sm text-[var(--fg-3)]">{body}</p> : null}
                  <p className="font-sans text-xs text-[var(--fg-4)]">
                    {formatWhen(row.delivered_at)}
                    {row.read_at ? ` · Read ${formatWhen(row.read_at)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!row.read_at ? (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(row.id)}
                      disabled={markRead.isPending}
                      className={cn(
                        "rounded-md border border-[rgba(0,15,34,0.12)] px-3 py-2",
                        "font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-2)]",
                        "transition-colors hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
                        "disabled:opacity-50",
                      )}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
