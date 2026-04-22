import { MetaLabel } from "@/components/operator/MetaLabel";
import { SectionHeader } from "@/components/operator/SectionHeader";
import { SourceCite } from "@/components/operator/SourceCite";
import {
  extractCritiqueForDisplay,
  extractSynthesisForDisplay,
  formatGroundednessLabel,
} from "@/lib/queries/adversarial-display";
import type { DossierClaimRow } from "@/lib/queries/schemas";

import { cn } from "@/lib/utils";

export type AdversarialIssueCardProps = {
  claim: DossierClaimRow;
  className?: string;
};

export function AdversarialIssueCard({ claim, className }: AdversarialIssueCardProps) {
  const critique = extractCritiqueForDisplay(claim.metadata);
  const synthesis = extractSynthesisForDisplay(claim.metadata);
  const groundedness = formatGroundednessLabel(claim.groundedness_score);

  return (
    <article
      className={cn(
        "rounded-[var(--radius-md)] bg-surface-1/50 px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6",
        className,
      )}
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 space-y-3">
          <MetaLabel className="text-foreground">{claim.category}</MetaLabel>
          <SectionHeader className="text-lg sm:text-xl">Claim</SectionHeader>
          <p className="font-sans text-[15px] leading-snug text-foreground">{claim.claim_text}</p>
          {claim.source_url ? (
            <SourceCite url={claim.source_url} fetchedAt={claim.updated_at} />
          ) : null}
        </div>
        <div className="min-w-0 space-y-4 lg:pl-4">
          <div>
            <MetaLabel className="mb-1 block">Groundedness</MetaLabel>
            <p className="font-sans text-2xl font-semibold tabular-nums text-foreground">{groundedness}</p>
          </div>
          <div>
            <MetaLabel className="mb-1 block">Critique</MetaLabel>
            {critique ? (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {critique}
              </pre>
            ) : (
              <p className="font-serif text-sm italic text-muted-foreground">No critique text on file.</p>
            )}
          </div>
          <div>
            <MetaLabel className="mb-1 block">Synthesis</MetaLabel>
            {synthesis ? (
              <p className="font-sans text-sm leading-relaxed text-foreground">{synthesis}</p>
            ) : (
              <p className="font-serif text-sm italic text-muted-foreground">No synthesis excerpt on file.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
