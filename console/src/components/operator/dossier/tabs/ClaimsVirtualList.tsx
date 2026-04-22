"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";

import { ClaimRow } from "@/components/operator/ClaimRow";
import { MetaLabel } from "@/components/operator/MetaLabel";
import { SourceCite } from "@/components/operator/SourceCite";
import {
  claimShowsAdversarialBadge,
  flattenClaimsForVirtual,
  groupClaimsByCategory,
  pipelineStageToClaimStatus,
  type ClaimVirtualRow,
} from "@/lib/queries/claim-display";
import type { DossierClaimRow } from "@/lib/queries/schemas";

import { cn } from "@/lib/utils";

export type ClaimsVirtualListProps = {
  claims: DossierClaimRow[];
  className?: string;
};

export function ClaimsVirtualList({ claims, className }: ClaimsVirtualListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rows = React.useMemo(() => {
    const grouped = groupClaimsByCategory(claims);
    return flattenClaimsForVirtual(grouped);
  }, [claims]);

  /* TanStack Virtual's store is intentionally outside React Compiler memoization. */
  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer state is managed by TanStack
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === "header" ? 44 : 96),
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className={cn("max-h-[min(70vh,560px)] overflow-auto rounded-[var(--radius-md)] bg-surface-1/40", className)}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const item = rows[vi.index] as ClaimVirtualRow | undefined;
          if (!item) return null;
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              className="absolute top-0 left-0 w-full px-1"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              {item.kind === "header" ? (
                <div className="sticky top-0 z-[1] bg-surface pb-2 pt-4 first:pt-1">
                  <MetaLabel>{item.label}</MetaLabel>
                </div>
              ) : (
                <ClaimRow
                  status={pipelineStageToClaimStatus(item.claim.pipeline_stage)}
                  adversarial={claimShowsAdversarialBadge(item.claim)}
                  source={
                    item.claim.source_url ? (
                      <SourceCite url={item.claim.source_url} fetchedAt={item.claim.updated_at} />
                    ) : undefined
                  }
                >
                  {item.claim.claim_text}
                </ClaimRow>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
