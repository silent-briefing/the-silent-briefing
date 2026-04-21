import type { ReactNode } from "react";

type Props = {
  title: string;
  /** When set, shows gold UPPERCASE tracked badge (admin shell). */
  badge?: "ADMIN";
  trailing?: ReactNode;
};

/** Admin chrome: tracked badge + sans title (serif hero stays on individual pages). */
export function AdminTopBar({ title, badge, trailing }: Props) {
  return (
    <header className="sb-topbar-glass flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[rgba(0,15,34,0.06)] px-6 py-2 shadow-[var(--shadow-sm)]">
      <div className="flex min-w-0 items-baseline gap-4">
        {badge ? (
          <span className="font-sans text-[11px] font-bold tracking-[0.2em] text-tertiary uppercase">
            {badge}
          </span>
        ) : null}
        <h1 className="truncate font-sans text-lg font-semibold tracking-tight text-[var(--fg-1)] md:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">{trailing}</div>
    </header>
  );
}
