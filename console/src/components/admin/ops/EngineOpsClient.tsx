"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { bffJson } from "@/lib/bff/client";
import { opsSummaryResponseSchema } from "@/lib/schemas/admin-ops";
import { cn } from "@/lib/utils";

import { DataQualityCard } from "./DataQualityCard";
import { ExtractionHealth } from "./ExtractionHealth";
import { JobQueueCard } from "./JobQueueCard";

export function EngineOpsClient({ className }: { className?: string }) {
  const { getToken } = useAuth();

  const q = useQuery({
    queryKey: ["admin-ops-summary"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/ops/summary",
        getToken: () => getToken(),
        schema: opsSummaryResponseSchema,
      }),
    refetchInterval: 60_000,
  });

  if (q.isLoading) {
    return <p className={cn("font-sans text-sm text-[var(--fg-3)]", className)}>Loading ops summary…</p>;
  }
  if (q.isError || !q.data) {
    return (
      <p className={cn("font-sans text-sm text-[var(--secondary)]", className)}>
        Could not load ops summary. Check BFF and admin role.
      </p>
    );
  }

  const d = q.data;
  const workerOk = Boolean(d.worker_cli?.ok);
  const studio = d.links?.supabase_studio;
  const sentry = d.links?.sentry_issues;

  return (
    <div className={cn("space-y-10", className)}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">API</p>
          <p className="mt-2 font-serif text-xl font-semibold text-primary">{d.api_status}</p>
          <p className="mt-1 font-mono text-xs text-[var(--fg-3)]">v{d.api_version}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Worker CLI</p>
          <p className={cn("mt-2 font-serif text-xl font-semibold", workerOk ? "text-primary" : "text-[var(--secondary)]")}>
            {workerOk ? "Reachable" : "Check failed"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--fg-4)]">
            exit {String(d.worker_cli?.exit_code ?? "—")}
          </p>
          {typeof d.worker_cli?.detail === "string" && d.worker_cli.detail ? (
            <pre className="mt-2 max-h-24 overflow-auto text-[10px] text-[var(--fg-3)]">{d.worker_cli.detail}</pre>
          ) : null}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Perplexity (24h runs)</p>
          <p className="mt-2 font-serif text-xl font-semibold text-primary">
            {d.perplexity_last_24h.tokens_total.toLocaleString()} tok
          </p>
          <p className="mt-1 font-sans text-xs text-[var(--fg-3)]">
            in {d.perplexity_last_24h.tokens_input.toLocaleString()} / out{" "}
            {d.perplexity_last_24h.tokens_output.toLocaleString()}
            {d.perplexity_last_24h.truncated_sample ? (
              <span className="text-[var(--secondary)]"> · sample capped</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {studio ? (
          <a
            href={studio}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Supabase Studio
          </a>
        ) : (
          <span className="font-sans text-sm text-[var(--fg-3)]">Studio link unavailable for this SUPABASE_URL.</span>
        )}
        {sentry ? (
          <a
            href={sentry}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Sentry issues
          </a>
        ) : (
          <span className="font-sans text-xs text-[var(--fg-4)]">
            Set <span className="font-mono">SENTRY_ISSUES_URL</span> or{" "}
            <span className="font-mono">SENTRY_ORG_SLUG</span> +{" "}
            <span className="font-mono">SENTRY_PROJECT_SLUG</span>.
          </span>
        )}
        <Link href="/admin/runs" className={buttonVariants({ variant: "default", size: "sm" })}>
          Trigger runs
        </Link>
      </div>

      <DataQualityCard data={d.data_quality} />
      <ExtractionHealth extractionBySource={d.extraction_by_source} recentFailedRuns={d.recent_failed_runs} />
      <JobQueueCard runsByStage={d.runs_by_stage} stageLatency={d.stage_latency} />
    </div>
  );
}
