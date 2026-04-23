"use client";

import type { z } from "zod";

import { extractionSourceStatSchema, failedRunItemSchema } from "@/lib/schemas/admin-ops";
import { cn } from "@/lib/utils";

type SourceStat = z.infer<typeof extractionSourceStatSchema>;
type Failed = z.infer<typeof failedRunItemSchema>;

export function ExtractionHealth({
  extractionBySource,
  recentFailedRuns,
  className,
}: {
  extractionBySource: SourceStat[];
  recentFailedRuns: Failed[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4", className)}>
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">RAG / extraction (by source_type)</p>
      <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
        Last fetch times come from recent <span className="font-mono text-[11px]">rag_chunks</span> samples. Pipeline
        failures below are the latest <span className="font-mono text-[11px]">intelligence_runs</span> errors (all
        stages).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="py-2 pr-3 font-medium">Source type</th>
              <th className="py-2 pr-3 font-medium">Last fetched</th>
              <th className="py-2 font-medium">Sample rows</th>
            </tr>
          </thead>
          <tbody>
            {extractionBySource.length ? (
              extractionBySource.map((row) => (
                <tr key={row.source_type} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs text-primary">{row.source_type}</td>
                  <td className="py-2 pr-3 text-[var(--fg-3)]">{row.last_fetched_at ?? "—"}</td>
                  <td className="py-2 text-[var(--fg-3)]">{row.sample_chunks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-[var(--fg-3)]">
                  No rag chunk samples yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Recent failed runs</p>
        <ul className="mt-2 space-y-2">
          {recentFailedRuns.length ? (
            recentFailedRuns.map((f) => (
              <li
                key={f.id}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--fg-2)]"
              >
                <span className="text-[var(--fg-4)]">{f.created_at ?? ""}</span> ·{" "}
                <span className="text-primary">{f.pipeline_stage}</span> · {f.id}
                {f.error_message ? (
                  <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-[var(--secondary)]">
                    {f.error_message}
                  </pre>
                ) : null}
              </li>
            ))
          ) : (
            <li className="text-sm text-[var(--fg-3)]">No failed runs in the recent window.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
