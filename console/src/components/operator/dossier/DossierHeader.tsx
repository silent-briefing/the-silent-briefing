import * as React from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";

import type { OfficialCardRow } from "@/lib/queries/schemas";
import { cn } from "@/lib/utils";

import { MetaLabel } from "../MetaLabel";
import { Portrait } from "../Portrait";
import { RetentionCountdown } from "../judicial/RetentionCountdown";

export type DossierHeaderProps = {
  official: OfficialCardRow;
  jurisdictionName: string;
  /** e.g. `{ href: "/judicial/supreme-court", label: "Supreme Court" }` */
  parentNav: { href: string; label: string };
  className?: string;
};

export function DossierHeader({ official, jurisdictionName, parentNav, className }: DossierHeaderProps) {
  return (
    <header
      className={cn(
        "relative -mx-8 px-8 py-10 text-[var(--on-primary)] md:-mx-14 md:px-14 md:py-12",
        className,
      )}
      style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
      }}
    >
      <nav className="font-sans text-[11px] text-[var(--fg-inv-3)]">
        <Link href={parentNav.href} className="hover:text-[var(--fg-inv-1)]">
          {parentNav.label}
        </Link>
        <span className="mx-2 opacity-60">·</span>
        <span className="text-[var(--fg-inv-2)]">{jurisdictionName}</span>
      </nav>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <Portrait
          src={official.photo_url}
          alt=""
          name={official.full_name}
          size={112}
          className="ring-2 ring-[rgba(212,175,55,0.35)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-normal leading-[1.1] tracking-[-0.02em] md:text-[44px]">
              {official.full_name}
            </h1>
            <button
              type="button"
              disabled
              title="Export ships in a later tranche"
              className="inline-flex items-center gap-2 rounded-md border border-[rgba(212,175,55,0.35)] px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary opacity-60"
            >
              <Share2 className="size-4" strokeWidth={1.5} aria-hidden />
              Share
            </button>
          </div>
          <p className="mt-2 font-sans text-sm capitalize text-[var(--fg-inv-2)]">
            {official.office_type.replace(/_/g, " ")}
          </p>
          <RetentionCountdown inverse retentionYear={official.retention_year} className="mt-3" />
          {official.subject_alignment ? (
            <MetaLabel className="mt-4 inline-block text-[var(--fg-inv-2)]">{official.subject_alignment}</MetaLabel>
          ) : null}
        </div>
      </div>
    </header>
  );
}
