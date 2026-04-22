import { ClaimRow } from "@/components/operator/ClaimRow";
import { MetaLabel } from "@/components/operator/MetaLabel";
import { SourceCite } from "@/components/operator/SourceCite";
import {
  claimShowsAdversarialBadge,
  pipelineStageToClaimStatus,
} from "@/lib/queries/claim-display";
import type { TimelineDayGroup } from "@/lib/queries/timeline-display";
import type { DossierClaimRow } from "@/lib/queries/schemas";

import { cn } from "@/lib/utils";

export type TimelineDaySectionProps = {
  group: TimelineDayGroup;
  className?: string;
};

function ClaimEntry({ claim }: { claim: DossierClaimRow }) {
  const t = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    timeStyle: "short",
  }).format(new Date(claim.created_at));

  return (
    <ClaimRow
      status={pipelineStageToClaimStatus(claim.pipeline_stage)}
      adversarial={claimShowsAdversarialBadge(claim)}
      source={
        <div className="space-y-0.5">
          <p className="font-sans text-xs tabular-nums text-muted-foreground">{t}</p>
          {claim.source_url ? (
            <SourceCite url={claim.source_url} fetchedAt={claim.updated_at} />
          ) : null}
        </div>
      }
    >
      {claim.claim_text}
    </ClaimRow>
  );
}

export function TimelineDaySection({ group, className }: TimelineDaySectionProps) {
  return (
    <div
      className={cn(
        "relative border-l-2 border-[rgba(212,175,55,0.35)] pl-4",
        className,
      )}
    >
      <MetaLabel className="mb-3 block text-foreground">{group.heading}</MetaLabel>
      <ul className="list-none space-y-1 p-0">
        {group.claims.map((c) => (
          <li key={c.id}>
            <ClaimEntry claim={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
