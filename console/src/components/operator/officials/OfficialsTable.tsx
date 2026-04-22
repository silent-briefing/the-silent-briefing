"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import * as React from "react";

import type { OfficialCardRow } from "@/lib/queries/schemas";
import { cn } from "@/lib/utils";

export type OfficialsTableProps = {
  rows: OfficialCardRow[];
  jurisdictionLabels: Map<string, string>;
  className?: string;
};

export function OfficialsTable({ rows, jurisdictionLabels, className }: OfficialsTableProps) {
  const router = useRouter();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer state is managed by TanStack
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-surface-1 px-4 py-8 text-center font-sans text-sm text-[var(--fg-3)] shadow-[var(--shadow-sm)]">
        No officials match these filters.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] bg-surface-1 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="grid grid-cols-12 gap-2 border-b border-[rgba(212,175,55,0.15)] px-4 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
        <div className="col-span-4">Name</div>
        <div className="col-span-3">Jurisdiction</div>
        <div className="col-span-2">Office</div>
        <div className="col-span-1">Party</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      <div ref={parentRef} className="h-[min(560px,65vh)] overflow-auto" role="grid" aria-rowcount={rows.length}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const o = rows[vi.index]!;
            const jur = jurisdictionLabels.get(o.jurisdiction_id) ?? "—";
            return (
              <div
                key={o.id}
                role="row"
                tabIndex={0}
                className={cn(
                  "absolute left-0 right-0 grid cursor-pointer grid-cols-12 gap-2 border-b border-[rgba(0,15,34,0.06)] px-4 py-3 font-sans text-sm text-[var(--fg-2)] outline-none transition-colors",
                  "hover:bg-[rgba(212,175,55,0.06)] hover:shadow-[inset_3px_0_0_var(--tertiary)]",
                  "focus-visible:bg-[rgba(212,175,55,0.08)] focus-visible:shadow-[inset_3px_0_0_var(--tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--tertiary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-1)]",
                )}
                style={{ transform: `translateY(${vi.start}px)` }}
                onClick={() => router.push(`/officials/${o.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/officials/${o.slug}`);
                  }
                }}
              >
                <div className="col-span-4 font-serif text-[var(--fg-1)]">{o.full_name}</div>
                <div className="col-span-3 truncate text-[var(--fg-3)]">{jur}</div>
                <div className="col-span-2 truncate text-[var(--fg-3)]">{o.office_type.replaceAll("_", " ")}</div>
                <div className="col-span-1 truncate text-[var(--fg-3)]">{o.party ?? "—"}</div>
                <div className="col-span-2 text-right text-[var(--fg-3)]">
                  {o.is_current ? "Current" : "Former"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
