"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/operator/EmptyState";
import { getTimeline } from "@/lib/queries/dossier";
import { groupClaimsByDenverDay } from "@/lib/queries/timeline-display";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { TimelineDaySection } from "./TimelineDaySection";

export type TimelinePanelProps = {
  officialId: string;
  fetchEnabled: boolean;
};

export function TimelinePanel({ officialId, fetchEnabled }: TimelinePanelProps) {
  const supabase = useSupabaseBrowser();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dossier-timeline", officialId],
    queryFn: () => getTimeline(supabase, officialId),
    enabled: fetchEnabled && Boolean(officialId),
  });

  if (!fetchEnabled) {
    return null;
  }

  if (isPending) {
    return (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading timeline…
      </p>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <EmptyState role="alert">
        Could not load timeline ({msg}). Check your session and try again.
      </EmptyState>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState>
        No published claims on this timeline yet. Opinions, media coverage, and intel runs will
        appear here as operator reads expand.
      </EmptyState>
    );
  }

  const groups = groupClaimsByDenverDay(data);

  return (
    <div className="space-y-8">
      <p className="font-serif text-sm italic leading-relaxed text-muted-foreground">
        Chronological published dossier claims (Mountain Time). Additional event types merge here in
        later phases.
      </p>
      <div className="space-y-10">
        {groups.map((g) => (
          <TimelineDaySection key={g.dayKey} group={g} />
        ))}
      </div>
    </div>
  );
}
