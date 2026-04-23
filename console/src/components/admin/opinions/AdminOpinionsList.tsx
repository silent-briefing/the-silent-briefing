"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { bffJson } from "@/lib/bff/client";
import { opinionListResponseSchema } from "@/lib/schemas/admin-opinions";
import { cn } from "@/lib/utils";

export function AdminOpinionsList({ className }: { className?: string }) {
  const { getToken } = useAuth();

  const q = useQuery({
    queryKey: ["admin-opinions-list"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/opinions",
        getToken: () => getToken(),
        schema: opinionListResponseSchema,
      }),
  });

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Published</th>
              <th className="px-3 py-2 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/opinions/${encodeURIComponent(row.id)}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 font-mono text-[10px] text-[var(--fg-4)]">{row.slug}</p>
                </td>
                <td className="px-3 py-2 font-sans text-xs text-[var(--fg-3)]">{row.ingestion_status}</td>
                <td className="px-3 py-2 font-sans text-xs text-[var(--fg-3)]">{row.published ? "Yes" : "No"}</td>
                <td className="px-3 py-2 font-mono text-xs text-[var(--fg-3)]">
                  {row.pdf_storage_path ?? "—"}
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
