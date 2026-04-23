"use client";

import Link from "next/link";
import type { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { runBriefSchema, stageLatencySchema } from "@/lib/schemas/admin-ops";
import { cn } from "@/lib/utils";

type RunBrief = z.infer<typeof runBriefSchema>;
type Latency = z.infer<typeof stageLatencySchema>;

export function JobQueueCard({
  runsByStage,
  stageLatency,
  className,
}: {
  runsByStage: Record<string, RunBrief[]>;
  stageLatency: Latency[];
  className?: string;
}) {
  const stages = Object.keys(runsByStage).sort();
  const latMap = new Map(stageLatency.map((s) => [s.pipeline_stage, s]));

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Intel runs (recent)</p>
          <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
            Up to ten most recent rows per <span className="font-mono text-[11px]">pipeline_stage</span> (last 400-run
            scan). Avg duration uses terminal succeeded runs over the last 7 days (updated_at − created_at).
          </p>
        </div>
        <Link href="/admin/runs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open runs
        </Link>
      </div>
      <div className="mt-6 space-y-8">
        {stages.length ? (
          stages.map((stage) => (
            <div key={stage}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="font-serif text-lg font-semibold text-primary">{stage}</h3>
                {latMap.has(stage) ? (
                  <span className="font-sans text-xs text-[var(--fg-4)]">
                    avg{" "}
                    {latMap.get(stage)?.avg_duration_seconds != null
                      ? `${latMap.get(stage)!.avg_duration_seconds!.toFixed(1)}s`
                      : "—"}{" "}
                    ({latMap.get(stage)?.sample_count ?? 0} samples)
                  </span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {(runsByStage[stage] ?? []).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/runs/${encodeURIComponent(r.id)}`}
                      className="font-mono text-[11px] text-primary underline-offset-2 hover:underline"
                    >
                      {r.id.slice(0, 8)}…
                    </Link>
                    <span className="ml-2 text-xs text-[var(--fg-3)]">
                      {r.status} · {r.model_id ?? "—"} · in {r.tokens_input ?? 0} / out {r.tokens_output ?? 0} tok
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--fg-4)]">{r.created_at}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--fg-3)]">No intelligence runs found.</p>
        )}
      </div>
    </div>
  );
}
