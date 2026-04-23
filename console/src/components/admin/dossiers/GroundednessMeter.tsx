"use client";

import { cn } from "@/lib/utils";

export type GroundednessBand = "cream" | "gold" | "crimson";

/** Higher score = better grounded (cream); lower = risk (crimson). */
export function groundednessBand(score: number | null | undefined): GroundednessBand {
  if (score == null || Number.isNaN(score)) return "gold";
  if (score >= 0.72) return "cream";
  if (score >= 0.45) return "gold";
  return "crimson";
}

const bandBg: Record<GroundednessBand, string> = {
  cream: "bg-[color-mix(in_oklab,var(--tertiary)_35%,transparent)]",
  gold: "bg-[color-mix(in_oklab,var(--accent)_30%,transparent)]",
  crimson: "bg-[color-mix(in_oklab,var(--secondary)_28%,transparent)]",
};

const bandFill: Record<GroundednessBand, string> = {
  cream: "bg-[var(--tertiary)]",
  gold: "bg-[var(--accent)]",
  crimson: "bg-[var(--secondary)]",
};

export function GroundednessMeter({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const band = groundednessBand(score);
  const pct = score == null || Number.isNaN(score) ? null : Math.min(100, Math.max(0, Math.round(score * 100)));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
          Groundedness
        </span>
        <span className="font-mono text-sm tabular-nums text-[var(--fg-2)]">
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>
      <div
        className={cn(
          "h-3 w-full overflow-hidden rounded-full border border-[rgba(0,15,34,0.1)]",
          bandBg[band],
        )}
        role="meter"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Groundedness score"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", bandFill[band])}
          style={{ width: pct == null ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
