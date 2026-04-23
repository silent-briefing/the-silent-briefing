"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dossierQueuePath } from "@/lib/admin/dossier-queue-query";
import { bffJson } from "@/lib/bff/client";
import { dossierQueueResponseSchema } from "@/lib/schemas/admin-dossier";
import { cn } from "@/lib/utils";

export function DossierQueueClient({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const filterKey = `${searchParams.get("category") ?? ""}|${searchParams.get("max_g") ?? ""}|${searchParams.get("needs_review") ?? ""}`;
  return (
    <DossierQueueInner
      key={filterKey}
      className={className}
      initialCategory={searchParams.get("category") ?? ""}
      initialMaxG={searchParams.get("max_g") ?? ""}
    />
  );
}

function DossierQueueInner({
  className,
  initialCategory,
  initialMaxG,
}: {
  className?: string;
  initialCategory: string;
  initialMaxG: string;
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10) || 25));
  const needsReview = searchParams.get("needs_review") !== "0";
  const [categoryDraft, setCategoryDraft] = React.useState(initialCategory);
  const [maxGDraft, setMaxGDraft] = React.useState(initialMaxG);

  const listPath = React.useMemo(() => {
    const maxG = maxGDraft.trim() === "" ? undefined : Number(maxGDraft);
    return dossierQueuePath({
      page,
      pageSize,
      needsReview,
      category: categoryDraft.trim() || undefined,
      maxGroundedness: maxG != null && !Number.isNaN(maxG) ? maxG : undefined,
    });
  }, [page, pageSize, needsReview, categoryDraft, maxGDraft]);

  const q = useQuery({
    queryKey: ["admin-dossier-queue", listPath],
    queryFn: () =>
      bffJson({
        path: listPath,
        getToken: () => getToken(),
        schema: dossierQueueResponseSchema,
      }),
  });

  const pushFilters = (next: { page?: number; needsReview?: boolean }) => {
    const sp = new URLSearchParams();
    sp.set("page", String(next.page ?? 0));
    sp.set("pageSize", String(pageSize));
    sp.set("needs_review", (next.needsReview ?? needsReview) ? "1" : "0");
    if (categoryDraft.trim()) sp.set("category", categoryDraft.trim());
    if (maxGDraft.trim()) sp.set("max_g", maxGDraft.trim());
    router.push(`/admin/dossiers?${sp.toString()}`);
  };

  const total = q.data?.total ?? 0;
  const pageCount = total === 0 ? 1 : Math.ceil(total / pageSize);
  const maxPage = Math.max(0, pageCount - 1);

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Needs review</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={needsReview ? "default" : "outline"}
              onClick={() => pushFilters({ needsReview: true, page: 0 })}
            >
              Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!needsReview ? "default" : "outline"}
              onClick={() => pushFilters({ needsReview: false, page: 0 })}
            >
              All
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-cat">Category</Label>
          <Input
            id="q-cat"
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            className="w-48 border-[rgba(0,15,34,0.12)] bg-surface"
            placeholder="Exact match"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-maxg">Max groundedness</Label>
          <Input
            id="q-maxg"
            value={maxGDraft}
            onChange={(e) => setMaxGDraft(e.target.value)}
            className="w-32 border-[rgba(0,15,34,0.12)] bg-surface"
            placeholder="e.g. 0.7"
            inputMode="decimal"
          />
        </div>
        <Button type="button" onClick={() => pushFilters({ page: 0 })}>
          Apply filters
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[rgba(0,15,34,0.08)]">
        {q.isLoading ? (
          <p className="p-6 font-sans text-sm text-[var(--fg-3)]">Loading queue…</p>
        ) : q.isError ? (
          <p className="p-6 font-sans text-sm text-destructive">Could not load queue.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="border-b border-[rgba(0,15,34,0.08)] bg-surface-1 font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
              <tr>
                <th className="px-4 py-3">Official</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[rgba(0,15,34,0.06)] odd:bg-surface even:bg-surface-1/50"
                >
                  <td className="px-4 py-3 text-[var(--fg-2)]">
                    {row.official_id ? (
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/admin/dossiers/${row.official_id}`}
                      >
                        {row.officials?.full_name ?? row.official_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {row.groundedness_score == null ? "—" : row.groundedness_score.toFixed(2)}
                  </td>
                  <td className="max-w-md truncate px-4 py-3 text-[var(--fg-3)]">{row.claim_text}</td>
                  <td className="px-4 py-3 text-right">
                    {row.official_id ? (
                      <Link
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        href={`/admin/dossiers/${row.official_id}?claim=${row.id}`}
                      >
                        Review
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--fg-3)]">
          {total.toLocaleString()} row{total === 1 ? "" : "s"} · page {page + 1} of {maxPage + 1}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={page <= 0} onClick={() => pushFilters({ page: page - 1 })}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= maxPage}
            onClick={() => pushFilters({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
