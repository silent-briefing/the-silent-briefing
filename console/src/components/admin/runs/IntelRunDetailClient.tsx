"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { intelRunDetailResponseSchema, isTerminalRunStatus } from "@/lib/schemas/admin-runs";
import { bffJson } from "@/lib/bff/client";
import { cn } from "@/lib/utils";

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function IntelRunDetailClient({
  runId,
  className,
}: {
  runId: string;
  className?: string;
}) {
  const { getToken } = useAuth();

  const q = useQuery({
    queryKey: ["admin-intel-run", runId],
    queryFn: () =>
      bffJson({
        path: `/v1/admin/runs/${runId}`,
        getToken: () => getToken(),
        schema: intelRunDetailResponseSchema,
      }),
    refetchInterval: (query) => {
      const st = query.state.data?.run.status;
      if (!st || isTerminalRunStatus(st)) return false;
      return 3000;
    },
  });

  const run = q.data?.run;

  const retryCount = React.useMemo(() => {
    const m = run?.metadata;
    if (m && typeof m === "object" && "retry_count" in m) {
      const v = (m as Record<string, unknown>).retry_count;
      return typeof v === "number" ? v : 0;
    }
    return 0;
  }, [run?.metadata]);

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/runs" className="font-sans text-sm text-primary underline-offset-4 hover:underline">
            ← All runs
          </Link>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-primary">Intel run</h1>
          <p className="mt-1 font-mono text-sm text-[var(--fg-3)]">{runId}</p>
        </div>
        {run ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 font-mono text-xs text-[var(--fg-2)]">
            <div>
              <span className="text-[var(--fg-4)]">status</span> {run.status}
            </div>
            <div>
              <span className="text-[var(--fg-4)]">stage</span> {run.pipeline_stage}
            </div>
            <div>
              <span className="text-[var(--fg-4)]">retries</span> {retryCount}
            </div>
          </div>
        ) : null}
      </div>

      {q.isLoading ? <p className="text-sm text-[var(--fg-3)]">Loading…</p> : null}
      {q.isError ? <p className="text-sm text-[var(--secondary)]">Could not load run.</p> : null}

      {run ? (
        <>
          <section className="space-y-2">
            <h2 className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Timing</h2>
            <div className="grid gap-2 font-mono text-xs text-[var(--fg-2)] sm:grid-cols-2">
              <div>
                created_at: <span className="text-[var(--fg-3)]">{run.created_at}</span>
              </div>
              <div>
                updated_at: <span className="text-[var(--fg-3)]">{run.updated_at}</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Cost / tokens</h2>
            <div className="grid gap-2 font-mono text-xs text-[var(--fg-2)] sm:grid-cols-3">
              <div>tokens_in: {run.tokens_input ?? "—"}</div>
              <div>tokens_out: {run.tokens_output ?? "—"}</div>
              <div>cost_usd: {run.cost_usd != null ? String(run.cost_usd) : "—"}</div>
              <div>groundedness: {run.groundedness_score != null ? String(run.groundedness_score) : "—"}</div>
            </div>
          </section>

          {run.error_message ? (
            <section className="space-y-2">
              <h2 className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--secondary)]">Error</h2>
              <pre className="overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--fg-2)]">
                {run.error_message}
              </pre>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Metadata</h2>
            <pre className="max-h-[320px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--fg-2)]">
              {prettyJson(run.metadata ?? {})}
            </pre>
          </section>

          <section className="space-y-2">
            <h2 className="font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Raw response / logs</h2>
            <pre className="max-h-[480px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--fg-2)]">
              {prettyJson(run.raw_response ?? null)}
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}
