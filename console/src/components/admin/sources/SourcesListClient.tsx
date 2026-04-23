"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { bffJson } from "@/lib/bff/client";
import { adminSourcesListResponseSchema } from "@/lib/schemas/admin-sources";
import { cn } from "@/lib/utils";

export function SourcesListClient({ className }: { className?: string }) {
  const { getToken } = useAuth();

  const q = useQuery({
    queryKey: ["admin-sources-list"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/sources",
        getToken: () => getToken(),
        schema: adminSourcesListResponseSchema,
      }),
  });

  return (
    <div className={cn("space-y-6", className)}>
      <p className="font-sans text-sm text-[var(--fg-3)]">
        Database overrides win over environment-backed values from deployment. Defaults shipped in the repo are shown
        for reference.{" "}
        <Link href="/admin/feeds" className="text-primary underline-offset-4 hover:underline">
          Operator feeds (X + Perplexity) →
        </Link>
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Effective URL</th>
              <th className="px-3 py-2 font-medium">Override</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((row) => (
              <tr key={row.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/sources/${encodeURIComponent(row.key)}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {row.label}
                  </Link>
                  <p className="mt-1 font-mono text-[10px] text-[var(--fg-4)]">{row.key}</p>
                </td>
                <td className="max-w-md break-all px-3 py-2 font-mono text-xs text-[var(--fg-2)]">{row.effective}</td>
                <td className="px-3 py-2 font-sans text-xs text-[var(--fg-3)]">
                  {row.override_from_database ? "Database" : "Env / default"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.isLoading ? <p className="text-sm text-[var(--fg-3)]">Loading…</p> : null}
    </div>
  );
}
