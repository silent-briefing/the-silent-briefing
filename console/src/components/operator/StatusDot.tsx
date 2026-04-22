import * as React from "react";

import { cn } from "@/lib/utils";

export type ClaimStatus = "vetted" | "pending" | "flagged";

const statusClass: Record<ClaimStatus, string> = {
  vetted: "bg-chart-4",
  pending: "bg-chart-5",
  flagged: "bg-destructive",
};

export type StatusDotProps = {
  status: ClaimStatus;
  className?: string;
  "aria-label"?: string;
};

/** Single `rounded-full` exception for status atoms (design system). */
export function StatusDot({ status, className, "aria-label": ariaLabel }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `${status} claim`}
      className={cn("inline-block size-2 shrink-0 rounded-full", statusClass[status], className)}
    />
  );
}
