"use client";

import type { z } from "zod";

import { dataQualitySchema } from "@/lib/schemas/admin-ops";
import { cn } from "@/lib/utils";

type DQ = z.infer<typeof dataQualitySchema>;

export function DataQualityCard({ data, className }: { data: DQ; className?: string }) {
  const withoutClaims = Math.max(0, data.current_officials_total - data.distinct_officials_with_claims);

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4", className)}>
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Data quality</p>
      <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
        Claim coverage uses a bounded scan of <span className="font-mono text-[11px]">dossier_claims</span>{" "}
        {data.claims_scan_truncated ? (
          <span className="text-[var(--secondary)]">(scan truncated — lower bound only)</span>
        ) : (
          "(full scan within cap)"
        )}
        . Staleness uses the first {data.stale_officials_sample_size} current officials vs{" "}
        <span className="font-mono text-[11px]">RETRIEVAL_STALE_DAYS</span>={data.retrieval_stale_days}.
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
            Claims without official
          </dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-primary">
            {data.dossier_claims_without_official}
          </dd>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
            Current officials (total)
          </dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-primary">{data.current_officials_total}</dd>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
            Officials with ≥1 claim (distinct ids)
          </dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-primary">
            {data.distinct_officials_with_claims}
          </dd>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
            Officials likely without claims
          </dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-primary">{withoutClaims}</dd>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:col-span-2">
          <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
            Stale retrieval (sample)
          </dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-primary">
            {data.stale_officials_in_sample}
            <span className="ml-2 font-sans text-sm font-normal text-[var(--fg-3)]">
              / {data.stale_officials_sample_size} scanned
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
