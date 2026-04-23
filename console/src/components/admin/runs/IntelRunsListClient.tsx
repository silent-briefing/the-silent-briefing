"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { bffJson } from "@/lib/bff/client";
import { intelRunsListResponseSchema } from "@/lib/schemas/admin-runs";
import { cn } from "@/lib/utils";

import { TriggerRunDialog } from "./TriggerRunDialog";

function fmtTokens(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null && b == null) return "—";
  return `${a ?? "—"} / ${b ?? "—"}`;
}

export function IntelRunsListClient({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10) || 25));
  const offset = page * pageSize;

  const listPath = `/v1/admin/runs?limit=${pageSize}&offset=${offset}`;

  const q = useQuery({
    queryKey: ["admin-intel-runs", listPath],
    queryFn: () =>
      bffJson({
        path: listPath,
        getToken: () => getToken(),
        schema: intelRunsListResponseSchema,
      }),
  });

  const pushPage = (next: number) => {
    const sp = new URLSearchParams();
    sp.set("page", String(next));
    sp.set("pageSize", String(pageSize));
    router.push(`/admin/runs?${sp.toString()}`);
  };

  const total = q.data?.total ?? 0;
  const pageCount = total === 0 ? 1 : Math.ceil(total / pageSize);
  const maxPage = Math.max(0, pageCount - 1);

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Actions</Label>
          <TriggerRunDialog getToken={() => getToken()} />
        </div>
        <p className="font-mono text-xs text-[var(--fg-3)]">
          {q.isFetching ? "Loading…" : `${total} run(s)`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Tokens in/out</th>
              <th className="px-3 py-2 font-medium">G</th>
              <th className="px-3 py-2 font-medium">Idempotency</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                <td className="px-3 py-2">
                  <Link href={`/admin/runs/${row.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    {row.status}
                  </Link>
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-[var(--fg-2)]">{row.pipeline_stage}</td>
                <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-[var(--fg-3)]">{row.model_id ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-[var(--fg-3)]">{fmtTokens(row.tokens_input, row.tokens_output)}</td>
                <td className="px-3 py-2 font-mono text-xs text-[var(--fg-3)]">
                  {row.groundedness_score != null ? String(row.groundedness_score) : "—"}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 font-mono text-[10px] text-[var(--fg-4)]">
                  {row.idempotency_key ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-4)]">{row.created_at}</td>
              </tr>
            ))}
            {q.data?.items.length === 0 && !q.isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--fg-3)]">
                  No intelligence runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => pushPage(page - 1)}>
          Previous
        </Button>
        <span className="font-mono text-xs text-[var(--fg-3)]">
          Page {page + 1} / {pageCount} (offset {offset})
        </span>
        <Button type="button" size="sm" variant="outline" disabled={page >= maxPage} onClick={() => pushPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
