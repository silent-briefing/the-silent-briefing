"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { deleteSavedView, listUserSavedViews } from "@/lib/queries/saved-views";
import { savedViewHref } from "@/lib/queries/saved-view-href";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function SavedViewsHub() {
  const supabase = useSupabaseBrowser();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { organization } = useOrganization();

  const orgId = organization?.id ?? (userId ? `personal_${userId}` : null);

  const enabled = Boolean(userId);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["user-saved-views", userId, orgId],
    queryFn: () => listUserSavedViews(supabase, userId!, orgId ? { orgId } : undefined),
    enabled,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await deleteSavedView(supabase, id);
    },
    onSuccess: () => {
      toast.success("Removed saved view");
      void qc.invalidateQueries({ queryKey: ["user-saved-views"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Could not delete";
      toast.error(msg);
    },
  });

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/" className="hover:text-[var(--fg-2)]">
          Briefing
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Saved</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Bookmarks & filters
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">Saved views</h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Officials filters, dossier bookmarks, and saved searches stored in{" "}
        <span className="font-mono text-[var(--fg-2)]">user_saved_views</span>.
      </p>

      {!userId ? (
        <p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Sign in to see saved views.</p>
      ) : isPending ? (
        <p className="mt-10 font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-10 font-sans text-sm text-[var(--fg-3)]">
          Nothing saved yet. Use <strong>Save view</strong> on Officials or <strong>Bookmark</strong> on a dossier.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-[rgba(0,15,34,0.08)] border-t border-[rgba(0,15,34,0.08)]">
          {rows.map((row) => {
            const href = savedViewHref(row);
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-4)]">
                      {row.kind}
                    </span>
                    {href ? (
                      <Link
                        href={href}
                        className="block min-w-0 truncate font-sans text-base font-semibold text-[var(--fg-1)] underline-offset-4 hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="font-sans text-base font-semibold text-[var(--fg-1)]">{row.name}</span>
                    )}
                  </div>
                  {!href ? (
                    <p className="mt-1 font-sans text-xs text-[var(--fg-4)]">Could not resolve a link for this row.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(row.id)}
                  disabled={del.isPending}
                  className={cn(
                    "shrink-0 rounded-md border border-[rgba(0,15,34,0.12)] px-3 py-2",
                    "font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-2)]",
                    "transition-colors hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
                    "disabled:opacity-50",
                  )}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
