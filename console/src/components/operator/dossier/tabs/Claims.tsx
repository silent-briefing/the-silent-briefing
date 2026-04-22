"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { EmptyState } from "@/components/operator/EmptyState";
import { getDossierClaims } from "@/lib/queries/dossier";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { ClaimsVirtualList } from "./ClaimsVirtualList";

export type ClaimsPanelProps = {
  officialId: string;
  fetchEnabled: boolean;
};

export function ClaimsPanel({ officialId, fetchEnabled }: ClaimsPanelProps) {
  const supabase = useSupabaseBrowser();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dossier-claims", officialId],
    queryFn: () => getDossierClaims(supabase, officialId),
    enabled: fetchEnabled && Boolean(officialId),
  });

  if (!fetchEnabled) {
    return null;
  }

  if (isPending) {
    return (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading claims…
      </p>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <EmptyState role="alert">
        Could not load claims ({msg}). Check your session and try again.
      </EmptyState>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState>No published claims for this dossier yet.</EmptyState>
    );
  }

  return <ClaimsVirtualList claims={data} />;
}
