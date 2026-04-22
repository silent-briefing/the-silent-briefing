"use client";

import Link from "next/link";

import type { OfficialCardRow } from "@/lib/queries/schemas";
import { pairKeySlug } from "@/lib/queries/compare-slugs";
import { overviewKeyFacts } from "@/components/operator/dossier/tabs/overview-format";
import { cn } from "@/lib/utils";

export type CompareMatrixProps = {
  officials: OfficialCardRow[];
  jurisdictionLabels: Map<string, string>;
  sharedPairs: Set<string>;
};

export function CompareMatrix({ officials, jurisdictionLabels, sharedPairs }: CompareMatrixProps) {
  const gridCols =
    officials.length >= 4 ? "xl:grid-cols-4" : officials.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div
      className={cn("compare-matrix-root grid gap-6", gridCols)}
      data-testid="compare-matrix"
    >
      {officials.map((o) => {
        const jur = jurisdictionLabels.get(o.jurisdiction_id) ?? "—";
        const facts = overviewKeyFacts(o, jur);
        const graphLinked = officials.some(
          (other) => other.slug !== o.slug && sharedPairs.has(pairKeySlug(o.slug, other.slug)),
        );

        return (
          <article
            key={o.id}
            className={cn(
              "compare-matrix-panel flex flex-col rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]",
              graphLinked && "shadow-[inset_4px_0_0_var(--tertiary)]",
            )}
          >
            <h2 className="compare-headline font-serif text-2xl font-normal text-[var(--fg-1)]">
              {o.full_name}
            </h2>
            <p className="mt-1 font-mono text-xs text-[var(--fg-4)]">{o.slug}</p>
            {graphLinked ? (
              <p className="mt-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--tertiary)]">
                Graph link · shared accepted edge
              </p>
            ) : null}

            <dl className="compare-body mt-6 space-y-3 font-sans text-sm text-[var(--fg-2)]">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Jurisdiction
                </dt>
                <dd>{facts.jurisdictionName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">Office</dt>
                <dd>{facts.officeLabel}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">Party</dt>
                <dd>{o.party ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Alignment
                </dt>
                <dd>{facts.alignment ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Retention
                </dt>
                <dd>{facts.retentionYear ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">Status</dt>
                <dd>{facts.isCurrent ? "Current" : "Former"}</dd>
              </div>
            </dl>

            {o.bio_summary ? (
              <p className="compare-body mt-4 border-t border-[rgba(212,175,55,0.15)] pt-4 font-serif text-sm leading-relaxed text-[var(--fg-3)]">
                {o.bio_summary}
              </p>
            ) : null}

            <Link
              href={`/officials/${o.slug}`}
              className="compare-no-print mt-auto pt-6 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--tertiary)] hover:underline"
            >
              Open dossier →
            </Link>
          </article>
        );
      })}
    </div>
  );
}
