import * as React from "react";
import { AlertTriangleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ClaimStatus } from "./StatusDot";
import { StatusDot } from "./StatusDot";

export type ClaimRowProps = {
  status: ClaimStatus;
  children: React.ReactNode;
  source?: React.ReactNode;
  adversarial?: boolean;
  className?: string;
};

export function ClaimRow({ status, children, source, adversarial, className }: ClaimRowProps) {
  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <StatusDot status={status} className="mt-1.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start gap-2">
          <p className="font-sans text-[15px] leading-snug text-foreground">{children}</p>
          {adversarial ? (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-sans text-xs font-semibold text-destructive"
              title="Flagged in adversarial review"
            >
              <AlertTriangleIcon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              Adversarial
            </span>
          ) : null}
        </div>
        {source ? <div className="text-sm">{source}</div> : null}
      </div>
    </div>
  );
}
