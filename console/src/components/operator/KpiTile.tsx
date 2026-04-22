import * as React from "react";

import { cn } from "@/lib/utils";

import { MetaLabel } from "./MetaLabel";

export type KpiTileProps = {
  value: string;
  label: string;
  className?: string;
};

export function KpiTile({ value, label, className }: KpiTileProps) {
  return (
    <div className={cn(className)}>
      <p className="font-sans text-3xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
      <MetaLabel className="mt-2 block">{label}</MetaLabel>
    </div>
  );
}
