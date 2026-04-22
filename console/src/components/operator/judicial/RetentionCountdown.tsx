import { cn } from "@/lib/utils";

export type RetentionCountdownProps = {
  retentionYear: number | null;
  className?: string;
  /** Navy / primary gradient hero (higher-contrast cream text). */
  inverse?: boolean;
};

/** Utah retention election year — detailed countdown in a later tranche. */
export function RetentionCountdown({ retentionYear, className, inverse }: RetentionCountdownProps) {
  const muted = inverse ? "text-[var(--fg-inv-3)]" : "text-[var(--fg-3)]";
  const body = inverse ? "text-[var(--fg-inv-2)]" : "text-[var(--fg-2)]";
  const strong = inverse ? "text-[var(--fg-inv-1)]" : "text-[var(--fg-1)]";

  if (retentionYear == null) {
    return (
      <p className={cn("font-sans text-xs", muted, className)}>
        Retention cycle not on file
      </p>
    );
  }
  const y = new Date().getFullYear();
  if (retentionYear < y) {
    return (
      <p className={cn("font-sans text-xs", muted, className)}>
        Last retention ballot {retentionYear}
      </p>
    );
  }
  return (
    <p className={cn("font-sans text-xs tabular-nums", body, className)}>
      Retention year <span className={cn("font-semibold", strong)}>{retentionYear}</span>
      {retentionYear > y ? ` · ${retentionYear - y} year${retentionYear - y === 1 ? "" : "s"} out` : " · this cycle"}
    </p>
  );
}
