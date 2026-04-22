"use client";

import { UserButton } from "@clerk/nextjs";
import { Clock, Search } from "lucide-react";
import type { ReactNode } from "react";

import { AlertsBell } from "@/components/operator/alerts/AlertsBell";

type Props = {
  /** Extra actions to the left of the user menu (e.g. Phase B notifications). */
  trailing?: ReactNode;
  /** Opens the global ⌘K search palette (Phase B.10). */
  onOpenSearch?: () => void;
};

/** Kit-aligned top bar: search-first, tonal “glass”, actions — hero headline lives in page content. */
export function OperatorTopBar({ trailing, onOpenSearch }: Props) {
  return (
    <header
      className="sb-topbar-glass sticky top-0 z-[var(--z-header)] flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-[rgba(0,15,34,0.06)] px-6 py-2.5 shadow-[var(--shadow-sm)]"
    >
      {onOpenSearch ? (
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-surface-1 px-3.5 py-2 text-left transition-colors hover:bg-[rgba(0,15,34,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 md:max-w-xl md:min-w-[360px]"
          aria-label="Open search"
        >
          <Search className="size-4 shrink-0 text-[var(--fg-4)]" strokeWidth={1.5} aria-hidden />
          <span className="min-w-0 flex-1 font-sans text-[11px] font-bold tracking-[0.22em] text-[var(--fg-4)] uppercase">
            Search dossiers, filings, districts…
          </span>
          <kbd className="hidden shrink-0 rounded border border-[rgba(0,15,34,0.12)] bg-surface px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-3)] md:inline">
            ⌘K
          </kbd>
        </button>
      ) : (
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-surface-1 px-3.5 py-2 md:max-w-xl md:min-w-[360px]">
          <Search className="size-4 shrink-0 text-[var(--fg-4)]" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            name="q"
            placeholder="Search dossiers, filings, districts…"
            className="min-w-0 flex-1 bg-transparent font-sans text-[11px] font-bold tracking-[0.22em] text-[var(--fg-1)] uppercase outline-none placeholder:text-[var(--fg-4)]"
            autoComplete="off"
            disabled
            title="Search not wired in this shell"
          />
        </label>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <AlertsBell />
        <button
          type="button"
          className="rounded-[var(--radius-md)] p-2.5 text-[var(--fg-1)] transition-colors hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
          aria-label="Audit log"
          disabled
          title="Phase B"
        >
          <Clock className="size-[18px]" strokeWidth={1.5} />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
