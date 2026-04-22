"use client";

import { EmptyState } from "@/components/operator/EmptyState";
import { MetaLabel } from "@/components/operator/MetaLabel";
import { SectionHeader } from "@/components/operator/SectionHeader";
import type { OfficialCardRow } from "@/lib/queries/schemas";

import { cn } from "@/lib/utils";

import { overviewKeyFacts } from "./overview-format";

export type OverviewPanelProps = {
  official: OfficialCardRow;
  jurisdictionName: string;
  className?: string;
};

export function OverviewPanel({ official, jurisdictionName, className }: OverviewPanelProps) {
  const facts = overviewKeyFacts(official, jurisdictionName);

  return (
    <div className={cn("space-y-10", className)}>
      <dl className="grid gap-6 sm:grid-cols-2">
        <div>
          <MetaLabel className="mb-1 block">Jurisdiction</MetaLabel>
          <dd className="font-sans text-sm text-foreground">{facts.jurisdictionName}</dd>
        </div>
        <div>
          <MetaLabel className="mb-1 block">Office</MetaLabel>
          <dd className="font-sans text-sm capitalize text-foreground">{facts.officeLabel}</dd>
        </div>
        <div>
          <MetaLabel className="mb-1 block">Status</MetaLabel>
          <dd className="font-sans text-sm text-foreground">
            {facts.isCurrent ? "Currently serving" : "Not currently in this office"}
          </dd>
        </div>
        {facts.retentionYear != null ? (
          <div>
            <MetaLabel className="mb-1 block">Retention cycle</MetaLabel>
            <dd className="font-sans text-sm tabular-nums text-foreground">{facts.retentionYear}</dd>
          </div>
        ) : null}
        {facts.alignment ? (
          <div className="sm:col-span-2">
            <MetaLabel className="mb-1 block">Subject alignment</MetaLabel>
            <dd className="font-sans text-sm text-foreground">{facts.alignment}</dd>
          </div>
        ) : null}
      </dl>

      <section aria-labelledby="overview-bio-heading">
        <SectionHeader id="overview-bio-heading" className="mb-3">
          Biography
        </SectionHeader>
        {official.bio_summary?.trim() ? (
          <p className="font-serif text-base leading-relaxed text-foreground">{official.bio_summary}</p>
        ) : (
          <EmptyState>No biography on file for this official yet.</EmptyState>
        )}
      </section>

      <p className="font-serif text-sm italic leading-relaxed text-muted-foreground">
        Term start/end dates and filing cross-links will appear here when the dossier detail query
        expands beyond the roster card.
      </p>
    </div>
  );
}
