import * as React from "react";

import { cn } from "@/lib/utils";

export type BriefingHeroProps = {
  /** e.g. "Tuesday, April 21" in America/Denver */
  headlineDate: string;
  /** Ribbon timestamp, Mountain Time */
  timestampLine: string;
  summary: string;
  className?: string;
};

export function BriefingHero({
  headlineDate,
  timestampLine,
  summary,
  className,
}: BriefingHeroProps) {
  return (
    <div className={cn("mb-10 max-w-[720px]", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-px w-7 bg-tertiary" aria-hidden />
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
          Morning brief · {timestampLine}
        </p>
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-[-0.02em] text-[var(--fg-1)] md:text-[56px]">
        Morning brief — {headlineDate}
      </h1>
      <p className="mt-4 max-w-[620px] font-sans text-[17px] leading-relaxed text-[var(--fg-3)]">
        {summary}
      </p>
    </div>
  );
}
