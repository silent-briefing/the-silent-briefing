"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffJson } from "@/lib/bff/client";
import {
  ADMIN_CORRELATIONS_QUERY_PREFIX,
  proposedEdgesResponseSchema,
} from "@/lib/schemas/admin-correlations";
import { cn } from "@/lib/utils";

import { BatchBar } from "./BatchBar";
import { EdgeCard } from "./EdgeCard";

function buildPath(params: {
  page: number;
  pageSize: number;
  minC: string;
  maxC: string;
  relation: string;
  sourceId: string;
  targetId: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("limit", String(params.pageSize));
  sp.set("offset", String(params.page * params.pageSize));
  if (params.minC.trim()) sp.set("min_confidence", params.minC.trim());
  if (params.maxC.trim()) sp.set("max_confidence", params.maxC.trim());
  if (params.relation.trim()) sp.set("relation", params.relation.trim());
  if (params.sourceId.trim()) sp.set("source_entity_id", params.sourceId.trim());
  if (params.targetId.trim()) sp.set("target_entity_id", params.targetId.trim());
  return `/v1/admin/correlations/proposed?${sp.toString()}`;
}

export function CorrelationsQueueClient({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));

  const filterKey = `${searchParams.get("min_c") ?? ""}|${searchParams.get("max_c") ?? ""}|${searchParams.get("rel") ?? ""}|${searchParams.get("src") ?? ""}|${searchParams.get("tgt") ?? ""}`;
  return (
    <CorrelationsQueueInner
      key={filterKey}
      className={className}
      page={page}
      pageSize={pageSize}
      initialMinC={searchParams.get("min_c") ?? ""}
      initialMaxC={searchParams.get("max_c") ?? ""}
      initialRelation={searchParams.get("rel") ?? ""}
      initialSource={searchParams.get("src") ?? ""}
      initialTarget={searchParams.get("tgt") ?? ""}
      router={router}
    />
  );
}

function CorrelationsQueueInner({
  className,
  page,
  pageSize,
  initialMinC,
  initialMaxC,
  initialRelation,
  initialSource,
  initialTarget,
  router,
}: {
  className?: string;
  page: number;
  pageSize: number;
  initialMinC: string;
  initialMaxC: string;
  initialRelation: string;
  initialSource: string;
  initialTarget: string;
  router: ReturnType<typeof useRouter>;
}) {
  const { getToken } = useAuth();
  const [minCDraft, setMinCDraft] = React.useState(initialMinC);
  const [maxCDraft, setMaxCDraft] = React.useState(initialMaxC);
  const [relDraft, setRelDraft] = React.useState(initialRelation);
  const [srcDraft, setSrcDraft] = React.useState(initialSource);
  const [tgtDraft, setTgtDraft] = React.useState(initialTarget);

  const listPath = React.useMemo(
    () =>
      buildPath({
        page,
        pageSize,
        minC: minCDraft,
        maxC: maxCDraft,
        relation: relDraft,
        sourceId: srcDraft,
        targetId: tgtDraft,
      }),
    [page, pageSize, minCDraft, maxCDraft, relDraft, srcDraft, tgtDraft],
  );

  const q = useQuery({
    queryKey: [ADMIN_CORRELATIONS_QUERY_PREFIX, listPath],
    queryFn: () =>
      bffJson({
        path: listPath,
        getToken: () => getToken(),
        schema: proposedEdgesResponseSchema,
      }),
  });

  const push = (next: { page?: number }) => {
    const sp = new URLSearchParams();
    sp.set("page", String(next.page ?? page));
    sp.set("pageSize", String(pageSize));
    if (minCDraft.trim()) sp.set("min_c", minCDraft.trim());
    if (maxCDraft.trim()) sp.set("max_c", maxCDraft.trim());
    if (relDraft.trim()) sp.set("rel", relDraft.trim());
    if (srcDraft.trim()) sp.set("src", srcDraft.trim());
    if (tgtDraft.trim()) sp.set("tgt", tgtDraft.trim());
    router.push(`/admin/correlations?${sp.toString()}`);
  };

  const applyFilters = () => push({ page: 0 });

  const total = q.data?.total ?? 0;
  const pageCount = total === 0 ? 1 : Math.ceil(total / pageSize);
  const maxPage = Math.max(0, pageCount - 1);

  return (
    <div className={cn("space-y-10", className)}>
      <BatchBar />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Min conf.</Label>
          <Input className="w-24 font-mono text-sm" value={minCDraft} onChange={(e) => setMinCDraft(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Max conf.</Label>
          <Input className="w-24 font-mono text-sm" value={maxCDraft} onChange={(e) => setMaxCDraft(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Relation</Label>
          <Input
            className="w-40 font-mono text-sm"
            value={relDraft}
            onChange={(e) => setRelDraft(e.target.value)}
            placeholder="exact match"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Source entity id</Label>
          <Input className="w-64 font-mono text-xs" value={srcDraft} onChange={(e) => setSrcDraft(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Target entity id</Label>
          <Input className="w-64 font-mono text-xs" value={tgtDraft} onChange={(e) => setTgtDraft(e.target.value)} />
        </div>
        <Button type="button" size="sm" onClick={applyFilters}>
          Apply filters
        </Button>
      </div>

      <p className="font-mono text-xs text-[var(--fg-3)]">
        {q.isFetching ? "Loading…" : `${total} proposed edge(s)`}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {(q.data?.items ?? []).map((edge) => (
          <EdgeCard key={edge.id} edge={edge} />
        ))}
      </div>

      {q.data?.items.length === 0 && !q.isLoading ? (
        <p className="text-center text-sm text-[var(--fg-3)]">No proposed edges match these filters.</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => push({ page: page - 1 })}>
          Previous
        </Button>
        <span className="font-mono text-xs text-[var(--fg-3)]">
          Page {page + 1} / {pageCount}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= maxPage}
          onClick={() => push({ page: page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
