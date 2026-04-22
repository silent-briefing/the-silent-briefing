import * as React from "react";

import type { IntelligenceRunRow } from "@/lib/queries/briefing";
import { cn } from "@/lib/utils";

import { EmptyState } from "../EmptyState";
import { SectionHeader } from "../SectionHeader";

export type LiveExtractionLogProps = {
  runs: IntelligenceRunRow[];
  className?: string;
};

function formatMt(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function LiveExtractionLog({ runs, className }: LiveExtractionLogProps) {
  return (
    <section className={cn("mt-10", className)} aria-labelledby="extraction-log-heading">
      <SectionHeader id="extraction-log-heading" className="mb-4 text-[var(--fg-1)]">
        Live extraction log
      </SectionHeader>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-surface-1 shadow-[var(--shadow-sm)]">
        {runs.length === 0 ? (
          <div className="p-6">
            <EmptyState>No recent intelligence runs. Trigger a worker pass or sign in for BFF-backed tail.</EmptyState>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-[var(--fg-4)]/20 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Time (MT)
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Stage
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Review
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--fg-4)]/10 text-[var(--fg-2)] last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--fg-3)]">
                    {formatMt(r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[var(--fg-1)]">{r.pipeline_stage}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3">{r.requires_human_review ? "Yes" : "—"}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-[var(--fg-3)]" title={r.error_message ?? ""}>
                    {r.error_message ?? (r.official_id ? `Official ${r.official_id.slice(0, 8)}…` : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
