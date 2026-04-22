"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { EmptyState } from "@/components/operator/EmptyState";
import { fetchOfficialFeedsViaBff } from "@/lib/queries/feeds";

import { FeedItemRow } from "./FeedItemRow";

export type FeedPanelProps = {
  officialId: string;
  fetchEnabled: boolean;
};

export function FeedPanel({ officialId, fetchEnabled }: FeedPanelProps) {
  const { getToken } = useAuth();
  const getBffToken = React.useCallback(async () => {
    const t = await getToken();
    return t ?? null;
  }, [getToken]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["official-feeds", officialId],
    queryFn: () => fetchOfficialFeedsViaBff(getBffToken, officialId),
    enabled: fetchEnabled && Boolean(officialId),
  });

  if (!fetchEnabled) {
    return null;
  }

  if (isPending) {
    return (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading feeds…
      </p>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <EmptyState role="alert">
        Could not load feeds ({msg}). Check BFF URL, sign-in, and try again.
      </EmptyState>
    );
  }

  if (!data?.items.length) {
    return (
      <EmptyState>
        No syndicated headlines for this official yet. X and Perplexity aggregation lands in Phase
        B.11; this tab is wired to the BFF now.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {data.items.map((item, i) => (
        <FeedItemRow key={`${item.url}-${i}`} item={item} />
      ))}
    </div>
  );
}
