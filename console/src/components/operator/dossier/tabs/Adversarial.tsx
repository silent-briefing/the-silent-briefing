"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/operator/EmptyState";
import { getAdversarialFlags } from "@/lib/queries/dossier";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { AdversarialIssueCard } from "./AdversarialIssueCard";

export type AdversarialPanelProps = {
  officialId: string;
  fetchEnabled: boolean;
};

export function AdversarialPanel({ officialId, fetchEnabled }: AdversarialPanelProps) {
  const supabase = useSupabaseBrowser();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dossier-adversarial", officialId],
    queryFn: () => getAdversarialFlags(supabase, officialId),
    enabled: fetchEnabled && Boolean(officialId),
  });

  if (!fetchEnabled) {
    return null;
  }

  if (isPending) {
    return (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading adversarial review…
      </p>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <EmptyState role="alert">
        Could not load adversarial data ({msg}). Check your session and try again.
      </EmptyState>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState>
        No claims flagged for adversarial review on this dossier. Flags appear when metadata marks a
        line for review or the category references adversarial work.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <p className="font-serif text-sm italic leading-relaxed text-muted-foreground">
        Split view: vetted claim alongside groundedness, critique, and synthesis fragments stored on
        the claim row. Full intelligence-run trace ships with Phase C observability.
      </p>
      <div className="space-y-8">
        {data.map((claim) => (
          <AdversarialIssueCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}
