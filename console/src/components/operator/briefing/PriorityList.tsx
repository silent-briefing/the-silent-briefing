import * as React from "react";
import Link from "next/link";

import type { BriefingPriorityItem } from "@/lib/queries/briefing";
import { cn } from "@/lib/utils";

import { EmptyState } from "../EmptyState";
import { SectionHeader } from "../SectionHeader";

export type PriorityListProps = {
  items: BriefingPriorityItem[];
  className?: string;
};

function reasonLabel(reasons: BriefingPriorityItem["reasons"]): string {
  const parts: string[] = [];
  if (reasons.includes("adversarial")) parts.push("Adversarial");
  if (reasons.includes("retention")) parts.push("Retention window");
  return parts.join(" · ");
}

export function PriorityList({ items, className }: PriorityListProps) {
  return (
    <section className={cn(className)} aria-labelledby="priority-dossiers-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionHeader id="priority-dossiers-heading" className="text-[var(--fg-1)]">
          Priority dossiers
        </SectionHeader>
        <span className="font-sans text-xs text-[var(--fg-4)]">Utah supreme roster</span>
      </div>
      <div className="rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        {items.length === 0 ? (
          <EmptyState>No adversarial flags or near-term retention signals on the current roster.</EmptyState>
        ) : (
          <ul className="divide-y divide-[var(--fg-4)]/15">
            {items.map(({ official, reasons }) => (
              <li key={official.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link
                    href={`/judicial/${official.slug}`}
                    className="font-serif text-lg font-medium text-[var(--fg-1)] underline-offset-4 hover:underline"
                  >
                    {official.full_name}
                  </Link>
                  <p className="mt-1 font-sans text-sm text-[var(--fg-3)]">
                    {reasonLabel(reasons)}
                    {official.retention_year != null ? ` · Retention ${official.retention_year}` : null}
                  </p>
                </div>
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
                  {official.subject_alignment ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
