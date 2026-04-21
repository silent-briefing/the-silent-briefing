"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Clock, Search } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  /** Extra actions to the left of the user menu (e.g. Phase B notifications). */
  trailing?: ReactNode;
};

/** Kit-aligned top bar: search-first, tonal “glass”, actions — hero headline lives in page content. */
export function OperatorTopBar({ trailing }: Props) {
  return (
    <header
      className="sb-topbar-glass sticky top-0 z-[var(--z-header)] flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-[rgba(0,15,34,0.06)] px-6 py-2.5 shadow-[var(--shadow-sm)]"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] bg-surface-1 px-3.5 py-2 md:max-w-xl md:min-w-[360px]">
        <Search className="size-4 shrink-0 text-[var(--fg-4)]" strokeWidth={1.5} aria-hidden />
        <input
          type="search"
          name="q"
          placeholder="Search dossiers, filings, districts…"
          className="min-w-0 flex-1 bg-transparent font-sans text-[11px] font-bold tracking-[0.22em] text-[var(--fg-1)] uppercase outline-none placeholder:text-[var(--fg-4)]"
          autoComplete="off"
          disabled
          title="Search ships in Phase B"
        />
      </label>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <button
          type="button"
          className="rounded-[var(--radius-md)] p-2.5 text-[var(--fg-1)] transition-colors hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
          aria-label="Notifications"
          disabled
          title="Phase B"
        >
          <Bell className="size-[18px]" strokeWidth={1.5} />
        </button>
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
