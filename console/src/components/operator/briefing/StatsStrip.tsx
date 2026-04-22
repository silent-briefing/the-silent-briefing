import * as React from "react";

import { cn } from "@/lib/utils";

export type StatsStripProps = {
  publishedClaims: number;
  intelligenceRuns: number;
  alerts: number;
  className?: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function StatsStrip({ publishedClaims, intelligenceRuns, alerts, className }: StatsStripProps) {
  const tiles = [
    {
      label: "Published claims",
      value: fmt(publishedClaims),
      meta: "Writer + human-edit lines",
      tone: "default" as const,
    },
    {
      label: "Intelligence runs",
      value: fmt(intelligenceRuns),
      meta: "All pipelines · service ledger",
      tone: "accent" as const,
    },
    {
      label: "Active alerts",
      value: fmt(alerts),
      meta: "Unread in your org",
      tone: "default" as const,
    },
  ];

  return (
    <section
      aria-label="Briefing KPIs"
      className={cn("mb-10 grid gap-4 sm:grid-cols-3", className)}
    >
      {tiles.map((s) => (
        <article
          key={s.label}
          className={cn(
            "rounded-[var(--radius-lg)] bg-surface-1 p-5 shadow-[var(--shadow-sm)]",
            s.tone === "accent" ? "ring-1 ring-[rgba(212,175,55,0.35)]" : "",
          )}
        >
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
            {s.label}
          </p>
          <p className="mt-2 font-serif text-4xl font-normal tabular-nums text-[var(--fg-1)]">
            {s.value}
          </p>
          <p className="mt-1 font-sans text-xs text-[var(--fg-3)]">{s.meta}</p>
        </article>
      ))}
    </section>
  );
}
